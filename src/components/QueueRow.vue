<script setup lang="ts">
import { X, GripVertical } from "lucide-vue-next";
import type { Track } from "../stores/library";
defineProps<{ track: Track | null; index?: number }>();
const emit = defineEmits<{ play: []; remove: []; move: [from:number,to:number] }>();
let from = -1;
</script>
<template><div v-if="track" class="queue-row" draggable="true" @dragstart="from = index ?? -1" @dragover.prevent @drop="from >= 0 && index !== undefined && emit('move',from,index)" @click="emit('play')"><GripVertical :size="14" class="grip"/><span><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></span><button v-if="index !== undefined" class="remove" aria-label="Remove from queue" @click.stop="emit('remove')"><X :size="14"/></button></div></template>
<style scoped>.queue-row{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:0;background:transparent;color:var(--text-primary);text-align:left;border-radius:12px;cursor:pointer}.queue-row:hover{background:var(--surface-bg);box-shadow:var(--shadow-raised-sm)}.queue-row>span{display:grid;min-width:0;flex:1}.queue-row strong,.queue-row small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.queue-row strong{font-size:12px}.queue-row small{font-size:10px;color:var(--text-secondary)}.grip{color:var(--text-secondary)}.remove{border:0;background:transparent;color:var(--text-secondary);cursor:pointer;padding:5px;border-radius:50%}.remove:hover{color:var(--accent);box-shadow:var(--shadow-raised-sm)}
</style>
