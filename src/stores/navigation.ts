import { defineStore } from "pinia";

export type View = "songs" | "artists" | "albums" | "playlists" | "artist-detail" | "album-detail" | "playlist-detail";

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
    navigate(view: View, param?: string) {
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push({ view, param });
      this.index = this.stack.length - 1;
    },
    back() { if (this.canGoBack) this.index--; },
    forward() { if (this.canGoForward) this.index++; },
  },
});
