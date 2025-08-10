import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService, AudioAnalysisResult } from '../services/audio.service';
import { CommonModule } from '@angular/common';

interface UploadAnalysisResult extends AudioAnalysisResult {
  title: string;
}

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  imports: [CommonModule]
})
export class UploadComponent {
  selectedFile: File | null = null;
  isAnalyzing = false;
  analysisResult: UploadAnalysisResult | null = null;
  errorMessage: string | null = null;

  constructor(
    private audioService: AudioService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage = null;
    }
  }

  async analyzeSong(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Пожалуйста, выберите файл';
      return;
    }

    this.isAnalyzing = true;
    this.errorMessage = null;

    try {
      const buffer = await this.audioService.decodeAudioFile(this.selectedFile);
      const analysisResult = await this.audioService.analyzeAudioBuffer(buffer);
      
      this.analysisResult = {
        ...analysisResult,
        title: this.selectedFile.name.replace(/\.[^/.]+$/, "")
      };
    } catch (error) {
      console.error('Analysis error:', error);
      this.errorMessage = 'Ошибка при анализе файла. Пожалуйста, попробуйте другой файл.';
    } finally {
      this.isAnalyzing = false;
    }
  }

  startPractice(): void {
    if (this.analysisResult) {
      this.router.navigate(['/practice'], { 
        state: { 
          songData: {
            title: this.analysisResult.title,
            notes: this.analysisResult.notes,
            bpm: this.analysisResult.bpm,
            key: this.analysisResult.key
          }
        }
      });
    }
  }
}