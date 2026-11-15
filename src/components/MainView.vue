<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Play, Pause, Shuffle, ListPlus, Music, FolderPlus, Plus, Trash2, ArrowLeft } from "lucide-vue-next";
import TopBar from "./TopBar.vue";
import TrackTable from "./TrackTable.vue";
import { useLibraryStore, type Track } from "../stores/library";
import { useNavStore } from "../stores/navigation";
import { usePlaylistStore } from "../stores/playlists";
import { usePlayerStore } from "../stores/player";
import { useUiStore } from "../stores/ui";

const library = useLibraryStore();
const nav = useNavStore();
const playlistsStore = usePlaylistStore();
const player = usePlayerStore();
const ui = useUiStore();

const search = ref("");
const error = ref("");
const downloading = ref(false);
const ytUrl = ref("");
const showImport = ref(false);
const showNewPlaylist = ref(false);
const newPlaylistName = ref("");

defineProps<{ nav: string; theme: string }>();
const emit = defineEmits<{ toggleQueue: []; toggleTheme: [] }>();

const filteredTracks = computed(() =>
  library.tracks.filter(t =>
    `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(search.value.toLowerCase())
  )
);
const totalDuration = computed(() => Math.floor(library.tracks.reduce((sum, t) => sum + t.duration_secs, 0) / 60));

const artists = computed(() => {
  const map = new Map<string, Track[]>();
  for (const t of library.tracks) {
    const art = t.artist && t.artist !== "Unknown Artist" ? t.artist : "Unknown Artist";
    if (!map.has(art)) map.set(art, []);
    map.get(art)!.push(t);
  }
  return Array.from(map.entries()).map(([name, tracks]) => ({ name, tracks, count: tracks.length }));
});

const albums = computed(() => {
  const map = new Map<string, Track[]>();
  for (const t of library.tracks) {
    const alb = t.album && t.album !== "Unknown Album" ? t.album : "Unknown Album";
    if (!map.has(alb)) map.set(alb, []);
    map.get(alb)!.push(t);
  }
  return Array.from(map.entries()).map(([name, tracks]) => ({
    name,
    artist: tracks[0]?.artist || "Unknown Artist",
    tracks,
    count: tracks.length,
  }));
});

const selectedArtistTracks = computed(() => {
  if (nav.view !== "artist-detail" || !nav.param) return [];
  return library.tracks.filter(t => (t.artist || "Unknown Artist") === nav.param);
});

const selectedAlbumTracks = computed(() => {
  if (nav.view !== "album-detail" || !nav.param) return [];
  return library.tracks.filter(t => (t.album || "Unknown Album") === nav.param);
});

const currentPlaylist = computed(() => {
  if (nav.view !== "playlist-detail" || !nav.param) return null;
  return playlistsStore.playlists.find(p => p.id === nav.param);
});

const selectedPlaylistTracks = computed(() => {
  const pl = currentPlaylist.value;
  if (!pl) return [];
  return library.tracks.filter(t => pl.trackPaths.includes(t.path));
});

const folderDisplayName = computed(() => {
  if (!library.folder) return "Choose folder";
  const name = library.folder.split(/[/\\]/).filter(Boolean).pop();
  return name ? `Spyce / ${name}` : "Spyce";
});

async function refresh() {
  await playlistsStore.initStore();
  if (!library.folder) return;
  try {
    library.tracks = await invoke("scan_folder", { folder: library.folder });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function chooseFolder() {
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected === "string") {
    library.folder = selected;
    await refresh();
  }
}

async function download() {
  if (!ytUrl.value || !library.folder) return;
  downloading.value = true;
  error.value = "";
  try {
    await invoke("download_youtube", { url: ytUrl.value, folder: library.folder });
    ytUrl.value = "";
    showImport.value = false;
    await refresh();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    downloading.value = false;
  }
}

async function createPlaylist() {
  if (!newPlaylistName.value.trim()) return;
  await playlistsStore.createPlaylist(newPlaylistName.value.trim());
  newPlaylistName.value = "";
  showNewPlaylist.value = false;
}

function openNewPlaylistModal() {
  showNewPlaylist.value = true;
}

function handlePlay(track: Track, tracksPool?: Track[], contextName?: string) {
  const pool = tracksPool || filteredTracks.value;
  player.setQueue(pool, track.path, contextName);
}

function handleAddAllToQueue(tracks: Track[]) {
  tracks.forEach(t => player.addToQueue(t.path));
}

const mainScroll = ref<HTMLElement | null>(null);
const scrolled = ref(false);
function handleScroll() { scrolled.value = (mainScroll.value?.scrollTop ?? 0) > 4; }

defineExpose({ chooseFolder, openNewPlaylistModal });
onMounted(refresh);
</script>
<template>
  <div class="main-container" :class="{ scrolled }">
    <TopBar
      v-model:search="search"
      :has-folder="!!library.folder"
      :folder-name="folderDisplayName"
      :theme="theme"
      @choose-folder="chooseFolder"
      @toggle-theme="emit('toggleTheme')"
      @import="showImport = true"
    />

    <div ref="mainScroll" class="main-scroll" @scroll.passive="handleScroll">
      <div class="content">
        <!-- Empty State -->
        <div v-if="(!library.folder || !library.tracks.length) && nav.view !== 'playlists'" class="empty-state">
          <div class="empty-icon"><Music :size="42" /></div>
          <h2>{{ library.folder ? 'No audio files found' : 'No music folder selected' }}</h2>
          <p>Choose your local music folder to start playing and managing your library.</p>
          <button class="neu-button primary" @click="chooseFolder"><FolderPlus :size="18" /> Choose folder</button>
        </div>

        <!-- Songs View -->
        <template v-else-if="nav.view === 'songs'">
          <section class="hero">
            <div class="hero-cover"><div class="cover-well">♪</div></div>
            <div class="hero-info">
              <span class="eyebrow">LIBRARY</span>
              <h1>All Songs</h1>
              <p class="hero-meta">{{ library.tracks.length }} songs · {{ totalDuration }} min</p>
              <div class="hero-actions">
                <button class="play-btn" :disabled="!filteredTracks.length" @click="player.contextName === 'Songs' && player.isPlaying ? player.toggle() : handlePlay(filteredTracks[0], filteredTracks, 'Songs')">
                  <Pause v-if="player.contextName === 'Songs' && player.isPlaying" :size="21" fill="currentColor" />
                  <Play v-else :size="21" fill="currentColor" />
                </button>
                <button class="neu-button" :disabled="!filteredTracks.length" @click="player.isShuffle || player.toggleShuffle(); player.setQueue(filteredTracks, filteredTracks[Math.floor(Math.random()*filteredTracks.length)].path, 'Songs')">
                  <Shuffle :size="18" /> Shuffle
                </button>
                <button class="neu-button" :class="{ active: ui.queueOpen }" :disabled="!filteredTracks.length" :aria-pressed="ui.queueOpen" @click="ui.toggleQueue()">
                  <ListPlus :size="18" /> Queue
                </button>
              </div>
            </div>
          </section>
          <div class="section-heading">
            <h2>All tracks</h2>
            <span>{{ filteredTracks.length }} songs</span>
          </div>
          <TrackTable :tracks="filteredTracks" :playingPath="player.current?.path" @play="handlePlay($event, filteredTracks, 'Songs')" />
        </template>

        <!-- Artists View -->
        <template v-else-if="nav.view === 'artists'">
          <div class="section-heading">
            <h2>Artists</h2>
            <span>{{ artists.length }} artists</span>
          </div>
          <div class="grid">
            <div v-for="artist in artists" :key="artist.name" class="card neu-card" @click="nav.navigate('artist-detail', artist.name)">
              <div class="card-cover"><div class="cover-well">♪</div></div>
              <strong>{{ artist.name }}</strong>
              <small>{{ artist.count }} songs</small>
            </div>
          </div>
        </template>

        <!-- Albums View -->
        <template v-else-if="nav.view === 'albums'">
          <div class="section-heading">
            <h2>Albums</h2>
            <span>{{ albums.length }} albums</span>
          </div>
          <div class="grid">
            <div v-for="album in albums" :key="album.name" class="card neu-card" @click="nav.navigate('album-detail', album.name)">
              <div class="card-cover"><div class="cover-well">♪</div></div>
              <strong>{{ album.name }}</strong>
              <small>{{ album.artist }}</small>
            </div>
          </div>
        </template>

        <!-- Artist / Album Detail View -->
        <template v-else-if="nav.view === 'artist-detail' || nav.view === 'album-detail'">
          <div class="detail-nav-row">
            <button class="back-link" @click="nav.navigate(nav.view === 'artist-detail' ? 'artists' : 'albums')">
              <ArrowLeft :size="16" /> Back to {{ nav.view === 'artist-detail' ? 'Artists' : 'Albums' }}
            </button>
          </div>
          <section class="hero">
            <div class="hero-cover"><div class="cover-well">♪</div></div>
            <div class="hero-info">
              <span class="eyebrow">{{ nav.view === 'artist-detail' ? 'ARTIST' : 'ALBUM' }}</span>
              <h1>{{ nav.param }}</h1>
              <p class="hero-meta">{{ selectedArtistTracks.length || selectedAlbumTracks.length }} tracks</p>
              <div class="hero-actions">
                <button class="play-btn" @click="player.contextName === nav.param && player.isPlaying ? player.toggle() : handlePlay(selectedArtistTracks[0] || selectedAlbumTracks[0], selectedArtistTracks.length ? selectedArtistTracks : selectedAlbumTracks, nav.param!)">
                  <Pause v-if="player.contextName === nav.param && player.isPlaying" :size="21" fill="currentColor" />
                  <Play v-else :size="21" fill="currentColor" />
                </button>
                <button class="neu-button" @click="handleAddAllToQueue(selectedArtistTracks.length ? selectedArtistTracks : selectedAlbumTracks)">
                  <ListPlus :size="18" /> Queue
                </button>
              </div>
            </div>
          </section>
          <TrackTable :tracks="selectedArtistTracks.length ? selectedArtistTracks : selectedAlbumTracks" :playingPath="player.current?.path" @play="handlePlay($event, selectedArtistTracks.length ? selectedArtistTracks : selectedAlbumTracks, nav.param!)" />
        </template>

        <!-- Playlists View -->
        <template v-else-if="nav.view === 'playlists'">
          <div class="playlist-header">
            <div>
              <h2>Your Playlists</h2>
              <span class="subtitle">{{ playlistsStore.playlists.length }} playlists</span>
            </div>
            <button class="neu-button primary" @click="showNewPlaylist = true"><Plus :size="18" /> New playlist</button>
          </div>
          <div class="grid">
            <div v-for="pl in playlistsStore.playlists" :key="pl.id" class="card neu-card" @click="nav.navigate('playlist-detail', pl.id)">
              <div class="card-cover"><div class="cover-well">♪</div></div>
              <strong>{{ pl.name }}</strong>
              <small>{{ pl.trackPaths.length }} tracks</small>
            </div>
          </div>
          <div v-if="!playlistsStore.playlists.length" class="empty-state">
            <p>No playlists created yet. Click New Playlist to start.</p>
          </div>
        </template>

        <!-- Playlist Detail View -->
        <template v-else-if="nav.view === 'playlist-detail'">
          <div class="detail-nav-row">
            <button class="back-link" @click="nav.navigate('playlists')">
              <ArrowLeft :size="16" /> Back to Playlists
            </button>
          </div>
          <section class="hero">
            <div class="hero-cover"><div class="cover-well">♪</div></div>
            <div class="hero-info">
              <span class="eyebrow">PLAYLIST</span>
              <h1>{{ currentPlaylist?.name }}</h1>
              <p class="hero-meta">{{ selectedPlaylistTracks.length }} tracks</p>
              <div class="hero-actions">
                <button class="play-btn" :disabled="!selectedPlaylistTracks.length" @click="player.contextName === currentPlaylist?.name && player.isPlaying ? player.toggle() : handlePlay(selectedPlaylistTracks[0], selectedPlaylistTracks, currentPlaylist!.name)">
                  <Pause v-if="player.contextName === currentPlaylist?.name && player.isPlaying" :size="21" fill="currentColor" />
                  <Play v-else :size="21" fill="currentColor" />
                </button>
                <button class="neu-button" :class="{ active: ui.queueOpen }" :disabled="!selectedPlaylistTracks.length" :aria-pressed="ui.queueOpen" @click="ui.toggleQueue()">
                  <ListPlus :size="18" /> Queue
                </button>
                <button
                  class="neu-button"
                  @click="currentPlaylist && playlistsStore.deletePlaylist(currentPlaylist.id); nav.navigate('playlists')"
                >
                  <Trash2 :size="16" /> Delete Playlist
                </button>
              </div>
            </div>
          </section>
          <TrackTable :tracks="selectedPlaylistTracks" :playingPath="player.current?.path" @play="handlePlay($event, selectedPlaylistTracks, currentPlaylist!.name)" />
        </template>
      </div>
    </div>

    <!-- Import Dialog -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
      <div class="modal neu-card">
        <h3>Import from YouTube</h3>
        <input v-model="ytUrl" class="neu-input" placeholder="Paste YouTube link" />
        <p v-if="error" class="modal-error">{{ error }}</p>
        <div class="modal-actions">
          <button class="neu-button" @click="showImport = false">Cancel</button>
          <button class="neu-button primary" :disabled="downloading" @click="download">
            <span v-if="downloading" class="loading-spinner" aria-hidden="true"></span>
            {{ downloading ? 'Preparing downloader...' : 'Import' }}
          </button>
        </div>
      </div>
    </div>

    <!-- New Playlist Dialog -->
    <div v-if="showNewPlaylist" class="modal-overlay" @click.self="showNewPlaylist = false">
      <div class="modal neu-card">
        <h3>Create New Playlist</h3>
        <input v-model="newPlaylistName" class="neu-input" placeholder="Playlist name" @keyup.enter="createPlaylist" />
        <div class="modal-actions">
          <button class="neu-button" @click="showNewPlaylist = false">Cancel</button>
          <button class="neu-button primary" @click="createPlaylist">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.main-container{display:flex;flex-direction:column;flex:1 1 0;min-width:0;min-height:0;height:100%;background:var(--surface-bg);--page-pad:32px;overflow:hidden;box-sizing:border-box}
.main-scroll{min-height:0;flex:1 1 auto;overflow-y:auto;margin-right:8px;padding:20px 24px 32px var(--page-pad);box-sizing:border-box;mask-image:linear-gradient(to bottom,transparent 0,#000 20px);-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 20px)}
.content{min-width:0}

.detail-nav-row{margin-bottom:16px}
.back-link{background:transparent;border:0;color:var(--text-secondary);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:4px 0}
.back-link:hover{color:var(--accent)}

.hero{display:flex;align-items:center;gap:24px;padding:24px;border-radius:var(--radius-lg);background:var(--surface-bg);box-shadow:var(--shadow-raised);margin-bottom:28px}
.hero-cover{width:160px;height:160px;display:grid;place-items:center;border-radius:18px;background:var(--surface-bg);box-shadow:var(--shadow-raised);flex-shrink:0}
.cover-well{display:grid;place-items:center;width:calc(100% - 18px);height:calc(100% - 18px);border-radius:13px;background:var(--surface-deep);box-shadow:var(--shadow-inset);color:var(--accent);font-size:56px}
.hero-info{min-width:0}
.eyebrow{font-size:10px;letter-spacing:.18em;color:var(--text-secondary);font-weight:700}
.hero h1{font-size:clamp(28px,3.5vw,44px);margin:6px 0}
.hero-meta{color:var(--text-secondary);font-size:13px;margin:0}
.hero-actions{display:flex;align-items:center;gap:12px;margin-top:16px}
.play-btn{display:grid;place-items:center;width:44px;height:44px;border:0;border-radius:50%;background:var(--accent);color:white;box-shadow:var(--shadow-raised);cursor:pointer}
.play-btn:disabled{opacity:.4;cursor:not-allowed}

.neu-button{display:flex;align-items:center;gap:8px;border:0;border-radius:14px;padding:10px 16px;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--text-primary);cursor:pointer;font-size:13px}
.neu-button:hover:not(:disabled){color:var(--accent);transform:translateY(-1px)}
.neu-button.active{color:var(--accent);box-shadow:var(--shadow-pressed)}
.neu-button:active:not(:disabled){box-shadow:var(--shadow-pressed);transform:none}
.neu-button:disabled{opacity:.4;cursor:not-allowed}
.neu-button.primary{color:var(--accent);font-weight:600}

.grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(176px, 1fr));gap:24px}
.card{padding:14px;border-radius:18px;background:var(--surface-bg);box-shadow:var(--shadow-raised);cursor:pointer;transition:transform .15s ease}
.card:hover{transform:translateY(-2px);color:var(--accent)}
.card-cover{width:100%;aspect-ratio:1;display:grid;place-items:center;border-radius:12px;background:var(--surface-bg);box-shadow:var(--shadow-raised);margin-bottom:12px;overflow:hidden}.cover-img{width:100%;height:100%;object-fit:cover}
.card strong,.card small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card strong{font-size:13px}
.card small{font-size:11px;color:var(--text-secondary);margin-top:2px}

.section-heading{display:flex;justify-content:space-between;align-items:end;margin:24px 0 14px}
.section-heading h2{margin:0;font-size:18px}
.section-heading span,.subtitle{font-size:12px;color:var(--text-secondary)}

.playlist-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.playlist-header h2{margin:0}

.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 20px;color:var(--text-secondary)}
.empty-icon{display:grid;place-items:center;width:80px;height:80px;border-radius:24px;background:var(--surface-bg);box-shadow:var(--shadow-raised);color:var(--accent);margin-bottom:20px}
.empty-state h2{color:var(--text-primary);margin:0 0 8px}
.empty-state p{max-width:42ch;text-wrap:balance;font-size:13px;margin:0 0 24px}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:grid;place-items:center;z-index:100}
.modal{width:420px;padding:24px;border-radius:20px;background:var(--surface-bg);box-shadow:var(--shadow-raised);display:flex;flex-direction:column;gap:16px}
.modal h3{margin:0}
.neu-input{border:0;outline:0;color:var(--text-primary);padding:12px 16px;border-radius:14px;background:var(--surface-bg);box-shadow:var(--shadow-inset);font:inherit}
.modal-error{color:#ff8c66;font-size:12px;margin:0}
.modal-actions{display:flex;justify-content:flex-end;gap:10px}.loading-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
