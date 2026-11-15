<script setup lang="ts">
import { Check, Music2 } from "lucide-vue-next";
import type { Playlist } from "../stores/playlists";
import type { Track } from "../stores/library";

defineProps<{ playlist: Playlist; trackPath: string; tracks: Track[]; saved: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <button class="playlist-row" role="option" :aria-selected="saved" @click="emit('toggle')">
    <div class="cover-well" :class="{ mosaic: tracks.length >= 4 }">
      <template v-if="tracks.length >= 4"><img v-for="track in tracks.slice(0, 4)" :key="track.path" :src="track.cover_art_b64 ? `data:image/jpeg;base64,${track.cover_art_b64}` : undefined" alt=""/></template>
      <img v-else-if="tracks[0]?.cover_art_b64" :src="`data:image/jpeg;base64,${tracks[0].cover_art_b64}`" alt=""/>
      <Music2 v-else :size="24"/>
    </div>
    <span class="playlist-copy"><strong>{{ playlist.name }}</strong><small>{{ playlist.trackPaths.length }} {{ playlist.trackPaths.length === 1 ? 'song' : 'songs' }}</small></span>
    <span class="check-control" :class="{ checked: saved }"><Check v-if="saved" :size="15"/></span>
  </button>
</template>
<style scoped>
.playlist-row{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:8px;border:0;border-radius:14px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer;transition:.15s}.playlist-row:hover{background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);transform:translateY(-1px)}.playlist-row:active{box-shadow:var(--shadow-pressed);transform:none}.playlist-row:focus-visible{outline:2px solid rgba(255,106,0,.35);outline-offset:2px}.cover-well{display:grid;place-items:center;width:48px;height:48px;flex:0 0 48px;overflow:hidden;border-radius:12px;background:var(--surface-deep);box-shadow:var(--shadow-inset);color:var(--accent)}.cover-well img{width:100%;height:100%;object-fit:cover}.cover-well.mosaic{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px}.cover-well.mosaic img{min-width:0;min-height:0}.playlist-copy{display:grid;min-width:0;flex:1}.playlist-copy strong,.playlist-copy small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.playlist-copy strong{font-size:13px}.playlist-copy small{font-size:11px;color:var(--text-secondary);margin-top:3px}.check-control{display:grid;place-items:center;width:24px;height:24px;flex:0 0 24px;border-radius:50%;box-shadow:var(--shadow-inset);color:transparent}.check-control.checked{background:linear-gradient(145deg,#ff8a33,#e55a00);box-shadow:0 0 12px rgba(255,106,0,.35),var(--shadow-raised-sm);color:#fff}
</style>
