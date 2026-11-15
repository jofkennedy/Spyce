<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Plus, Check, ListMusic } from "lucide-vue-next";
import { usePlaylistStore, type Playlist } from "../stores/playlists";

const props = defineProps<{ trackPath: string; anchor: HTMLElement }>();
const emit = defineEmits<{ close: [] }>();

const playlistsStore = usePlaylistStore();
const showNew = ref(false);
const newName = ref("");
const error = ref("");
const toast = ref<string | null>(null);

const popover = ref<HTMLElement | null>(null);

function position() {
  if (!popover.value || !props.anchor) return;
  const rect = props.anchor.getBoundingClientRect();
  popover.value.style.left = `${rect.left}px`;
  popover.value.style.top = `${rect.top + rect.height + 8}px`;
}

function toggleMembership(plId: string) {
  if (playlistsStore.hasTrack(plId, props.trackPath)) {
    playlistsStore.removeTrack(plId, props.trackPath);
    toast.value = "Removed";
  } else {
    playlistsStore.addTrack(plId, props.trackPath);
    toast.value = "Added";
  }
  setTimeout(() => toast.value = null, 1500);
}

function createPlaylist() {
  if (!newName.value.trim()) { error.value = "Required"; return; }
  if (playlistsStore.nameExists(newName.value)) { error.value = "Duplicate"; return; }
  playlistsStore.createPlaylist(newName.value).then((pl: Playlist) => {
    playlistsStore.addTrack(pl.id, props.trackPath);
    newName.value = "";
    showNew.value = false;
    toast.value = "Added";
    setTimeout(() => toast.value = null, 1500);
  });
}

function close(e: MouseEvent) {
  if (popover.value && !popover.value.contains(e.target as Node)) emit('close');
}

onMounted(() => {
  position();
  window.addEventListener('mousedown', close);
  window.addEventListener('keydown', (e) => { if(e.key === 'Escape') emit('close'); });
});
onUnmounted(() => {
  window.removeEventListener('mousedown', close);
});
</script>

<template>
  <Teleport to="body">
    <div ref="popover" class="popover neu-card">
      <div class="popover-header"><h3>Add to playlist</h3></div>
      <div v-if="toast" class="toast">{{ toast }}</div>
      <button v-if="!showNew" class="neu-button" @click="showNew = true"><Plus :size="16"/> New playlist</button>
      <div v-else class="new-pl-form">
        <input v-model="newName" class="neu-input" placeholder="Playlist name" @keyup.enter="createPlaylist" />
        <button class="neu-button primary" @click="createPlaylist">Create</button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="pl-list">
        <button v-for="pl in playlistsStore.playlists" :key="pl.id" class="pl-item" @click="toggleMembership(pl.id)">
          <ListMusic :size="16" />
          <span>{{ pl.name }}</span>
          <Check v-if="playlistsStore.hasTrack(pl.id, trackPath)" :size="16" class="check" />
        </button>
        <p v-if="!playlistsStore.playlists.length" class="empty">Belum ada playlist. Buat yang pertama di atas.</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popover{position:absolute;width:280px;z-index:100;padding:16px;background:var(--surface-bg);border-radius:20px;box-shadow:var(--shadow-raised)}
.popover-header h3{margin:0 0 12px;font-size:14px}
.neu-button{width:100%;border:0;padding:10px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:var(--surface-bg);box-shadow:var(--shadow-raised-sm);color:var(--text-primary)}
.neu-button:hover{color:var(--accent)}
.new-pl-form{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.neu-input{width:100%;padding:10px;border-radius:12px;border:0;background:var(--surface-bg);box-shadow:var(--shadow-inset);color:var(--text-primary)}
.pl-list{max-height:200px;overflow-y:auto;margin-top:12px;display:flex;flex-direction:column;gap:4px}
.pl-item{width:100%;padding:10px;border:0;background:transparent;border-radius:10px;display:flex;align-items:center;gap:10px;color:var(--text-secondary);cursor:pointer}
.pl-item:hover{background:var(--surface-light);color:var(--text-primary)}
.check{margin-left:auto;color:var(--accent)}
.toast{position:absolute;top:-40px;left:0;right:0;text-align:center;color:var(--accent);font-weight:600}
.error{color:red;font-size:11px;margin:0}
.empty{font-size:12px;color:var(--text-secondary);padding:10px;text-align:center}
</style>
