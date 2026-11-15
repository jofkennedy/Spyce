import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const queueOpen = ref(false);
  function toggleQueue() { queueOpen.value = !queueOpen.value; }
  function closeQueue() { queueOpen.value = false; }
  return { queueOpen, toggleQueue, closeQueue };
});
