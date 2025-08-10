import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Session {
  date: string;
  songTitle: string;
  accuracy: number;
}

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  imports: [CommonModule]
})
export class StatsComponent {
  sessions: Session[] = [
    { date: '2023-10-01', songTitle: 'Imagine', accuracy: 78 },
    { date: '2023-10-02', songTitle: 'Bohemian Rhapsody', accuracy: 65 },
    { date: '2023-10-03', songTitle: 'Yesterday', accuracy: 82 },
  ];

  averageAccuracy = this.calculateAverage();

  calculateAverage(): number {
    const sum = this.sessions.reduce((acc, session) => acc + session.accuracy, 0);
    return Math.round(sum / this.sessions.length);
  }
}