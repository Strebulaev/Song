import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
  imports: [CommonModule]
})
export class UploadComponent {
  selectedFile: File | null = null;
  isAnalyzing = false;
  analysisResult: any = null;
  errorMessage: string | null = null;
  audioBuffer: AudioBuffer | null = null;

  constructor(
    private audioService: AudioService,
    private router: Router
  ) {}

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage = null;
      this.analysisResult = null;
    }
  }

  async analyzeSong() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }

    this.isAnalyzing = true;
    this.errorMessage = null;

    if (!this.selectedFile) {
      throw new Error('No file selected');
  }
  
  try {
      const buffer = await this.audioService.decodeAudioFile(this.selectedFile);
      if (!buffer) {
          throw new Error('Failed to decode audio file');
      }
      this.audioBuffer = buffer;
      this.analysisResult = await this.audioService.analyzeAudioBuffer(buffer, this.selectedFile.name);
  } catch (error) {
      console.error('Error processing audio file:', error);
      this.audioBuffer = null;
      this.analysisResult = null;
      throw error; // или обработка ошибки по-другому
  } finally {
      this.isAnalyzing = false;
    }
  }

  private audioStorage: {[key: string]: AudioBuffer} = {};

  startPractice(): void {
    // Проверяем, что анализ завершен и аудио буфер доступен
    if (this.analysisResult && this.audioBuffer && this.selectedFile) {
        // Создаем уникальный ID для песни
        const songId = Date.now().toString();
        
        // Сохраняем аудио буфер в сервисе
        this.audioService.storeAudioBuffer(songId, this.audioBuffer);
        
        // Формируем полные данные песни для передачи на страницу практики
        const songData = {
            id: songId,
            title: this.analysisResult.title,
            artist: this.analysisResult.artist || 'Неизвестный исполнитель',
            bpm: this.analysisResult.bpm,
            key: this.analysisResult.key,
            notes: this.analysisResult.notes,
            audioUrl: URL.createObjectURL(this.selectedFile) // Создаем временную ссылку на файл
        };
        
        // Переходим на страницу практики с передачей данных
        this.router.navigate(['/practice'], { 
            state: { songData }
        });
    } else {
        console.error('Не удалось начать практику: отсутствуют данные анализа или аудио файл');
    }
  }
}