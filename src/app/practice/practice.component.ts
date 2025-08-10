import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AudioService, PitchDetectionResult } from '../services/audio.service';
import { Song } from '../models/song.model';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NoteTrackComponent } from '../note-track/note-track.component';

interface PracticeSession {
  songId: string;
  date: Date;
  accuracy: number;
  score: number;
  maxCombo: number;
}

@Component({
  selector: 'app-practice',
  templateUrl: './practice.component.html',
  styleUrls: ['./practice.component.scss'],
  imports: [CommonModule, NoteTrackComponent]
})
export class PracticeComponent implements OnInit, OnDestroy {
  @ViewChild(NoteTrackComponent) noteTrack!: NoteTrackComponent;

  songData: Song | null = null;
  userPitch: PitchDetectionResult | null = null;
  isRecording = false;
  isPlaying = false;
  
  // Русские названия нот
  NOTE_NAMES = ['до', 'до#', 'ре', 'ре#', 'ми', 'фа', 'фа#', 'соль', 'соль#', 'ля', 'ля#', 'си'];
  NOTE_NAMES_FLAT = ['до', 'реб', 'ре', 'миб', 'ми', 'фа', 'сольб', 'соль', 'ляб', 'ля', 'сиб', 'си'];
  
  score = 0;
  combo = 0;
  maxCombo = 0;
  accuracy = 0;
  totalNotes = 0;
  hits = 0;
  currentTargetNote: string | null = null;
  private audioContext: AudioContext;
  private pitchSubscription!: Subscription;
  private updateInterval: any;
  audioBuffer: AudioBuffer | undefined;

  constructor(private audioService: AudioService) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  ngOnInit(): void {
    const historyState = history.state;
    if (historyState?.songData) {
      this.songData = historyState.songData;
      this.totalNotes = this.songData?.notes?.length ?? 0;
      
      // Исправление для загрузки аудио из blob URL
      if (historyState.songData.audioUrl) {
        if (historyState.songData.audioUrl.startsWith('blob:')) {
          this.audioBuffer = this.audioService.getStoredAudioBuffer(historyState.songData.id);
        } else {
          this.loadAudioBuffer(historyState.songData.audioUrl);
        }
      }
    }
  }

  async startPractice() {
    if (!this.songData || !this.audioBuffer) {
      console.error('Audio buffer not loaded');
      return;
    }

    try {
      this.isPlaying = true;
      this.resetStats();
      
      await this.audioService.playSong(this.audioBuffer);
      
      // Обновление целевой ноты по таймеру
      this.updateInterval = setInterval(() => {
        this.updateTargetNote();
      }, 50); // Обновление каждые 50мс

      // Запуск нотной дорожки
      setTimeout(() => {
        if (this.noteTrack) {
          this.noteTrack.startPlayback();
        }
      }, 100);

      // Обработка ввода с микрофона
      await this.audioService.startPitchDetection();
      this.pitchSubscription = this.audioService.pitchDetection$.subscribe(
        pitch => {
          this.userPitch = pitch;
          this.checkUserPitch();
        }
      );

      this.isRecording = true;
    } catch (error) {
      console.error('Error starting practice:', error);
      this.stopPractice();
    }
  }
  stopPractice() {
    this.isPlaying = false;
    this.isRecording = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.audioService.stopPitchDetection();
    this.audioService.stopPlayback();
    
    if (this.pitchSubscription) {
      this.pitchSubscription.unsubscribe();
    }
  }
  private async loadAudioBuffer(audioUrl: string): Promise<void> {
    try {
      let arrayBuffer: ArrayBuffer;
      
      if (audioUrl.startsWith('blob:')) {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('Failed to fetch blob');
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Обработка других URL
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
      }

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Received empty array buffer');
      }

      this.audioBuffer = await this.audioService.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error loading audio:', error);
      this.audioBuffer = undefined;
    }
  }
  handleNoteHit(event: { note: string, accuracy: number }) {
    if (event.accuracy === -1) {
        // Пропущена нота
        this.combo = 0;
        this.score = Math.max(0, this.score - 5);
        console.log(`Missed note: ${event.note}`);
    } else {
        // Попадание в ноту
        this.hits++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 10 + (this.combo * 2);
        this.accuracy = Math.round((this.hits / this.totalNotes) * 100);
        console.log(`Hit note: ${event.note} with accuracy ${event.accuracy}%`);
    }
  }
  private checkUserPitch() {
    if (!this.userPitch || !this.songData || !this.noteTrack) return;
    
    this.noteTrack.checkUserNote(this.userPitch.note);
    
    const activeNotes = this.noteTrack.activeNotes; // Теперь только чтение
    this.currentTargetNote = activeNotes.length > 0 ? activeNotes[0].pitch : null;
  }
  
  isNoteCorrect(): boolean {
    return !!this.userPitch && !!this.currentTargetNote && 
           this.userPitch.note === this.currentTargetNote;
  }
  private resetStats() {
    this.score = 100;
    this.combo = 0;
    this.maxCombo = 0;
    this.accuracy = 0;
    this.hits = 0;
  }
  private getNoteName(note: string): string {
    const match = note.match(/^([A-Ga-g])([#b]?)(\d+)$/);
    if (!match) return note;
    
    const [, letter, accidental, octave] = match;
    const index = 'CDEFGABCDEFGAB'.indexOf(letter.toUpperCase());
    
    let noteName;
    if (accidental === 'b') {
      noteName = this.NOTE_NAMES_FLAT[index];
    } else {
      noteName = this.NOTE_NAMES[index];
    }
    
    return `${noteName} ${octave} октавы`;
  }

  private updateTargetNote() {
    if (!this.songData || !this.noteTrack) return;
    
    const currentTime = this.noteTrack.getCurrentTime();
    const currentNote = this.songData.notes.find(note => 
      note.time <= currentTime && currentTime <= note.time + note.duration
    );
    
    this.currentTargetNote = currentNote ? this.getNoteName(currentNote.pitch) : null;
  }
  private saveSession() {
    if (!this.songData) return;

    const session: PracticeSession = {
      songId: this.songData.id,
      date: new Date(),
      accuracy: this.accuracy,
      score: this.score,
      maxCombo: this.maxCombo
    };

    const sessions = JSON.parse(localStorage.getItem('practiceSessions') || '[]');
    sessions.push(session);
    localStorage.setItem('practiceSessions', JSON.stringify(sessions));
  }

  ngOnDestroy() {
    this.stopPractice();
  }
}