import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService, PitchDetectionResult } from '../services/audio.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

interface SongNote {
  time: number;
  note: string;
  duration: number;
}

interface SongData {
  title: string;
  notes: string[];
  bpm?: number;
  key?: string;
}

@Component({
  selector: 'app-practice',
  templateUrl: './practice.component.html',
  styleUrls: ['./practice.component.scss'],
  imports: [CommonModule]
})
export class PracticeComponent implements OnInit, OnDestroy {
  currentSongNotes: SongNote[] = [];
  currentNoteIndex = 0;
  userPitch: PitchDetectionResult | null = null;
  accuracy = 0;
  isRecording = false;
  songData: SongData | null = null;

  private pitchSubscription!: Subscription;

  constructor(
    private audioService: AudioService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.songData = history.state.songData;
    if (this.songData?.notes) {
      this.currentSongNotes = this.songData.notes.map((note: string, index: number) => ({
        note,
        time: index * 0.5,
        duration: 0.5
      }));
    }
  }

  toggleRecording(): void {
    this.isRecording = !this.isRecording;

    if (this.isRecording) {
      this.startPitchDetection();
    } else {
      this.stopPitchDetection();
    }
  }

  private startPitchDetection(): void {
    this.pitchSubscription = this.audioService.pitchDetection$.subscribe(
      (result: PitchDetectionResult) => {
        this.userPitch = result;
        this.checkAccuracy();
      },
      (error) => {
        console.error('Pitch detection error:', error);
        this.isRecording = false;
      }
    );

    this.audioService.startPitchDetection().catch(error => {
      console.error('Error starting pitch detection:', error);
      this.isRecording = false;
    });
  }

  private stopPitchDetection(): void {
    this.pitchSubscription?.unsubscribe();
    this.audioService.stopPitchDetection();
    this.userPitch = null;
  }

  private checkAccuracy(): void {
    if (!this.userPitch?.note || !this.currentSongNotes[this.currentNoteIndex]) return;

    const currentTargetNote = this.currentSongNotes[this.currentNoteIndex].note;
    
    if (this.userPitch.note === currentTargetNote) {
      this.accuracy = 100 - Math.min(100, Math.abs(this.userPitch.cents) / 2);
      this.currentNoteIndex = (this.currentNoteIndex + 1) % this.currentSongNotes.length;
    } else {
      this.accuracy = 0;
    }
  }

  ngOnDestroy(): void {
    this.stopPitchDetection();
  }
}