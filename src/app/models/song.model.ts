export interface Song {
    id: string;
    title: string;
    artist?: string;
    bpm?: number;
    key?: string;
    notes: {
      time: number;
      pitch: string;
      duration: number;
    }[];
    audioBuffer?: AudioBuffer;
  }