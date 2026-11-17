<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { parseLrc, findActive, type LrcLine } from "../lib/lrc";
import { useLyricsStore } from "../stores/lyrics";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Play, Pause, Shuffle, ListPlus, Music, FolderPlus, Plus, Trash2, ArrowLeft } from "lucide-vue-next";
import TopBar from "./TopBar.vue";
import TrackTable from "./TrackTable.vue";
import AddToPlaylistPopover from "./AddToPlaylistPopover.vue";
import { useLibraryStore, type Track } from "../stores/library";
import { useNavStore } from "../stores/navigation";
import { usePlaylistStore } from "../stores/playlists";
import { usePlayerStore } from "../stores/player";
import { useUiStore } from "../stores/ui";

const PAGE_STEP = 3;
const ANCHOR = 0.22;
const CENTER = 0.40;
const library = useLibraryStore();
const nav = useNavStore();
const playlistsStore = usePlaylistStore();
const player = usePlayerStore();
const lyricsStore = useLyricsStore();
const ui = useUiStore();
const lyricsLines = ref<LrcLine[]>([]); const lyricsStep = ref(PAGE_STEP); const lyricGroups = ref<number[][]>([]); const npPlaylistAnchor = ref<HTMLElement | null>(null); const showNpPlaylist = ref(false); const lyricsLoading = ref(false); const lyricsError = ref(false); const activeLyrics = ref<number[]>([]); const lyricsScroll = ref<HTMLElement | null>(null); const manualLyricsScroll = ref(false); let lyricsRaf = 0; let ignoreLyricsScroll = false; let lastLyricsTime = -1; let resizeObserver: ResizeObserver | null = null;

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

function stopLyricsLoop() { cancelAnimationFrame(lyricsRaf); lyricsRaf = 0; }
function rebuildLyricGroups() { const groups: number[][] = []; lyricsLines.value.forEach((line, index) => { const last = groups[groups.length - 1]; if (last && lyricsLines.value[last[0]].time === line.time) last.push(index); else groups.push([index]); }); lyricGroups.value = groups; }
function measureLyrics() { const el = lyricsScroll.value; if (!el) return; const first = el.querySelector<HTMLElement>(".lrc-item"); const avg = first?.getBoundingClientRect().height || 40; lyricsStep.value = Math.max(1, Math.min(PAGE_STEP, Math.floor(el.clientHeight * (1 - ANCHOR) * .95 / avg))); el.style.paddingTop = `${el.clientHeight * (lyricsStep.value === 1 ? .4 : ANCHOR)}px`; el.style.paddingBottom = `${el.clientHeight * (lyricsStep.value === 1 ? .4 : 1 - ANCHOR)}px`; }
function centerLyrics(indices: number[], behavior: ScrollBehavior = "smooth") { const el = lyricsScroll.value; if (!el || !indices.length || manualLyricsScroll.value) return; const group = lyricGroups.value.findIndex(g => g.includes(indices[0])); const page = group < 0 ? 0 : Math.floor(group / lyricsStep.value); const first = lyricGroups.value[page]?.[0] ?? indices[0]; const node = el.querySelectorAll<HTMLElement>(".lrc-item")[first]; if (!node) return; ignoreLyricsScroll = true; el.scrollTo({ top: node.offsetTop - el.clientHeight * (lyricsStep.value === 1 ? CENTER : ANCHOR), behavior }); requestAnimationFrame(() => { ignoreLyricsScroll = false; }); }
function updateLyrics() { const time = player.getTime(); const active = findActive(lyricsLines.value, time); const activeKey = active.join(","); if (time !== lastLyricsTime) { lastLyricsTime = time; if (activeKey !== activeLyrics.value.join(",")) { const previous = activeLyrics.value[0] ?? -1; const oldGroup = lyricGroups.value.findIndex(g => g.includes(previous)); const newGroup = lyricGroups.value.findIndex(g => g.includes(active[0] ?? -1)); activeLyrics.value = active; if (lyricsStep.value === 1 || Math.floor(oldGroup / lyricsStep.value) !== Math.floor(newGroup / lyricsStep.value)) centerLyrics(active, "smooth"); } } const activeStart = active.length ? lyricsLines.value[active[0]].time : -1; const nextStart = active.length ? (lyricsLines.value.find(line => line.time > activeStart)?.time ?? activeStart + 4) : activeStart; const progress = activeStart >= 0 ? Math.max(0, Math.min(1, (time - activeStart) / Math.max(.6, (nextStart - activeStart) * .92))) : 0; const nodes = lyricsScroll.value?.querySelectorAll<HTMLElement>(".lrc-item") ?? []; nodes.forEach((item, index) => { const distance = active.length ? Math.min(8, Math.abs(index - active[0])) : 8; item.style.setProperty("--d", String(distance)); const text = item.querySelector<HTMLElement>(".txt"); if (text && active.includes(index)) text.style.setProperty("--p", `${progress}`); }); if (player.isPlaying || active.length) lyricsRaf = requestAnimationFrame(updateLyrics); else lyricsRaf = 0; }
function startLyricsLoop() { if (!lyricsRaf && player.isPlaying) lyricsRaf = requestAnimationFrame(updateLyrics); }
function onLyricsScroll() { if (ignoreLyricsScroll) return; manualLyricsScroll.value = true; window.setTimeout(() => { manualLyricsScroll.value = false; centerLyrics(activeLyrics.value, "auto"); }, 4000); }
async function loadLyrics(trackPath: string) { stopLyricsLoop(); lyricsLines.value = []; activeLyrics.value = []; lyricsLoading.value = true; lyricsError.value = false; try { const result = await lyricsStore.getLyrics(trackPath); if (result) lyricsLines.value = parseLrc(result.text).lines; rebuildLyricGroups(); } catch { lyricsError.value = true; } finally { lyricsLoading.value = false; await nextTick(); measureLyrics(); centerLyrics(activeLyrics.value, "auto"); startLyricsLoop(); } }
watch(() => [nav.view, player.current?.path] as const, ([view, path]) => { if (view === "nowplaying" && path) loadLyrics(path); else stopLyricsLoop(); }, { immediate: true });
watch(() => player.isPlaying, playing => playing ? startLyricsLoop() : stopLyricsLoop());
watch(() => player.currentTime, () => { if (!player.isPlaying) { activeLyrics.value = findActive(lyricsLines.value, player.getTime()); centerLyrics(activeLyrics.value, "auto"); } });
onMounted(() => { resizeObserver = new ResizeObserver(() => { measureLyrics(); centerLyrics(activeLyrics.value, "auto"); }); if (lyricsScroll.value) resizeObserver.observe(lyricsScroll.value); });
onUnmounted(() => { stopLyricsLoop(); resizeObserver?.disconnect(); });

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
    localStorage.setItem("spyce-library-folder", selected);
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
onMounted(() => {
  const savedFolder = localStorage.getItem("spyce-library-folder");
  if (savedFolder) library.folder = savedFolder;
  refresh();
});
</script>
<template>
  <div class="main-container" :class="{ scrolled }">
    <TopBar
      v-model:search="search"
      :has-folder="!!library.folder"
      :folder-name="folderDisplayName"
      :theme="theme"
      @choose-folder="chooseFolder"
      @refresh="refresh"
      @toggle-theme="emit('toggleTheme')"
      @import="showImport = true"
    />

    <div ref="mainScroll" class="main-scroll" @scroll.passive="handleScroll">
      <div class="content">
        <template v-if="nav.view === 'nowplaying'">
          <div class="np-page">
            <button class="back-link" @click="nav.back()"><ArrowLeft :size="16"/> Back</button>
            <section v-if="player.current" class="np-profile">
              <div class="np-cover"><img v-if="library.coverOf(player.current.path)" :src="library.coverOf(player.current.path)" alt=""/><span v-else>♪</span></div>
              <div class="np-details"><h1>{{ player.current.title }}</h1><p>{{ player.current.artist }}</p><small>{{ player.current.album }}</small><button ref="npPlaylistAnchor" class="np-add" aria-label="Add to playlist" @click="showNpPlaylist = true"><Plus :size="20"/></button></div>
            </section>
            <section v-if="player.current" class="np-lyrics"><div v-if="lyricsLoading" class="lyrics-skeleton"><i v-for="n in 4" :key="n"></i></div><div v-else-if="lyricsError" class="lyrics-state">Lirik tidak dapat dimuat</div><div v-else-if="!lyricsLines.length" class="lyrics-state">Lirik tidak ditemukan<small>Letakkan file .lrc dengan nama yang sama di folder lagu.</small></div><div v-else-if="lyricsLines.every(line => line.time < 0)" class="lyrics-state"><strong>Lirik tanpa sinkronisasi</strong><p>{{ lyricsLines.map(line => line.text).join(' ') }}</p></div><ul v-else ref="lyricsScroll" class="lyrics-list" @scroll.passive="onLyricsScroll"><li v-for="(line, index) in lyricsLines" :key="`${line.time}-${index}`" class="lrc-item" :style="{ '--i': index }"><button class="lyric-line" :class="{ active: activeLyrics.includes(index), spacer: !line.text }" :aria-current="activeLyrics.includes(index) ? 'true' : undefined" @click="line.time >= 0 && player.seek(line.time)" @keydown.enter.prevent="line.time >= 0 && player.seek(line.time)" @keydown.space.prevent="line.time >= 0 && player.seek(line.time)"><span class="txt">{{ line.text || (activeLyrics.includes(index) ? '♪' : '') }}</span></button></li></ul></section>
            <div v-else class="empty-state np-empty"><div class="empty-icon"><Music :size="42"/></div><h2>Belum ada lagu yang diputar</h2><button class="neu-button primary" @click="nav.go('songs')">Songs</button></div>
          </div>
          <AddToPlaylistPopover v-if="showNpPlaylist && player.current && npPlaylistAnchor" :track-path="player.current.path" :anchor="npPlaylistAnchor" @close="showNpPlaylist = false" />
        </template>
        <template v-else>
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
.main-container{container:main;display:flex;flex-direction:column;flex:1 1 0;min-width:0;min-height:0;height:100%;background:var(--surface-bg);--page-pad:32px;overflow:hidden;box-sizing:border-box}
.main-scroll{min-height:0;flex:1 1 auto;overflow-y:auto;margin-right:8px;padding:20px 24px 32px var(--page-pad);box-sizing:border-box;mask-image:linear-gradient(to bottom,transparent 0,#000 20px);-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 20px)}
.content{min-width:0;flex:1}.np-page{container:nowplaying;display:grid;grid-template-rows:auto auto minmax(0,1fr);height:100%;min-height:0;gap:16px;overflow:visible}.np-profile{display:flex;align-items:center;gap:24px;padding:24px;background:var(--surface-bg);box-shadow:var(--shadow-raised);border-radius:var(--radius-lg);min-width:0}.np-cover{width:clamp(112px,24vh,220px);aspect-ratio:1;display:grid;place-items:center;flex:none;border-radius:20px;background:var(--surface-deep);box-shadow:var(--shadow-inset);color:var(--accent);font-size:64px;overflow:hidden}.np-cover img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.np-details{position:relative;min-width:0;width:100%;justify-self:stretch}.np-details h1{margin:0;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.np-details p,.np-details small{display:block;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.np-add{margin-top:14px;width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:14px;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--text-secondary);cursor:pointer}.np-add:hover{color:var(--accent);box-shadow:var(--shadow-raised)}.np-add:active{box-shadow:var(--shadow-pressed)}.np-add:focus-visible{outline:2px solid rgba(255,106,0,.35);outline-offset:2px}.np-lyrics{--lrc-size:clamp(26px,5.4cqi,54px);--lrc-blur-step:.5px;--lrc-glow:14px;--lrc-pop:1.04;position:relative;min-height:0;overflow-y:auto;overscroll-behavior:contain;border-radius:20px;background:var(--surface-bg);box-shadow:var(--shadow-inset);padding:48px 24px;mask-image:linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent);-webkit-mask-image:linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent)}.lyrics-list{display:flex;flex-direction:column;gap:8px;max-width:720px;margin:0 auto;padding:0;list-style:none}.lrc-item{--d:0;animation:lrc-enter .5s ease both;animation-delay:calc(min(var(--i),12) * 40ms)}.lyric-line{width:100%;border:0;background:transparent;color:var(--text-primary);opacity:calc(1 - min(var(--d),4) * .17);filter:blur(calc(max(var(--d) - 1, 0) * var(--lrc-blur-step)));transform:scale(calc(1 - min(var(--d),3) * .02));transform-origin:left center;transition:opacity .4s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1),filter .4s ease,color .4s ease;font:inherit;font-size:var(--lrc-size);line-height:1.25;text-wrap:balance;overflow-wrap:anywhere;text-align:center;cursor:pointer;padding:8px 8% 8px 0;border-radius:12px}.lyric-line.active{opacity:1;transform:scale(var(--lrc-pop));color:var(--accent);filter:drop-shadow(0 0 var(--lrc-glow) rgba(255,106,0,.35));font-weight:700}.lyric-line:hover{opacity:.7}.txt{display:inline;background:linear-gradient(90deg,var(--accent) calc(var(--p,1) * 100% - 6%),var(--text-primary) calc(var(--p,1) * 100% + 6%));background-clip:text;-webkit-background-clip:text;color:transparent}.lyric-line:not(.active) .txt{color:inherit;background:none}.lrc-item:has(.spacer) .lyric-line{min-height:16px}.lrc-item:has(.spacer) .lyric-line.active{animation:lrc-breathe 3.2s ease-in-out infinite}.lrc-item:has(.spacer) .txt{color:var(--accent)}@keyframes lrc-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes lrc-breathe{50%{transform:scale(1.15)}}.lyric-line.spacer{min-height:16px;font-size:0;padding:4px}.lyric-line:focus-visible{outline:2px solid rgba(255,106,0,.35);box-shadow:var(--shadow-inset)}.lyrics-state{min-height:100%;display:grid;place-items:center;text-align:center;color:var(--text-secondary)}.lyrics-state small{display:block;max-width:42ch;margin-top:8px}.lyrics-state p{max-width:60ch;line-height:1.7}.lyrics-skeleton{max-width:600px;margin:0 auto}.lyrics-skeleton i{display:block;height:16px;margin:18px auto;border-radius:8px;background:var(--surface-light);box-shadow:var(--shadow-inset);opacity:.6}.lyrics-resume{position:sticky;top:8px;z-index:2;display:block;margin:0 auto 12px;border:0;border-radius:999px;padding:8px 14px;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--accent);cursor:pointer}.np-empty{min-height:360px}.main-container:has(.np-page) .main-scroll{overflow:hidden;padding:48px 52px 60px 60px}
.main-container:has(.np-page) .main-scroll{display:flex;flex-direction:column;overflow:hidden;padding:0 var(--page-pad) var(--page-pad)}
.np-page{flex:1 1 0;overflow:visible;contain:none}
.np-profile,.np-cover,.np-add,.back-link{overflow:visible;contain:none}
.np-lyrics{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden}.np-lyrics > .lyrics-list,.np-lyrics > .lyrics-skeleton{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;scrollbar-gutter:auto;padding-right:28px;box-sizing:border-box}.np-lyrics > .lyrics-list::-webkit-scrollbar,.np-lyrics > .lyrics-list::-webkit-scrollbar-corner,.np-lyrics > .lyrics-skeleton::-webkit-scrollbar,.np-lyrics > .lyrics-skeleton::-webkit-scrollbar-corner{display:none;width:0;height:0;background:transparent}
@media(prefers-reduced-motion:reduce){.lrc-item{animation:none}.lyric-line,.lyric-line.active{transition:none;transform:none;filter:none}.lyric-line.active{color:var(--accent);opacity:1}.txt{background:none;color:inherit}}
@container nowplaying (max-width:520px){.np-profile{flex-direction:column;text-align:center}.np-cover{width:112px}.np-details{width:100%}.np-details h1{max-width:100%}}

.detail-nav-row{margin-bottom:16px}
.back-link{background:transparent;border:0;color:var(--text-secondary);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:4px 0}
.back-link:hover{color:var(--accent)}

.hero{display:flex;align-items:center;gap:24px;min-width:0;padding:24px;border-radius:var(--radius-lg);background:var(--surface-bg);box-shadow:var(--shadow-raised);margin-bottom:28px}
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
