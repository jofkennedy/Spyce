import { defineStore } from "pinia";
import { Store } from "@tauri-apps/plugin-store";

export interface Playlist {
  id: string;
  name: string;
  trackPaths: string[];
  createdAt: number;
  updatedAt: number;
}

export const usePlaylistStore = defineStore("playlists", {
  state: () => ({ playlists: [] as Playlist[], storeLoaded: false }),
  getters: {
    hasTrack: (s) => (id: string, path: string) => s.playlists.find(p => p.id === id)?.trackPaths.includes(path) ?? false,
    nameExists: (s) => (name: string) => s.playlists.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase()),
  },
  actions: {
    async initStore() {
      if (this.storeLoaded) return;
      let value: Playlist[] | null | undefined = null;
      try { value = await (await Store.load("store.json")).get<Playlist[]>("playlists"); } catch {
        const saved = localStorage.getItem("spyce-playlists");
        if (saved) try { value = JSON.parse(saved) as Playlist[]; } catch {}
      }
      if (value) this.playlists = value.map(p => ({ ...p, updatedAt: p.updatedAt ?? p.createdAt ?? Date.now() }));
      this.storeLoaded = true;
    },
    async save() {
      localStorage.setItem("spyce-playlists", JSON.stringify(this.playlists));
      try { const store = await Store.load("store.json"); await store.set("playlists", this.playlists); await store.save(); } catch {}
    },
    async createPlaylist(name: string) {
      await this.initStore(); const now = Date.now();
      const playlist: Playlist = { id: `${now}-${Math.random().toString(36).slice(2)}`, name: name.trim(), trackPaths: [], createdAt: now, updatedAt: now };
      this.playlists.push(playlist); await this.save(); return playlist;
    },
    async rename(id: string, name: string) { const p = this.playlists.find(x => x.id === id); if (p) { p.name = name.trim(); p.updatedAt = Date.now(); await this.save(); } },
    async deletePlaylist(id: string) { await this.initStore(); this.playlists = this.playlists.filter(p => p.id !== id); await this.save(); },
    async addTrack(id: string, path: string) { const p = this.playlists.find(x => x.id === id); if (p && !p.trackPaths.includes(path)) { p.trackPaths.push(path); p.updatedAt = Date.now(); await this.save(); } },
    async removeTrack(id: string, path: string) { const p = this.playlists.find(x => x.id === id); if (p) { p.trackPaths = p.trackPaths.filter(x => x !== path); p.updatedAt = Date.now(); await this.save(); } },
  },
});
