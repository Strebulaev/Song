import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface PitchDetectionResult {
  note: string;
  cents: number;
  frequency: number;
}

export interface AudioAnalysisResult {
  notes: string[]; // Просто массив строк с нотами
  bpm: number;
  key: string;
  audioBuffer?: AudioBuffer;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pitchDetectionSubject = new Subject<PitchDetectionResult>();
  private notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  private isRecording = false;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
  }

  get pitchDetection$() {
    return this.pitchDetectionSubject.asObservable();
  }

  async decodeAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error decoding audio file:', error);
      throw error;
    }
  }
  private async detectNotes(buffer: AudioBuffer): Promise<string[]> {
    const notes: string[] = [];
    const frameSize = 2048;
    const stepSize = Math.floor(frameSize / 4);
  
    for (let i = 0; i < buffer.length - frameSize; i += stepSize) {
      const slice = buffer.getChannelData(0).slice(i, i + frameSize);
      const frequency = this.getDominantFrequency(new Float32Array(slice));
      if (frequency > 0) {
        const noteInfo = this.frequencyToNote(frequency);
        notes.push(String(noteInfo.note)); // Явное преобразование в строку
      }
    }
  
    return notes;
  }
  private detectKey(notes: string[]): string {
    const noteCounts: Record<string, number> = {};
    
    notes.forEach(note => {
      // Добавляем проверку на тип и преобразование при необходимости
      const noteString = typeof note === 'string' ? note : String(note);
      const baseNote = noteString.replace(/\d+$/, '');
      noteCounts[baseNote] = (noteCounts[baseNote] || 0) + 1;
    });
  
    let maxCount = 0;
    let keyNote = 'C';
    
    for (const note in noteCounts) {
      if (noteCounts[note] > maxCount) {
        maxCount = noteCounts[note];
        keyNote = note;
      }
    }
  
    return keyNote + ' Major';
  }
  async analyzeAudioBuffer(buffer: AudioBuffer): Promise<AudioAnalysisResult> {
    const rawNotes = await this.detectNotes(buffer);
    
    // Фильтруем и преобразуем ноты в строки
    const notes = rawNotes
      .map(note => typeof note === 'string' ? note : String(note))
      .filter(note => note && note.length > 0);
  
    const bpm = this.detectBPM(buffer);
    const key = this.detectKey(notes);
  
    return {
      notes: [...new Set(notes)], // Уникальные ноты
      bpm,
      key,
      audioBuffer: buffer
    };
  }
  async startPitchDetection(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.scriptProcessor.onaudioprocess = () => {
        const frequencies = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(frequencies);
        const result = this.detectPitch(frequencies);
        this.pitchDetectionSubject.next(result);
      };

      this.isRecording = true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stopPitchDetection(): void {
    if (!this.isRecording) return;
    
    this.scriptProcessor?.disconnect();
    this.microphone?.disconnect();
    this.scriptProcessor = null;
    this.microphone = null;
    this.isRecording = false;
  }

  private detectPitch(frequencies: Float32Array): PitchDetectionResult {
    const frequency = this.getDominantFrequency(frequencies);
    if (frequency <= 0) {
      return { note: '', cents: 0, frequency: 0 };
    }

    const noteInfo = this.frequencyToNote(frequency);
    return {
      note: noteInfo.note,
      cents: noteInfo.cents,
      frequency
    };
  }

  private getDominantFrequency(frequencies: Float32Array): number {
    let maxIndex = 0;
    let maxValue = -Infinity;

    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] > maxValue && frequencies[i] > -90) {
        maxValue = frequencies[i];
        maxIndex = i;
      }
    }

    return maxIndex * this.audioContext.sampleRate / this.analyser.fftSize;
  }

  private frequencyToNote(frequency: number): { note: string; cents: number } {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    const noteNames = this.notes;

    if (frequency <= 0) return { note: '', cents: 0 };

    const halfSteps = Math.round(12 * Math.log2(frequency / C0));
    const octave = Math.floor(halfSteps / 12);
    const noteIndex = halfSteps % 12;
    const note = noteNames[noteIndex] + octave;

    // Calculate cents deviation
    const expectedFrequency = C0 * Math.pow(2, halfSteps / 12);
    const cents = Math.floor(1200 * Math.log2(frequency / expectedFrequency));

    return { note, cents };
  }

  private detectBPM(buffer: AudioBuffer): number {
    // Реализация простого BPM детектора
    const channelData = buffer.getChannelData(0);
    const threshold = 0.3;
    let lastPeak = 0;
    const peaks: number[] = [];

    for (let i = 1; i < channelData.length - 1; i++) {
      if (channelData[i] > threshold && 
          channelData[i] > channelData[i - 1] && 
          channelData[i] > channelData[i + 1]) {
        if (i - lastPeak > 1000) { // Минимальный интервал между пиками
          peaks.push(i);
          lastPeak = i;
        }
      }
    }

    if (peaks.length < 2) return 120; // Значение по умолчанию

    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round((60 * buffer.sampleRate) / averageInterval);
  }
}