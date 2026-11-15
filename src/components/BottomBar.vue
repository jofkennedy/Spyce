<template>
  <footer class="bottom-bar">
    <div class="now-playing"><span class="cover">S</span><span><strong>Nothing playing</strong><small>Select track to begin</small></span></div>
    <div class="controls"><button aria-label="Previous">|◀</button><button class="play" aria-label="Play">▶</button><button aria-label="Next">▶|</button></div>
    <div class="volume"><span>VOL</span><input type="range" min="0" max="100" value="80" /></div>
  </footer>
</template>

<style scoped>
.bottom-bar { position: fixed; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 28px; background: var(--surface-bg); box-shadow: 0 -8px 16px #1b1b1b; }
.now-playing { display: flex; align-items: center; gap: 12px; min-width: 230px; } .cover { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--surface-deep); box-shadow: var(--shadow-inset); color: var(--accent); font-weight: 700; } .now-playing span:last-child { display: grid; gap: 3px; } small { color: var(--text-secondary); }
.controls { display: flex; align-items: center; gap: 18px; } button { border: 0; background: transparent; cursor: pointer; color: var(--text-secondary); } .play { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--accent); color: white; box-shadow: var(--shadow-raised); }
.volume { display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 10px; letter-spacing: .1em; } input { accent-color: var(--accent); width: 100px; }
@media (max-width: 700px) { .volume { display: none; } .now-playing { min-width: 0; } .main-view { padding: 30px 20px 120px; } }
</style>
