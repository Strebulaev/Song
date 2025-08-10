import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Note } from '../models/song.model';

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
  notes: Note[];
  title: string;
}

export interface PitchDetectionResult {
  note: string;
  cents: number;
  frequency: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private pitchDetectionSubject = new Subject<PitchDetectionResult>();
  private isRecording = false;
  private audioBufferSource: AudioBufferSourceNode | null = null;
  private audioContext: AudioContext;

  constructor() {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  async initializeWorklet(): Promise<void> {
    try {
        // Путь должен соответствовать месту, куда копируется файл при сборке
        const workletUrl = 'assets/pitch-processor.worklet.js';
        
        // Альтернативный вариант для dev-сервера
        // const workletUrl = '/assets/pitch-processor.worklet.js';
        
        await this.audioContext.audioWorklet.addModule(workletUrl);
    } catch (error) {
        console.error('Error loading worklet:', error);
        throw error;
    }
  }
  async startPitchDetection(): Promise<void> {
    if (this.isRecording) return;
    
    try {
      await this.initializeWorklet();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-processor');
      this.sourceNode.connect(this.workletNode);
      
      this.workletNode.port.onmessage = (event) => {
        this.pitchDetectionSubject.next(event.data);
      };

      this.isRecording = true;
    } catch (error) {
      console.error('Error starting pitch detection:', error);
      throw error;
    }
  }

  async playSong(buffer: AudioBuffer): Promise<void> {
    this.stopPlayback();
    
    this.audioBufferSource = this.audioContext.createBufferSource();
    this.audioBufferSource.buffer = buffer;
    this.audioBufferSource.connect(this.audioContext.destination);
    this.audioBufferSource.start();
  }

  stopPlayback(): void {
    if (this.audioBufferSource) {
      this.audioBufferSource.stop();
      this.audioBufferSource = null;
    }
  }

  stopPitchDetection(): void {
    if (!this.isRecording) return;
    
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    
    this.workletNode = null;
    this.sourceNode = null;
    this.stream = null;
    this.isRecording = false;
  }

  async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return this.decodeAudioData(arrayBuffer);
  }

    async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
      if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  async analyzeAudioBuffer(buffer: AudioBuffer, fileName: string): Promise<AudioAnalysisResult> {
    const bpm = await this.detectBPM(buffer);
    const notes = await this.detectNotes(buffer);
    const key = this.detectKey(notes);

    return {
      bpm: Math.round(bpm),
      key,
      notes,
      title: fileName.replace(/\.[^/.]+$/, "")
    };
  }

  private async detectBPM(buffer: AudioBuffer): Promise<number> {
    const data = buffer.getChannelData(0);
    const peaks = this.findPeaks(data);
    return peaks.length > 10 ? Math.round(60 / this.averageInterval(peaks, buffer.sampleRate)) : 120;
  }

  private findPeaks(data: Float32Array, threshold = 0.3): number[] {
    const peaks = [];
    let lastVal = data[0];
    let ascending = true;

    for (let i = 1; i < data.length; i++) {
      if (ascending) {
        if (data[i] < lastVal) {
          if (lastVal >= threshold) {
            peaks.push(i - 1);
          }
          ascending = false;
        }
      } else {
        if (data[i] > lastVal) {
          ascending = true;
        }
      }
      lastVal = data[i];
    }
    return peaks;
  }

  private averageInterval(peaks: number[], sampleRate: number): number {
    if (peaks.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < peaks.length; i++) {
      sum += peaks[i] - peaks[i - 1];
    }
    return sum / (peaks.length - 1) / sampleRate;
  }

  private async detectNotes(buffer: AudioBuffer): Promise<Note[]> {
    const notes: Note[] = [];
    const frameSize = 4096;
    const frameTime = frameSize / buffer.sampleRate;
    
    for (let i = 0; i < buffer.length; i += frameSize) {
      const segment = buffer.getChannelData(0).slice(i, i + frameSize);
      const frequency = this.getDominantFrequency(segment, buffer.sampleRate);
      if (frequency > 0) {
        const result = this.frequencyToNote(frequency);
        notes.push({
          pitch: result.note,
          time: i / buffer.sampleRate,
          duration: frameTime
        });
      }
    }

    return this.mergeSimilarNotes(notes);
  }

  private mergeSimilarNotes(notes: Note[]): Note[] {
    const merged: Note[] = [];
    const threshold = 0.05; // 50ms threshold for merging
    
    for (let i = 0; i < notes.length; i++) {
      if (i > 0 && 
          notes[i].pitch === notes[i-1].pitch && 
          (notes[i].time - (merged[merged.length-1].time + merged[merged.length-1].duration)) < threshold) {
        merged[merged.length-1].duration += notes[i].duration;
      } else {
        merged.push({...notes[i]});
      }
    }
    
    return merged;
  }

  private getDominantFrequency(buf: Float32Array, sampleRate: number): number {
    const SIZE = buf.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let lastCorrelation = 1;
    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;

      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buf[i] - buf[i + offset]);
      }
      correlation = 1 - (correlation / MAX_SAMPLES);
      if (correlation > 0.9 && correlation > lastCorrelation) {
        foundGoodCorrelation = true;
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      } else if (foundGoodCorrelation) {
        const shift = (bestCorrelation - correlation) / correlation;
        return sampleRate / (bestOffset + 8 * shift);
      }
      lastCorrelation = correlation;
    }
    if (bestCorrelation > 0.01) {
      return sampleRate / bestOffset;
    }
    return -1;
  }
  private audioBuffers = new Map<string, AudioBuffer>();

  storeAudioBuffer(id: string, buffer: AudioBuffer): void {
      this.audioBuffers.set(id, buffer);
  }
  
  getStoredAudioBuffer(id: string): AudioBuffer | undefined {
      return this.audioBuffers.get(id);
  }
  
  clearStoredAudioBuffer(id: string): void {
      this.audioBuffers.delete(id);
  }
  private frequencyToNote(freq: number): { note: string; cents: number } {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const halfSteps = Math.round(12 * Math.log2(freq / C0));
    const octave = Math.floor(halfSteps / 12);
    const noteIndex = halfSteps % 12;
    const note = noteNames[noteIndex] + octave;

    const expectedFreq = C0 * Math.pow(2, halfSteps / 12);
    const cents = Math.floor(1200 * Math.log2(freq / expectedFreq));

    return { note, cents };
  }

  private detectKey(notes: Note[]): string {
    const noteCounts: Record<string, number> = {};
    notes.forEach(note => {
      const baseNote = note.pitch.replace(/[0-9]/g, '');
      noteCounts[baseNote] = (noteCounts[baseNote] || 0) + 1;
    });

    const sortedNotes = Object.entries(noteCounts).sort((a, b) => b[1] - a[1]);
    return sortedNotes.length > 0 ? `${sortedNotes[0][0]} Major` : 'C Major';
  }

  get pitchDetection$() {
    return this.pitchDetectionSubject.asObservable();
  }
}