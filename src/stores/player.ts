import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import type { Track } from "./library";
import { ensureGraph, resumeGraph } from "../audio/graph";

export type RepeatMode = "off" | "all" | "one";

export const usePlayerStore = defineStore("player", () => {
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  const originalQueue = ref<Track[]>([]);
  const queue = ref<Track[]>([]);
  const userQueue = ref<string[]>([]);
  const index = ref(-1);
  const contextName = ref("Library");
  
  const isPlaying = ref(false);
  const isShuffle = ref(false);
  const repeat = ref<RepeatMode>("off");
  const volume = ref(0.8);
  const muted = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const isScrubbing = ref(false);

  const current = computed(() => (index.value >= 0 && index.value < queue.value.length ? queue.value[index.value] : null));
  const hasTrack = computed(() => !!current.value);
  const upNextContext = computed(() => queue.value.slice(index.value + 1));

  async function saveSettings() {
    try {
      const store = await Store.load("player_settings.json");
      await store.set("settings", {
        volume: volume.value,
        muted: muted.value,
        isShuffle: isShuffle.value,
        repeat: repeat.value
      });
      await store.save();
    } catch {
      localStorage.setItem("spyce-player-settings", JSON.stringify({
        volume: volume.value,
        muted: muted.value,
        isShuffle: isShuffle.value,
        repeat: repeat.value
      }));
    }
  }

  async function loadSettings() {
    let settings: { volume?: number; muted?: boolean; isShuffle?: boolean; repeat?: RepeatMode } | null | undefined = null;
    try {
      const store = await Store.load("player_settings.json");
      settings = await store.get("settings");
    } catch {}
    
    if (!settings) {
      const local = localStorage.getItem("spyce-player-settings");
      if (local) {
        try { settings = JSON.parse(local); } catch {}
      }
    }

    if (settings) {
      volume.value = settings.volume ?? 0.8;
      muted.value = settings.muted ?? false;
      isShuffle.value = settings.isShuffle ?? false;
      repeat.value = settings.repeat ?? "off";
      audio.volume = muted.value ? 0 : volume.value;
    }
  }

  audio.addEventListener("play", () => { isPlaying.value = true; updateMediaSession(); updateDiscord(); });
  audio.addEventListener("pause", () => { isPlaying.value = false; updateDiscord(); });
  audio.addEventListener("timeupdate", () => {
    if (!isScrubbing.value) currentTime.value = audio.currentTime;
  });
  audio.addEventListener("loadedmetadata", () => { duration.value = audio.duration; });
  audio.addEventListener("ended", () => { next(true); });
  audio.addEventListener("error", () => { next(true); });

  function updateDiscord() { if (current.value) void invoke("update_presence", { title: current.value.title, artist: current.value.artist, playing: isPlaying.value }).catch(() => {}); }

  function updateMediaSession() {
    if ("mediaSession" in navigator && current.value) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.value.title,
        artist: current.value.artist,
        album: current.value.album,
        artwork: current.value.cover_art_b64 ? [{ src: `data:image/png;base64,${current.value.cover_art_b64}`, sizes: "512x512", type: "image/png" }] : []
      });
    }
  }

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
  }

  function trackById(id: string) {
    return [...originalQueue.value, ...queue.value].find(t => t.path === id) || null;
  }

  function setQueue(tracks: Track[], startPath?: string, name = "Library") {
    contextName.value = name;
    originalQueue.value = [...tracks];
    if (isShuffle.value) {
      const currentTrack = startPath ? tracks.find(t => t.path === startPath) : tracks[0];
      const rest = tracks.filter(t => t.path !== (currentTrack?.path || ""));
      queue.value = currentTrack ? [currentTrack, ...shuffleArray(rest)] : shuffleArray([...tracks]);
      index.value = 0;
    } else {
      queue.value = [...tracks];
      index.value = startPath ? queue.value.findIndex(t => t.path === startPath) : 0;
    }
    if (index.value === -1) index.value = 0;
    playAt(index.value);
  }

  function playAt(i: number) {
    if (i < 0 || i >= queue.value.length) return;
    index.value = i;
    const track = queue.value[i];
    ensureGraph(audio);
    audio.src = convertFileSrc(track.path);
    audio.loop = repeat.value === "one";
    resumeGraph().then(() => audio.play()).catch(() => {});
  }

  function toggle() {
    if (!hasTrack.value) return;
    if (audio.paused) audio.play(); else audio.pause();
  }

  function next(auto = false) {
    if (repeat.value === "one" && auto) {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    
    if (userQueue.value.length > 0) {
      const nextId = userQueue.value.shift()!;
      const track = trackById(nextId);
      if (track) {
        // We inject the track at current position in queue to keep upNextContext working
        queue.value.splice(index.value + 1, 0, track);
        playAt(index.value + 1);
        return;
      }
    }

    if (index.value < queue.value.length - 1) {
      playAt(index.value + 1);
    } else if (repeat.value === "all") {
      playAt(0);
    } else if (auto) {
      isPlaying.value = false;
      currentTime.value = 0;
      audio.currentTime = 0;
      void invoke("clear_presence").catch(() => {});
    }
  }

  function prev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else if (index.value > 0) {
      playAt(index.value - 1);
    } else if (repeat.value === "all") {
      playAt(queue.value.length - 1);
    } else {
      audio.currentTime = 0;
    }
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value;
    const currentTrack = current.value;
    if (isShuffle.value) {
      const rest = originalQueue.value.filter(t => t.path !== currentTrack?.path);
      queue.value = currentTrack ? [currentTrack, ...shuffleArray(rest)] : shuffleArray([...originalQueue.value]);
      index.value = 0;
    } else {
      queue.value = [...originalQueue.value];
      index.value = currentTrack ? queue.value.findIndex(t => t.path === currentTrack.path) : -1;
    }
    saveSettings();
  }

  function cycleRepeat() {
    const modes: RepeatMode[] = ["off", "all", "one"];
    repeat.value = modes[(modes.indexOf(repeat.value) + 1) % modes.length];
    audio.loop = repeat.value === "one";
    saveSettings();
  }

  function getTime() { return audio.currentTime; }

  function seek(sec: number) {
    audio.currentTime = sec;
    currentTime.value = sec;
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v));
    if (!muted.value) audio.volume = volume.value;
    saveSettings();
  }

  function toggleMute() {
    muted.value = !muted.value;
    audio.volume = muted.value ? 0 : volume.value;
    saveSettings();
  }

  function addToQueue(id: string) {
    if (!hasTrack.value) {
      const track = trackById(id);
      if (track) setQueue([track], id);
      return;
    }
    userQueue.value.push(id);
  }

  function playNext(id: string) {
    userQueue.value.unshift(id);
  }

  function removeFromQueue(i: number) {
    userQueue.value.splice(i, 1);
  }

  function clearQueue() {
    userQueue.value = [];
  }

  function moveInQueue(from: number, to: number) {
    const item = userQueue.value.splice(from, 1)[0];
    userQueue.value.splice(to, 0, item);
  }

  function playQueued(i: number) {
    const id = userQueue.value.splice(i, 1)[0];
    const track = trackById(id);
    if (track) {
      queue.value.splice(index.value + 1, 0, track);
      playAt(index.value + 1);
    }
  }

  function playContextTrack(path: string) {
    const i = queue.value.findIndex(t => t.path === path);
    if (i >= 0) playAt(i);
  }

  function shuffleArray<T>(array: T[]): T[] {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[j], a[i]] = [a[i], a[j]];
    }
    return a;
  }

  loadSettings();

  return {
    queue, originalQueue, userQueue, index, contextName, isPlaying, isShuffle, repeat, volume, muted, currentTime, duration, isScrubbing,
    current, hasTrack, upNextContext,
    setQueue, playAt, toggle, next, prev, toggleShuffle, cycleRepeat, seek, getTime, setVolume, toggleMute,
    trackById, addToQueue, playNext, removeFromQueue, clearQueue, moveInQueue, playQueued, playContextTrack
  };
});
