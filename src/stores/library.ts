import { defineStore } from "pinia";

export interface Track {
  path: string;
  title: string;
  artist: string;
  album: string;
  duration_secs: number;
  cover_art_b64: string | null;
  added_at?: number;
  id?: string;
}

export const useLibraryStore = defineStore("library", {
  state: () => ({ tracks: [] as Track[], folder: "", sortKey: (localStorage.getItem("spyce-sort-key") as "none" | "title" | "artist" | "added") || "title", sortDir: (localStorage.getItem("spyce-sort-dir") as "asc" | "desc") || "asc" }),
  getters: {
    coverOf: (state) => (path: string) => {
      const track = state.tracks.find(t => t.path === path);
      return track?.cover_art_b64 ? `data:image/jpeg;base64,${track.cover_art_b64}` : undefined;
    },
  },
});
