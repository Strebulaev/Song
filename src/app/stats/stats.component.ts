import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface PracticeSession {
  songId: string;
  date: string;
  accuracy: number;
  songTitle?: string;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  imports: [CommonModule]
})
export class StatsComponent {
  sessions: PracticeSession[] = [];
  averageAccuracy = 0;

  constructor() {
    this.loadSessions();
  }

  private loadSessions(): void {
    const sessionsData = localStorage.getItem('practiceSessions');
    const songsData = localStorage.getItem('songs');
    
    const sessions: PracticeSession[] = sessionsData ? JSON.parse(sessionsData) : [];
    const songs: any[] = songsData ? JSON.parse(songsData) : [];

    this.sessions = sessions.map(session => {
      const song = songs.find(s => s.id === session.songId);
      return {
        ...session,
        date: new Date(session.date).toLocaleDateString(),
        songTitle: song?.title || 'Unknown Song'
      };
    }).slice(0, 10);

    this.calculateAverage();
  }

  private calculateAverage(): void {
    if (this.sessions.length === 0) {
      this.averageAccuracy = 0;
      return;
    }

    const sum = this.sessions.reduce((acc, session) => acc + session.accuracy, 0);
    this.averageAccuracy = Math.round(sum / this.sessions.length);
  }
}