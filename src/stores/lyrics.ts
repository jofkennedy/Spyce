import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";

export interface LyricsResult { text: string; path: string; mtime: number; }
export const useLyricsStore = defineStore("lyrics", {
  state: () => ({ cache: {} as Record<string, LyricsResult | null>, pending: {} as Record<string, Promise<LyricsResult | null> | undefined>, token: 0 }),
  actions: {
    async getLyrics(trackPath: string): Promise<LyricsResult | null> {
      const currentToken = ++this.token;
      if (this.pending[trackPath]) return this.pending[trackPath]!;
      const request = invoke<LyricsResult | null>("get_lyrics", { path: trackPath }).then(result => {
        if (currentToken === this.token) this.cache[trackPath] = result;
        delete this.pending[trackPath]; return result;
      }).catch(() => { delete this.pending[trackPath]; return null; });
      this.pending[trackPath] = request; return request;
    },
    clear() { this.cache = {}; this.token++; }
  }
});
