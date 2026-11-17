import { defineStore } from "pinia";

export type View = "songs" | "artists" | "albums" | "playlists" | "artist-detail" | "album-detail" | "playlist-detail" | "nowplaying";

interface NavEntry { view: View; param?: string }

export const useNavStore = defineStore("nav", {
  state: () => ({
    stack: [{ view: "songs" }] as NavEntry[],
    index: 0,
  }),
  getters: {
    current: (s) => s.stack[s.index],
    canGoBack: (s) => s.index > 0,
    canGoForward: (s) => s.index < s.stack.length - 1,
    view: (s) => s.stack[s.index].view,
    param: (s) => s.stack[s.index].param,
  },
  actions: {
    go(view: View, param?: string) {
      if (this.view === view && this.param === param) return;
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push({ view, param });
      this.index = this.stack.length - 1;
    },
    navigate(view: View, param?: string) { this.go(view, param); },
    back() { if (this.canGoBack) this.index--; },
    forward() { if (this.canGoForward) this.index++; },
  },
});
