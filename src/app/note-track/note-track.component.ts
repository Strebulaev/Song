import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Note } from '../models/song.model';

// Перенесем интерфейс прямо в файл компонента
interface NoteTrackInterface {
  startPlayback(): void;
  checkUserNote(note: string): void;
  readonly activeNotes: Note[];
  getCurrentTime(): number;
}

@Component({
  selector: 'app-note-track',
  templateUrl: './note-track.component.html',
  styleUrls: ['./note-track.component.scss']
})
export class NoteTrackComponent implements NoteTrackInterface, OnInit, OnDestroy {
  @Input() notes: Note[] = [];
  @Input() bpm = 120;
  @Output() noteHit = new EventEmitter<{ note: string, accuracy: number }>();
  
  animationState = 'start';
  totalDuration = 0;
  hitWindows: Map<string, boolean> = new Map();
  private timer: any;
  private startTime = 0;
  private currentTime = 0;
  private _activeNotes: Note[] = [];

  ngOnInit() {
    this.calculateTotalDuration();
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  ngOnDestroy() {
    this.stopPlayback();
  }

  get activeNotes(): Note[] {
    return [...this._activeNotes]; // Возвращаем копию массива для защиты от изменений
  }

  startPlayback(): void {
    this.stopPlayback();
    this._activeNotes = []; // Изменяем приватное свойство вместо публичного
    this.hitWindows.clear();
    this.animationState = 'start';
    this.startTime = Date.now();
    this.currentTime = 0;
    
    this.timer = setInterval(() => {
      this.currentTime = (Date.now() - this.startTime) / 1000;
      this.updateActiveNotes();
    }, 16);
    
    setTimeout(() => {
      this.animationState = 'end';
    }, 0);
  }

  stopPlayback() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private calculateTotalDuration() {
    if (this.notes.length === 0) {
      this.totalDuration = 0;
      return;
    }
    
    const lastNote = this.notes[this.notes.length - 1];
    this.totalDuration = lastNote.time + lastNote.duration;
  }

  private updateActiveNotes() {
    this._activeNotes = this.notes.filter(note => {
      const noteStart = note.time;
      const noteEnd = noteStart + note.duration;
      return this.currentTime >= noteStart && this.currentTime <= noteEnd;
    });

    this._activeNotes.forEach(note => {
      if (!this.hitWindows.has(note.pitch)) {
        this.hitWindows.set(note.pitch, false);
        
        setTimeout(() => {
          if (this.hitWindows.get(note.pitch) === false) {
            this.noteHit.emit({ note: note.pitch, accuracy: -1 });
            this.hitWindows.delete(note.pitch);
          }
        }, note.duration * 800);
      }
    });
  }

  checkUserNote(userNote: string): void {
    for (const note of this._activeNotes) { // Используем приватное свойство
      if (!this.hitWindows.get(note.pitch)) {
        if (userNote === note.pitch) {
          const noteTime = note.time;
          const hitTime = this.currentTime;
          const accuracy = this.calculateAccuracy(noteTime, hitTime);
          
          this.noteHit.emit({ note: note.pitch, accuracy });
          this.hitWindows.set(note.pitch, true);
          return;
        }
      }
    }
  }

  private calculateAccuracy(noteTime: number, hitTime: number): number {
    const diff = Math.abs(hitTime - noteTime);
    if (diff < 0.05) return 100;
    if (diff < 0.1) return 80;
    if (diff < 0.15) return 60;
    if (diff < 0.2) return 40;
    return 20;
  }
}