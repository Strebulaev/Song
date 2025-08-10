import { Injectable } from '@angular/core';
import { Song } from '../models/song.model';

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private songs: Song[] = [];

  addSong(song: Song) {
    this.songs.push(song);
  }

  getSongs(): Song[] {
    return this.songs;
  }
}