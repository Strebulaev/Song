import { Component } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-music-analyzer',
  templateUrl: './music-analyzer.component.html',
  styleUrls: ['./music-analyzer.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MusicAnalyzerComponent {
  selectedFile: File | null = null;
  isAnalyzing = false;
  errorMessage: string | null = null;
  notesList: {name: string, time: string, duration: string}[] = [];
  
  // Русские названия нот
  private readonly NOTE_NAMES = ['до', 'до#', 'ре', 'ре#', 'ми', 'фа', 'фа#', 'соль', 'соль#', 'ля', 'ля#', 'си'];
  private readonly NOTE_NAMES_FLAT = ['до', 'реб', 'ре', 'миб', 'ми', 'фа', 'сольб', 'соль', 'ляб', 'ля', 'сиб', 'си'];

  constructor(private audioService: AudioService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.errorMessage = null;
      this.notesList = [];
    }
  }

  async analyzeMusic(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Пожалуйста, выберите файл';
      return;
    }

    this.isAnalyzing = true;
    this.errorMessage = null;

    try {
      const buffer = await this.audioService.decodeAudioFile(this.selectedFile);
      const analysis = await this.audioService.analyzeAudioBuffer(buffer, this.selectedFile.name);
      
      // Конвертируем ноты в русский формат
      this.notesList = analysis.notes.map(note => ({
        name: this.getRussianNoteName(note.pitch),
        time: note.time.toFixed(2) + ' сек',
        duration: note.duration.toFixed(2) + ' сек'
      }));

    } catch (error) {
      console.error('Ошибка анализа:', error);
      this.errorMessage = 'Ошибка при анализе файла';
    } finally {
      this.isAnalyzing = false;
    }
  }

  private getRussianNoteName(note: string): string {
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
}