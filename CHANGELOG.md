# Changelog

Semua perubahan signifikan pada project Spyce dicatat di dokumen ini.

## [Unreleased]

### Added
- **Layout Spotify-like dengan Neomorphism**: Grid 3 kolom (sidebar 240px, main panel, optional queue panel), bottom player bar penuh.
- **Sidebar navigasi**: Back/Forward chevron, Library menu (Songs, Artists, Albums, Playlists), daftar playlist, toggle tema.
- **Top Bar**: Search inset dengan filter real-time, folder pill, tombol Import YouTube, toggle tema (Sun/Moon).
- **Player Store (Pinia)**: Audio engine tunggal dengan HTML5 `<audio>`, state `isPlaying`, `queue`, `userQueue`, `contextName`, `shuffle`, `repeat`, `volume`, `muted`, `currentTime`, `duration`.
- **Playlist Store**: CRUD playlist via Tauri Store plugin + localStorage fallback, migrasi `updatedAt` default ke `createdAt`.
- **Navigation Store**: History stack `view` + `param`, back/forward dengan disabled state.
- **UI Store**: Single source of truth untuk `queueOpen` antara bottom bar dan hero buttons.
- **Add-to-playlist Popover**: Teleport ke body, search inline, form pembuatan playlist baru, staged changes dengan Done/Cancel/Esc.
- **Queue Panel**: Drag reorder, remove per item, section "Now playing", "Next in queue", "Next from context".
- **YouTube Import**: Command Rust `download_youtube` menggunakan `yt-dlp` dengan output MP3 ke folder musik terpilih, support playlist (bukan single video).
- **Track Table**: Hover action buttons (add to queue, add to playlist), double-click play, row highlight, context menu kanan.
- **Theme Toggle**: Dark/Light mode persisten ke localStorage, CSS variables berubah dinamis.

### Changed
- **App.vue**: Struktur grid utama, integrasi store, keyboard shortcuts global.
- **MainView.vue**: Multi-view routing (songs, artists, albums, playlists, detail pages), hero sections, empty states.
- **Sidebar.vue**: Ikon berbeda per nav item (`Music2`, `Mic2`, `Disc3`, `ListMusic`), panel playlist scrollable.
- **TrackTable.vue**: Kolom duration right-aligned, hover actions, toast notification.
- **tokens.css**: Token lengkap (--surface-bg, --shadow-raised, --accent, dll), scrollbar custom, focus styles.

### Fixed
- **Navigation 2-klik**: Perbaikan event handling pada sidebar nav items.
- **Popover positioning**: Teleport ke body, computed bounding rect, flip upward saat overflow.
- **Queue panel layout**: Grid ketiga kolom pada lebar >1100px, fixed drawer pada layar kecil.
- **Scroll mask**: Fade gradient di atas konten main panel.
- **Search focus ring**: Outline hanya pada wrapper `.search`, bukan input.

### Removed
- Tombol like/heart dari player bar (diganti Plus/add-to-playlist).
- Sidebar lama (Stacked cards) digantikan Sidebar modern.
- Hero stats tiles (Tracks, Albums, Artists, Duration) — diganti subtitle di title area.

## [Unreleased] - Perubahan Hari Ini

### Added
- Audio spectrum visualizer oranye di dalam now-playing bar dengan `AnalyserNode`, ResizeObserver, DPR-aware canvas, smoothing attack/release, dan reduced-motion support.
- Lazy download `yt-dlp.exe` dan FFmpeg saat fitur YouTube pertama kali digunakan.
- Editor judul lagu menggunakan metadata `lofty`.
- Logo `spyce-logo.svg` di top bar dan source icon aplikasi baru.
- UI responsive untuk track table, top bar, sidebar, player bar, queue panel, dan long-title ellipsis.

### Changed
- Tombol Queue hero dan bottom bar memakai satu state Pinia `ui.queueOpen`.
- Tombol Queue playlist detail hanya membuka/menutup queue panel.
- Tombol play pada hero dan nomor baris lagu dapat memutar/menjeda lagu.
- Tombol Shuffle hero memulai playback track acak.
- Tombol expand player dihapus.
- Tombol edit track memakai dialog neomorphism yang di-Teleport ke `body` agar tidak terpotong.
- Download YouTube sekarang mendukung playlist dan menyimpan MP3 ke folder musik terpilih.
- Tombol bottom player menggunakan gaya neomorphism dan kontrol queue yang konsisten.

### Fixed
- Popover edit track tidak lagi terpotong oleh track table atau playlist pendek.
- Scrollbar main panel berada di dalam panel dengan spacing dan kontras yang benar.
- Top bar tidak lagi memperlihatkan konten yang menembus saat scroll.
- Sidebar, main panel, queue panel, dan bottom player tetap memenuhi layout pada berbagai ukuran window.
- Track table menjaga alignment kolom, ellipsis judul panjang, dan action column tetap stabil saat hover.
- Kontrol player tetap clickable saat spectrum aktif; spectrum tidak menangkap pointer event.
- Search focus ring tampil pada wrapper, bukan outline kotak pada input.
- Cover image upload dihapus; fitur edit judul lagu tetap dipertahankan.

### Verification
- `npm run build` pass.
- `cargo check` pass.
- Cache library SQLite dan background auto-scan dibatalkan, tidak termasuk perubahan release ini.

## [0.1.0] - Awal Pengembangan

### Added
- Scaffold Tauri v2 + Vue 3 + TypeScript + Vite.
- Struktur dasar components (`App.vue`, `Sidebar.vue`, `MainView.vue`, `BottomBar.vue`).
- Store Pinia awal untuk library dan player.
- Neomorphism design tokens dasar.

---

## Technical Notes

### Dependencies
- `lucide-vue-next`: Icon set konsisten.
- `@tauri-apps/plugin-dialog`, `plugin-fs`, `plugin-store`: File system dan persistence.
- Rust: `lofty` (metadata audio), `walkdir` (recursive scan), `yt-dlp` (external command).

### Architecture Decisions
- Semua state UI terpusat di Pinia stores (navigation, player, playlists, ui).
- Player store menginisialisasi satu instance `Audio()` dan dikelola lifecycle-nya.
- Queue terpisah menjadi `userQueue` (manual) vs context-based `queue`.
- Theme disimpan di `localStorage` dan diterapkan ke `documentElement.dataset.theme`.

### Known Limitations
- Playlist belum memiliki fitur rename/drag reordering.
- Rating bintang belum diimplementasi.
- Visualizer/equalizer masih dalam backlog.
