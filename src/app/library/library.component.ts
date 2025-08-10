import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService, AudioAnalysisResult } from '../services/audio.service';
import { CommonModule } from '@angular/common';

interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  notes: string[]; // Просто массив строк
}

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  imports: [CommonModule]
})
export class LibraryComponent {
  songs: Song[] = [
    {
      id: '1',
      title: 'Пример песни 1',
      artist: 'Исполнитель',
      bpm: 120,
      key: 'C Major',
      notes: ['C4', 'D4', 'E4', 'F4', 'G4']
    },
    {
      id: '2',
      title: 'Пример песни 2',
      artist: 'Другой исполнитель',
      bpm: 90,
      key: 'G Major',
      notes: ['G4', 'A4', 'B4', 'C5', 'D5']
    }
  ];

  constructor(
    private router: Router,
    private audioService: AudioService
  ) {}

  startPractice(song: Song): void {
    this.router.navigate(['/practice'], { state: { songData: song } });
  }

  async analyzeAndAddSong(file: File): Promise<void> {
    try {
      const buffer = await this.audioService.decodeAudioFile(file);
      const analysisResult = await this.audioService.analyzeAudioBuffer(buffer);
      
      const newSong: Song = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Неизвестный исполнитель',
        bpm: analysisResult.bpm,
        key: analysisResult.key,
        notes: analysisResult.notes
      };

      this.songs = [...this.songs, newSong];
    } catch (error) {
      console.error('Error analyzing song:', error);
    }
  }
}