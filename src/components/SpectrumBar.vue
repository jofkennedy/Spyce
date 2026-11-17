<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePlayerStore } from "../stores/player";
import { getAnalyser } from "../audio/graph";

const player = usePlayerStore();
const { isPlaying } = storeToRefs(player);
const host = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const visible = ref(false);
const BAR_W = 6; const GAP = 4;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let raf = 0; let last = 0; let w = 0; let h = 0; let dpr = 1; let bars = new Float32Array(0); let ranges: Array<[number, number]> = []; let data: Uint8Array<ArrayBufferLike> | null = null; let gradient: CanvasGradient | null = null; let ro: ResizeObserver | null = null;
function layout() { if (!host.value || !canvas.value) return; dpr = Math.min(window.devicePixelRatio || 1, 2); w = host.value.clientWidth; h = host.value.clientHeight; canvas.value.width = Math.round(w * dpr); canvas.value.height = Math.round(h * dpr); bars = new Float32Array(Math.max(24, Math.floor(w / (BAR_W + GAP)))); ranges = []; gradient = null; }
function buildRanges(n: number) { const an = getAnalyser(); if (!an) return; const binHz = an.context.sampleRate / an.fftSize; const minHz = 40; const maxHz = Math.min(16000, an.context.sampleRate / 2); ranges = []; for (let i = 0; i < n; i++) { const f0 = minHz * Math.pow(maxHz / minHz, i / n); const f1 = minHz * Math.pow(maxHz / minHz, (i + 1) / n); const b0 = Math.floor(f0 / binHz); ranges.push([b0, Math.max(b0 + 1, Math.ceil(f1 / binHz))]); } }
function frame(t: number) { const an = getAnalyser(); if (!an || !canvas.value || !bars.length) { raf = 0; return; } const dt = Math.min((t - last) / 1000, .05) || .016; last = t; if (ranges.length !== bars.length) buildRanges(bars.length); if (!data || data.length !== an.frequencyBinCount) data = new Uint8Array(new ArrayBuffer(an.frequencyBinCount)); if (isPlaying.value) an.getByteFrequencyData(data as Uint8Array<ArrayBuffer>); else data.fill(0); const attack = 1 - Math.exp(-dt * 28); const release = 1 - Math.exp(-dt * 5); let peak = 0; for (let i = 0; i < bars.length; i++) { const [b0,b1] = ranges[i]; let sum = 0; for (let b = b0; b < b1; b++) sum += data[b]; const target = Math.min(1, (sum / (b1 - b0) / 255) * (.75 + i / bars.length * .6)); bars[i] += (target - bars[i]) * (target > bars[i] ? attack : release); if (bars[i] > peak) peak = bars[i]; } draw(); if (isPlaying.value || peak > .01) raf = requestAnimationFrame(frame); else raf = 0; }
function draw() { const g = canvas.value?.getContext("2d"); if (!g || !canvas.value) return; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h); const maxH = h * .5; if (!gradient) { gradient = g.createLinearGradient(0,h,0,h-maxH); gradient.addColorStop(0,"rgba(255,106,0,.55)"); gradient.addColorStop(1,"rgba(255,138,51,.06)"); } g.fillStyle = gradient; const x0 = (w - (bars.length * BAR_W + (bars.length - 1) * GAP)) / 2; g.beginPath(); for (let i=0;i<bars.length;i++) { const bh=Math.max(2,bars[i]*maxH); g.roundRect(x0+i*(BAR_W+GAP),h-bh,BAR_W,bh,[BAR_W/2,BAR_W/2,0,0]); } g.fill(); }
watch(isPlaying, playing => { visible.value = playing; if (playing && !raf && !reduceMotion) { last = performance.now(); raf = requestAnimationFrame(frame); } });
onMounted(() => { layout(); ro = new ResizeObserver(layout); if (host.value) ro.observe(host.value); }); onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); });
</script>
<template><div ref="host" class="spectrum" :class="{ on: visible }" aria-hidden="true"><canvas ref="canvas"/></div></template>
<style scoped>.spectrum{position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .5s ease;-webkit-mask-image:linear-gradient(to top,#000 0%,#000 55%,transparent 100%);mask-image:linear-gradient(to top,#000 0%,#000 55%,transparent 100%)}.spectrum.on{opacity:1}.spectrum canvas{display:block;width:100%;height:100%}@media(prefers-reduced-motion:reduce){.spectrum{display:none}}</style>
