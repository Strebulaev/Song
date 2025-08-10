import { Note } from './song.model';

export interface NoteTrackComponentInterface {
  startPlayback(): void;
  checkUserNote(note: string): void;
  readonly activeNotes: Note[]; // Делаем явно read-only
  getCurrentTime(): number; // Добавляем новый метод
}