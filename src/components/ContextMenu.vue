<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
const props = defineProps<{ items: { label: string; action: () => void }[]; x: number; y: number }>();
const emit = defineEmits<{ close: [] }>();
const menu = ref<HTMLElement | null>(null);

function close(e: MouseEvent) {
  if (menu.value && !menu.value.contains(e.target as Node)) emit("close");
}

onMounted(() => {
  window.addEventListener("mousedown", close);
  window.addEventListener("keydown", (e) => { if(e.key === 'Escape') emit("close"); });
});
onUnmounted(() => {
  window.removeEventListener("mousedown", close);
});
</script>
<template>
  <Teleport to="body">
    <div ref="menu" class="menu neu-card" :style="{ left: `${x}px`, top: `${y}px` }">
      <button v-for="item in items" :key="item.label" @click="item.action(); emit('close')">{{ item.label }}</button>
    </div>
  </Teleport>
</template>
<style scoped>
.menu{position:fixed;z-index:200;padding:8px;background:var(--surface-bg);border-radius:12px;box-shadow:var(--shadow-raised);display:flex;flex-direction:column}
.menu button{border:0;background:transparent;text-align:left;padding:10px 16px;border-radius:8px;color:var(--text-primary);cursor:pointer}
.menu button:hover{background:var(--surface-light);color:var(--accent)}
</style>
