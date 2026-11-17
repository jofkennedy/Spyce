<script setup lang="ts">
import { ChevronLeft, ChevronRight, Music2, Mic2, Disc3, ListMusic, Plus, FolderOpen, ChevronDown } from "lucide-vue-next";
import { useNavStore } from "../stores/navigation";
import { usePlaylistStore } from "../stores/playlists";

defineProps<{ hasFolder: boolean; folderPath: string }>();
const nav = useNavStore();
const playlistsStore = usePlaylistStore();
const emit = defineEmits<{ chooseFolder: []; newPlaylist: [] }>();

function navigate(view: string, param?: string) {
  nav.navigate(view as never, param);
}
</script>
<template>
  <aside class="sidebar neu-panel">
    <div class="history">
      <button class="icon-btn" :disabled="!nav.canGoBack" @click="nav.back()" title="Back"><ChevronLeft :size="18"/></button>
      <button class="icon-btn" :disabled="!nav.canGoForward" @click="nav.forward()" title="Forward"><ChevronRight :size="18"/></button>
    </div>

    <div class="folder-pill" @click="emit('chooseFolder')" title="Change folder">
      <FolderOpen :size="15" class="folder-icon"/>
      <span class="folder-name">{{ folderPath ? folderPath.split(/[/\\]/).pop() : 'Choose folder' }}</span>
      <ChevronDown :size="13" class="folder-chevron"/>
    </div>

    <nav class="section-nav">
      <div class="section-label">Library</div>
      <button class="nav-item" :class="{ active: nav.view === 'songs' }" @click="navigate('songs')"><Music2 :size="18"/> Songs</button>
      <button class="nav-item" :class="{ active: nav.view === 'artists' }" @click="navigate('artists')"><Mic2 :size="18"/> Artists</button>
      <button class="nav-item" :class="{ active: nav.view === 'albums' }" @click="navigate('albums')"><Disc3 :size="18"/> Albums</button>
      <button class="nav-item" :class="{ active: nav.view === 'playlists' }" @click="navigate('playlists')"><ListMusic :size="18"/> Playlists</button>
    </nav>

    <div class="playlists-section">
      <div class="section-label">Playlists</div>
      <div class="playlists-scroll">
        <button v-for="pl in playlistsStore.playlists" :key="pl.id" class="nav-item playlist-item" :class="{ active: nav.view === 'playlist-detail' && nav.param === pl.id }" @click="navigate('playlist-detail', pl.id)">
          <ListMusic :size="16"/> <span>{{ pl.name }}</span>
        </button>
        <p v-if="!playlistsStore.playlists.length" class="empty-muted">No playlists yet</p>
      </div>
      <button class="neu-button new-pl-btn" @click="emit('newPlaylist')"><Plus :size="16"/> New playlist</button>
    </div>
  </aside>
</template>
<style scoped>
 .sidebar{width:240px;display:flex;flex-direction:column;gap:16px;padding:16px;background:var(--surface-bg);border-radius:28px;box-shadow:var(--shadow-raised);overflow:hidden;min-height:0;height:100%;box-sizing:border-box}
.history{display:flex;gap:8px}
.icon-btn{border:0;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);border-radius:50%;width:40px;height:40px;color:var(--text-secondary);cursor:pointer;display:grid;place-items:center}
.icon-btn:hover:not(:disabled){color:var(--accent);box-shadow:var(--shadow-pressed)}
.icon-btn:disabled{opacity:.4;cursor:not-allowed}

.folder-pill{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface-bg);box-shadow:var(--shadow-inset);border-radius:14px;cursor:pointer;color:var(--text-primary);font-size:12px;transition:.15s}
.folder-pill:hover{color:var(--accent)}
.folder-icon{color:var(--accent);flex-shrink:0}
.folder-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.folder-chevron{color:var(--text-secondary);flex-shrink:0}

.section-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-secondary);margin:12px 0 6px}
.section-nav{display:flex;flex-direction:column;gap:4px}
.nav-item{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;border:0;border-radius:14px;background:transparent;color:var(--text-secondary);cursor:pointer;text-align:left;font-size:13px;font-weight:500}
.nav-item:hover{color:var(--text-primary)}
.nav-item.active{color:var(--accent);box-shadow:var(--shadow-inset)}

.playlists-section{display:flex;flex-direction:column;flex:1;min-height:0;margin-top:6px}
.playlists-scroll{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding-right:4px;margin-bottom:10px}
.playlist-item{font-size:12px;padding:8px 12px}
.empty-muted{font-size:11px;color:var(--text-secondary);padding:6px 12px;margin:0}
 .new-pl-btn{flex:none;width:100%;border:0;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);border-radius:14px;padding:10px;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px}
 .new-pl-btn:hover{color:var(--accent);box-shadow:var(--shadow-pressed)}
@media(max-width:1100px){.sidebar{width:208px}}
@media(max-height:820px){.sidebar{gap:10px;padding:14px 12px}.nav-item{min-height:36px;padding:8px 10px}.section-label{margin:8px 10px 4px}}
@media(max-height:680px){.folder-pill{display:none}}
</style>
