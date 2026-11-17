<script setup lang="ts">
import { ref } from "vue";
import { Play, ListPlus, Plus, Pencil } from "lucide-vue-next";
import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore } from "../stores/library";
import type { Track } from "../stores/library";
import AddToPlaylistPopover from "./AddToPlaylistPopover.vue";
import ContextMenu from "./ContextMenu.vue";
import { usePlayerStore } from "../stores/player";

defineProps<{ tracks: Track[]; playingPath?: string }>();
const emit = defineEmits<{ play: [track: Track] }>();
const player = usePlayerStore();
const library = useLibraryStore();

const activePopoverTrack = ref<string | null>(null);
const anchorEl = ref<HTMLElement | null>(null);

const contextMenu = ref<{ x: number; y: number; track: Track } | null>(null);
const toast = ref<string | null>(null);

const editingTrack = ref<Track | null>(null);
const editTitle = ref("");
const metadataError = ref("");

function showToast(msg: string) {
  toast.value = msg;
  setTimeout(() => toast.value = null, 1500);
}

function duration(seconds: number) { 
  return seconds ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "--:--"; 
}

function openPopover(trackPath: string, event: MouseEvent) {
  event.stopPropagation();
  activePopoverTrack.value = trackPath;
  anchorEl.value = event.currentTarget as HTMLElement;
}

function handleContextMenuPlaylist() {
  if (contextMenu.value) {
    activePopoverTrack.value = contextMenu.value.track.path;
    anchorEl.value = window.document.body;
  }
}

function handleAddToQueue(track: Track, event: MouseEvent) {
  event.stopPropagation();
  player.addToQueue(track.path);
  showToast("Added to queue");
}

function handlePlayNext(track: Track) {
  player.playNext(track.path);
  showToast("Playing next");
}

function onContextMenu(track: Track, event: MouseEvent) {
  event.preventDefault();
  contextMenu.value = { x: event.clientX, y: event.clientY, track };
}

function openEditor(track: Track) {
  editingTrack.value = track;
  editTitle.value = track.title;
  metadataError.value = "";
}

async function saveMetadata() {
  if (!editingTrack.value) return;
  try {
    const titleVal = editTitle.value.trim();
    if (titleVal) {
      await invoke("update_track_metadata", { path: editingTrack.value.path, title: titleVal });
      const idx = library.tracks.findIndex(t => t.path === editingTrack.value!.path);
      if (idx >= 0) library.tracks[idx].title = titleVal;
    }
    editingTrack.value = null;
    showToast("Title saved");
  } catch (e) {
    metadataError.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div class="table neu-table">
    <div class="table-head">
      <span>#</span>
      <span>Title</span>
      <span class="col-album">Album</span>
      <span class="text-right">Duration</span>
      <span class="actions-head">Actions</span>
    </div>
    
    <div 
      v-for="(track, index) in tracks" 
      :key="track.path" 
      class="row" 
      :class="{ playing: playingPath === track.path }" 
      @dblclick="emit('play', track)"
      @contextmenu="onContextMenu(track, $event)"
    >
      <span class="number" @click.stop="emit('play', track)" title="Play track">
        <Play v-if="playingPath === track.path && player.isPlaying" :size="15" fill="currentColor"/>
        <Play v-else-if="playingPath === track.path" :size="15" fill="currentColor"/>
        <Play v-else :size="15" class="play-icon-hover"/>
        <span class="number-txt" v-if="playingPath !== track.path">{{ index + 1 }}</span>
      </span>

      <span class="title">
        <span class="cover" v-if="track.cover_art_b64"><img :src="`data:image/jpeg;base64,${track.cover_art_b64}`"/></span>
        <span class="cover" v-else>♪</span>
        <span>
          <strong>{{ track.title }}</strong>
          <small>{{ track.artist }}</small>
        </span>
      </span>

      <span class="album col-album">{{ track.album }}</span>
      <span class="duration">{{ duration(track.duration_secs) }}</span>
      <span class="row-actions" @click.stop>
        <button class="action-btn" title="Edit title" @click="openEditor(track)"><Pencil :size="14" /></button>
        <button class="action-btn" title="Add to queue" @click="handleAddToQueue(track, $event)"><ListPlus :size="16" /></button>
        <button class="action-btn" title="Add to playlist" @click="openPopover(track.path, $event)"><Plus :size="16" /></button>
      </span>
    </div>

    <p v-if="!tracks.length" class="empty">No tracks found in library.</p>

<Teleport to="body">
    <div v-if="editingTrack" class="editor-overlay neu-card" @click.self="editingTrack = null">
      <div class="editor-inner">
        <h3>Edit track</h3>
        <input v-model="editTitle" placeholder="Track title" class="neu-input"/>
        <p v-if="metadataError" class="error">{{ metadataError }}</p>
        <div class="editor-actions">
          <button class="neu-button" @click="editingTrack = null">Cancel</button>
          <button class="neu-button primary" @click="saveMetadata">Save</button>
        </div>
      </div>
    </div>
  </Teleport>

    <div v-if="toast" class="toast-notification">{{ toast }}</div>

    <AddToPlaylistPopover 
      v-if="activePopoverTrack && anchorEl" 
      :track-path="activePopoverTrack" 
      :anchor="anchorEl" 
      @close="activePopoverTrack = null" 
      @toast="showToast"
    />

    <ContextMenu
      v-if="contextMenu"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="[
        { label: 'Play next', action: () => handlePlayNext(contextMenu!.track) },
        { label: 'Add to queue', action: () => player.addToQueue(contextMenu!.track.path) },
        { label: 'Add to playlist', action: handleContextMenuPlaylist }
      ]"
      @close="contextMenu = null"
    />
  </div>
</template>

<style scoped>
.neu-table{container:main;min-width:0;background:var(--surface-bg);box-shadow:var(--shadow-inset);border-radius:var(--radius-md);padding:10px 14px;overflow:hidden;position:relative}
.table-head,.row{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(0,.7fr) 64px 112px;align-items:center;gap:16px;min-width:0}
.table-head>* ,.row>*{min-width:0}
.table-head{padding:9px 12px;color:var(--text-secondary);font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.text-right{text-align:right}
.row{width:100%;text-align:left;border:0;background:transparent;color:var(--text-secondary);padding:8px 12px;border-radius:12px;cursor:pointer;transition:var(--transition);position:relative}
.row:hover{background:var(--surface-light);color:var(--text-primary);box-shadow:var(--shadow-raised-sm)}
.row.playing{color:var(--accent)}
.number{display:grid;place-items:center;cursor:pointer;width:32px;height:32px;border-radius:8px}
.number:hover{color:var(--accent);background:var(--surface-bg);box-shadow:var(--shadow-raised-sm)}
.number .play-icon-hover{display:none}
.number:hover .play-icon-hover{display:block}
.number:hover .number-txt{display:none}
.title{display:flex;align-items:center;gap:12px;min-width:0;position:relative}
.title>span:last-child{min-width:0}
.title strong,.title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.title strong{color:var(--text-primary);font-size:13px}
.playing .title strong{color:var(--accent)}
.title small{font-size:11px}
.cover{display:grid;place-items:center;width:38px;height:38px;background:var(--surface-deep);box-shadow:var(--shadow-inset);border-radius:9px;color:var(--accent);flex-shrink:0;overflow:hidden}
.cover img{width:100%;height:100%;object-fit:contain;display:block;border-radius:inherit;box-sizing:border-box;padding:6px}
.album{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
.duration{text-align:right;font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:flex-end;gap:8px}
.row-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;opacity:0;pointer-events:none;min-width:0}
.row:hover .row-actions,.row:focus-within .row-actions{opacity:1;pointer-events:auto}
.action-btn{width:32px;height:32px;display:grid;place-items:center;background:transparent;border:0;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:6px}
.action-btn:hover{color:var(--accent);background:var(--surface-bg);box-shadow:var(--shadow-raised-sm)}
.meta-action{margin-left:auto}
.toast-notification{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:var(--surface-bg);box-shadow:var(--shadow-raised);padding:8px 16px;border-radius:12px;color:var(--accent);font-size:12px;font-weight:600;z-index:50}
.empty{text-align:center;color:var(--text-secondary);padding:48px}
.editor-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.55)}
.editor-inner{width:min(400px,90%);padding:24px;border-radius:20px;background:var(--surface-bg);box-shadow:var(--shadow-raised);display:flex;flex-direction:column;gap:12px}
.editor-inner h3{margin:0}
.neu-input{width:100%;padding:12px;border-radius:12px;border:0;background:var(--surface-bg);box-shadow:var(--shadow-inset);color:var(--text-primary)}
.upload-btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:14px;padding:10px 16px;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--text-primary);cursor:pointer;font-size:13px}
.upload-btn:hover{color:var(--accent)}
.editor-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:6px}
.editor-actions .neu-button{display:inline-flex;align-items:center;justify-content:center;min-width:88px;padding:10px 18px;border:0;border-radius:14px;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--text-primary);font:inherit;cursor:pointer;transition:var(--transition)}
.editor-actions .neu-button:hover{color:var(--accent);box-shadow:var(--shadow-raised)}
.editor-actions .neu-button:active{box-shadow:var(--shadow-pressed);transform:translateY(1px)}
.editor-actions .neu-button.primary{color:var(--accent);font-weight:700}
 .error{color:#ff8c66;font-size:12px;margin:0}
@container main (max-width:860px){.table-head,.row{grid-template-columns:40px minmax(0,1fr) 64px 112px}.col-album{display:none}}
</style>
