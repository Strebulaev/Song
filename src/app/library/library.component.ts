import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { CommonModule } from '@angular/common';
import { Song, Note } from '../models/song.model';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  imports: [CommonModule]
})
export class LibraryComponent {
  songs: Song[] = [];

  constructor(
    private router: Router,
    private audioService: AudioService
  ) {
    this.loadSongs();
  }

  private loadSongs(): void {
    const savedSongs = localStorage.getItem('songs');
    this.songs = savedSongs ? JSON.parse(savedSongs) : [];
  }

  startPractice(song: Song): void {
    this.router.navigate(['/practice'], { state: { songData: song } });
  }

  async analyzeAndAddSong(file: File): Promise<void> {
    try {
      const buffer = await this.audioService.decodeAudioFile(file).catch(error => {
        console.error('Error decoding audio file:', error);
        throw error; // или return null; в зависимости от логики приложения
      });
      const analysisResult = await this.audioService.analyzeAudioBuffer(buffer, file.name);
      
      const newSong: Song = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        bpm: analysisResult.bpm,
        key: analysisResult.key,
        notes: analysisResult.notes // Теперь notes правильно типизированы как Note[]
      };

      this.songs = [...this.songs, newSong];
      localStorage.setItem('songs', JSON.stringify(this.songs));
    } catch (error) {
      console.error('Error analyzing song:', error);
    }
  }
}