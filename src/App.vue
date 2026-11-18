<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Plus, ListPlus, Maximize2, Volume2, Volume1, VolumeX, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Music } from "lucide-vue-next";
import Sidebar from "./components/Sidebar.vue";
import MainView from "./components/MainView.vue";
import AddToPlaylistPopover from "./components/AddToPlaylistPopover.vue";
import QueuePanel from "./components/QueuePanel.vue";
import SpectrumBar from "./components/SpectrumBar.vue";
import { useNavStore } from "./stores/navigation";
import { useLibraryStore } from "./stores/library";
import { usePlayerStore } from "./stores/player";
import { useUiStore } from "./stores/ui";
import { usePlaylistStore } from "./stores/playlists";

const nav = useNavStore();
const library = useLibraryStore();
const player = usePlayerStore();
const ui = useUiStore();
const playlistsStore = usePlaylistStore();

const mainViewRef = ref<InstanceType<typeof MainView> | null>(null);
const showPlaylistPopover = ref(false);
const playlistBtn = ref<HTMLElement | null>(null);

function onSidebarNewPlaylist() {
  nav.navigate("playlists");
  mainViewRef.value?.openNewPlaylistModal();
}

function onSeekInput(e: Event) {
  player.isScrubbing = true;
  player.currentTime = (Number((e.target as HTMLInputElement).value) / 100) * (player.duration || 1);
}

function onSeekChange(e: Event) {
  player.seek((Number((e.target as HTMLInputElement).value) / 100) * (player.duration || 1));
  player.isScrubbing = false;
}

function onVolumeInput(e: Event) {
  player.setVolume(Number((e.target as HTMLInputElement).value));
}

function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === "Space") {
    e.preventDefault();
    player.toggle();
  }
  if (e.ctrlKey && e.code === "ArrowRight") player.next();
  if (e.ctrlKey && e.code === "ArrowLeft") player.prev();
  if (e.code === "ArrowUp") player.setVolume(player.volume + 0.05);
  if (e.code === "ArrowDown") player.setVolume(player.volume - 0.05);
}

onMounted(async () => {
  await playlistsStore.initStore();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="app-shell" :class="{ 'queue-open': ui.queueOpen }">
    <aside class="sidebar-col">
      <Sidebar
        @new-playlist="onSidebarNewPlaylist"
      />
    </aside>

    <main class="main-col">
      <MainView
        ref="mainViewRef"
        :nav="nav.view"
      />
    </main>

    <QueuePanel v-if="ui.queueOpen" @close="ui.closeQueue()" />

    <footer class="player-bar">
      <SpectrumBar />
      <div class="track-info">
        <button class="small-cover np-open" :disabled="!player.hasTrack" aria-label="Now playing" @click="nav.go('nowplaying')"><img v-if="player.current && library.coverOf(player.current.path)" :src="library.coverOf(player.current.path)" alt=""/><Music v-else :size="18" /></button>
        <button class="track-text np-open" :disabled="!player.hasTrack" @click="nav.go('nowplaying')">
          <strong>{{ player.current?.title ?? 'Nothing playing' }}</strong>
          <small>{{ player.current?.artist ?? 'Select a track' }}</small>
        </button>
        <button
          ref="playlistBtn"
          class="plain-btn"
          :disabled="!player.hasTrack"
          aria-label="Add to playlist"
          title="Add to playlist"
          @click="showPlaylistPopover = !showPlaylistPopover"
        >
          <Plus :size="20" />
        </button>
      </div>

      <div class="transport">
        <div class="controls">
          <button
            class="plain"
            :class="{ active: player.isShuffle }"
            :disabled="!player.hasTrack"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="17" />
          </button>
          <button class="plain" :disabled="!player.hasTrack" @click="player.prev()">
            <SkipBack :size="19" />
          </button>
          <button
            class="main-play"
            :disabled="!player.hasTrack"
            @click="player.toggle()"
          >
            <Pause v-if="player.isPlaying" :size="20" fill="currentColor" />
            <Play v-else :size="20" fill="currentColor" />
          </button>
          <button class="plain" :disabled="!player.hasTrack" @click="player.next()">
            <SkipForward :size="19" />
          </button>
          <button
            class="plain"
            :class="{ active: player.repeat !== 'off' }"
            :disabled="!player.hasTrack"
            @click="player.cycleRepeat()"
          >
            <Repeat1 v-if="player.repeat === 'one'" :size="17" />
            <Repeat v-else :size="17" />
          </button>
        </div>
        <div class="seek">
          <span>{{ Math.floor(player.currentTime / 60) }}:{{ String(Math.floor(player.currentTime % 60)).padStart(2, '0') }}</span>
          <input
            type="range"
            min="0"
            max="100"
            :value="(player.currentTime / (player.duration || 1)) * 100"
            :disabled="!player.hasTrack"
            @input="onSeekInput"
            @change="onSeekChange"
          />
          <span>{{ player.hasTrack ? `${Math.floor(player.duration / 60)}:${String(Math.floor(player.duration % 60)).padStart(2, '0')}` : '--:--' }}</span>
        </div>
      </div>

      <div class="player-actions">
        <button
          class="plain"
          :class="{ active: ui.queueOpen }"
          :aria-pressed="ui.queueOpen"
          title="Queue"
          @click="ui.toggleQueue()"
        >
          <ListPlus :size="18" />
        </button>
        <button class="plain" @click="player.toggleMute()">
          <VolumeX v-if="player.muted || player.volume === 0" :size="18" />
          <Volume1 v-else-if="player.volume < 0.5" :size="18" />
          <Volume2 v-else :size="18" />
        </button>
        <input
          class="volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="player.volume"
          @input="onVolumeInput"
        />
        <button class="plain" :class="{ active: nav.view === 'nowplaying' }" :aria-pressed="nav.view === 'nowplaying'" aria-label="Now playing" @click="nav.go('nowplaying')"><Maximize2 :size="17"/></button>
      </div>
    </footer>
  </div>

  <AddToPlaylistPopover
    v-if="showPlaylistPopover && player.current && playlistBtn"
    :track-path="player.current.path"
    :anchor="playlistBtn"
    class="player-popover"
    @close="showPlaylistPopover = false"
  />
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 20px;
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  background: var(--surface-deep);
  color: var(--text-primary);
  overflow: hidden;
}

.app-shell.queue-open {
  grid-template-columns: 240px minmax(0, 1fr) 340px;
}

.sidebar-col {
  grid-column: 1;
  grid-row: 1;
  min-height: 0;
  height: 100%;
  align-self: stretch;
}

.main-col {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-bg);
  border-radius: 28px;
  box-shadow: var(--shadow-raised);
}

.player-bar {
  position: relative;
  isolation: isolate;
  grid-column: 1 / -1;
  grid-row: 2;
  height: 80px;
  display: grid;
  grid-template-columns: minmax(160px,1fr) minmax(320px,1.6fr) minmax(160px,1fr);
  align-items: center;
  gap: 20px;
  padding: 12px 24px;
  background: var(--surface-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-raised);
  box-sizing: border-box;
}
.player-bar > :not(.spectrum) { position: relative; z-index: 1; }

.track-info,
.controls,
.player-actions,
.seek {
  display: flex;
  align-items: center;
}

.track-info {
  gap: 12px;
  min-width: 0;
}

.track-text {
  display: grid;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}

.track-text strong {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-text small {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.small-cover img{width:100%;height:100%;object-fit:contain;border-radius:inherit}
.small-cover {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--surface-deep);
  box-shadow: var(--shadow-inset);
  color: var(--accent);
  flex-shrink: 0;
}

.plain-btn {
  background: transparent;
  border: 0;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plain-btn:hover:not(:disabled) {
  color: var(--accent);
}
.plain-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.plain {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 7px;
  border-radius: 50%;
  transition: var(--transition);
}

.plain.active {
  color: var(--accent);
}

.plain:hover:not(:disabled) {
  color: var(--accent);
  box-shadow: var(--shadow-raised-sm);
}

.plain:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.controls {
  justify-content: center;
  gap: 14px;
}

.main-play {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  cursor: pointer;
  box-shadow: var(--shadow-raised);
}

.main-play:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.seek {
  gap: 10px;
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.seek input {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
  background: var(--surface-deep);
  border-radius: 2px;
}

.player-actions {
  justify-content: flex-end;
  gap: 8px;
}

.volume {
  width: clamp(72px, 9vw, 120px);
  flex: none;
  accent-color: var(--accent);
  height: 4px;
  background: var(--surface-deep);
  border-radius: 2px;
}

.player-popover {
  bottom: 100px !important;
  top: auto !important;
}

@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .app-shell.queue-open {
    grid-template-columns: 1fr;
  }
  .sidebar-col {
    display: none;
  }
  .main-col {
    grid-column: 1;
  }
}

@media (max-width: 650px) {
  .player-bar {
    grid-template-columns: 1fr;
    height: 76px;
  }
  .player-actions {
    display: none;
  }
}
</style>
