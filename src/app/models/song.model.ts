export interface Note {
  pitch: string;
  time: number;
  duration: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  notes: Note[];
  audioBuffer?: AudioBuffer;
}