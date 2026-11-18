<div align="center">

# Spyce

### Pemutar musik desktop lokal dengan tampilan neomorphism

<sub>Dibangun dengan Tauri · Vue · Rust</sub>

![Versi](https://img.shields.io/badge/versi-0.3.0-ff6a00?style=for-the-badge)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-2b2b2b?style=for-the-badge&logo=windows&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-Vue%20%2B%20Rust-2b2b2b?style=for-the-badge&logo=tauri&logoColor=ff6a00)

<!-- Tempel screenshot di sini: seret gambar ke kolom deskripsi, GitHub akan membuatkan link-nya -->

</div>

---

## Yang baru di v0.3.0

<table>
<tr>
<td width="33%" valign="top">

### Lirik tersinkronisasi
Dukungan file `.lrc` dengan timestamp, offset, lirik bilingual, karaoke sweep, auto-scroll, dan mode lirik tanpa sinkronisasi.

</td>
<td width="33%" valign="top">

### Queue lebih lengkap
Queue manual dengan **Add to queue**, **Play next**, hapus lagu, drag-and-drop reorder, konteks playlist/library, dan panel queue responsif.

</td>
<td width="33%" valign="top">

### Player lebih responsif
Audio spectrum visualizer oranye, Now Playing page, kontrol player yang lebih lengkap, dan layout responsif untuk berbagai ukuran layar.

</td>
</tr>
</table>

---

## Fitur lengkap

### Library
- Scan folder musik secara rekursif
- Refresh library dari folder terakhir tanpa memilih ulang folder
- Pembacaan metadata audio dan cover art
- Format: `MP3` `FLAC` `WAV` `OGG` `OPUS` `M4A` `AAC`
- Search berdasarkan judul, artis, dan album
- Tampilan **Songs**, **Artists**, **Albums**, dan **Playlists**
- Edit judul lagu langsung dari library lewat ikon pensil
- Judul panjang otomatis memakai ellipsis agar layout tetap rapi
- Cover art tampil pada track table dan Now Playing jika tersedia

### Pemutar
- Play/pause, next, previous, seek, volume, mute, shuffle, dan repeat
- Audio spectrum visualizer oranye di now-playing bar
- Now Playing page dengan cover, metadata, dan panel lirik
- Lirik aktif berwarna orange dengan karaoke sweep
- Dukungan klik baris lirik untuk seek
- Dukungan keyboard untuk kontrol player
- Dukungan Windows media session
- Tema gelap dan terang
- Layout responsif untuk berbagai ukuran layar dan display scaling

### Queue & Playlist
- Queue manual: **Add to queue**, **Play next**, hapus lagu, dan drag-and-drop reorder
- Queue dipisahkan dari context library, album, artist, atau playlist
- Panel queue memakai kolom ketiga pada layar lebar dan tetap responsif pada ukuran kecil
- Add to playlist lewat popover dengan pencarian dan staged changes
- Playlist tersimpan otomatis menggunakan Tauri Store
- Playlist mendukung `updatedAt` dan migrasi data lama
- Navigation history dengan back/forward

### Impor YouTube
- Impor video atau playlist YouTube sebagai MP3 ke folder musik
- File playlist diberi nomor urut dan disimpan ke folder musik terpilih
- `yt-dlp` dan `FFmpeg` diunduh otomatis saat pertama kali dipakai
- Library otomatis scan ulang setelah proses selesai

> [!WARNING]
> Gunakan fitur download hanya untuk konten yang kamu miliki atau yang kamu punya izin untuk mengunduhnya.

---

## Shortcut keyboard

| Tombol | Fungsi |
|:---:|---|
| <kbd>Space</kbd> | Play / pause |
| <kbd>Ctrl</kbd> + <kbd>→</kbd> | Lagu berikutnya |
| <kbd>Ctrl</kbd> + <kbd>←</kbd> | Lagu sebelumnya |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume naik / turun |
| <kbd>ArrowLeft</kbd> / <kbd>ArrowRight</kbd> | Seek 5 detik saat player aktif |

---

## Cara pakai

<details>
<summary><b>Klik untuk melihat langkah-langkahnya</b></summary>

1. Jalankan **Spyce**.
2. Klik **Choose folder** untuk memilih folder musik pertama kali.
3. Spyce menyimpan folder terakhir dan akan menggunakannya saat aplikasi dibuka kembali.
4. Klik **Refresh** untuk memeriksa lagu baru atau perubahan metadata di folder tersebut.
5. Klik nomor atau baris lagu untuk memutar.
6. Gunakan kontrol di bawah untuk play/pause, seek, volume, shuffle, dan repeat.
7. Klik tombol **+** pada lagu untuk menambahkannya ke playlist.
8. Gunakan tombol **queue** untuk menambahkan lagu ke antrean.
9. Klik cover atau judul lagu di player bar untuk membuka **Now Playing**.
10. **Lirik:** letakkan file `.lrc` dengan nama yang sama di folder lagu, misalnya `Contoh.mp3` dan `Contoh.lrc`.
11. **Impor YouTube:** klik **Import**, tempel URL video atau playlist, lalu klik **Import** lagi. Hasil MP3 disimpan di folder musik yang dipilih.
12. **Ubah judul lagu:** arahkan kursor ke lagu, lalu klik ikon pensil.

</details>

---

## Persyaratan

- Windows 10 atau 11
- Internet hanya dibutuhkan saat pertama kali memakai fitur impor YouTube untuk mengunduh `yt-dlp` dan FFmpeg
- Folder musik harus bisa dibaca oleh aplikasi

> [!NOTE]
> Installer belum resmi, jadi Windows bisa menampilkan peringatan **"Windows protected your PC"**. Klik **More info → Run anyway** untuk melanjutkan.

---

## Belum tersedia

<sub>Equalizer · Visualizer lanjutan · Media keys khusus · System tray · Mini player · SQLite library cache/background scan</sub>

---

<div align="center">

Terima kasih sudah mencoba Spyce

</div>
