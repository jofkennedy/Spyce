use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use lofty::tag::ItemKey;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
use walkdir::WalkDir;
mod lyrics;
mod discord;
use lyrics::get_lyrics;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackMeta {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub cover_art_b64: Option<String>,
    pub added_at: u64,
}

const AUDIO_EXTS: &[&str] = &["mp3", "flac", "wav", "ogg", "m4a"];

fn ext_is_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| AUDIO_EXTS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn file_added_at(path: &Path) -> u64 {
    std::fs::metadata(path).ok().and_then(|m| m.created().or_else(|_| m.modified()).ok()).and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0)
}

fn stem(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string()
}

fn read_meta(path: &Path) -> TrackMeta {
    let path_str = path.to_string_lossy().to_string();
    let fallback_title = stem(path);

    let Ok(tagged) = lofty::read_from_path(path) else {
        return TrackMeta {
            path: path_str,
            title: fallback_title,
            artist: String::from("Unknown Artist"),
            album: String::from("Unknown Album"),
            duration_secs: 0.0,
            cover_art_b64: None,
            added_at: file_added_at(path),
        };
    };

    let duration = tagged
        .properties()
        .duration()
        .as_secs_f64();

    let (title, artist, album, cover) = if let Some(tag) = tagged.primary_tag() {
        let cover = tag.pictures().first().map(|p| {
            use base64::Engine;
            base64::engine::general_purpose::STANDARD.encode(p.data())
        });
        (
            tag.title()
                .map(|s| s.to_string())
                .unwrap_or(fallback_title.clone()),
            tag.artist()
                .map(|s| s.to_string())
                .unwrap_or_else(|| String::from("Unknown Artist")),
            tag.album()
                .map(|s| s.to_string())
                .unwrap_or_else(|| String::from("Unknown Album")),
            cover,
        )
    } else {
        (
            fallback_title.clone(),
            String::from("Unknown Artist"),
            String::from("Unknown Album"),
            None,
        )
    };

    TrackMeta {
        path: path_str,
        title,
        artist,
        album,
        duration_secs: duration,
        cover_art_b64: cover,
        added_at: file_added_at(path),
    }
}

#[tauri::command]
fn update_track_metadata(path: String, title: Option<String>) -> Result<(), String> {
    let mut tagged = lofty::read_from_path(&path).map_err(|e| e.to_string())?;
    let tag = tagged.primary_tag_mut().ok_or("File has no writable metadata tag")?;
    if let Some(value) = title.filter(|value| !value.trim().is_empty()) {
        tag.insert_text(ItemKey::TrackTitle, value.trim().to_string());
    }
    tagged.save_to_path(&path, lofty::config::WriteOptions::default()).map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_folder(folder: String) -> Result<Vec<TrackMeta>, String> {
    let root = Path::new(&folder);
    if !root.is_dir() {
        return Err(format!("Not a directory: {folder}"));
    }

    let mut tracks = Vec::new();
    for entry in WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if ext_is_audio(path) {
            tracks.push(read_meta(path));
        }
    }

    Ok(tracks)
}

#[tauri::command]
fn ensure_tools(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("tools");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let yt = dir.join("yt-dlp.exe");
    let ffmpeg = dir.join("ffmpeg.exe");
    if !yt.exists() || !ffmpeg.exists() {
        let script = format!("$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '{}'; $z=Join-Path $env:TEMP 'spyce-ffmpeg.zip'; Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $z; Expand-Archive -Path $z -DestinationPath '{}' -Force; $f=Get-ChildItem '{}' -Filter ffmpeg.exe -Recurse | Select-Object -First 1; Copy-Item $f.FullName '{}' -Force; Remove-Item $z -Force", yt.display(), dir.display(), dir.display(), ffmpeg.display());
        let status = Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &script]).status().map_err(|e| e.to_string())?;
        if !status.success() || !yt.exists() || !ffmpeg.exists() { return Err(String::from("Unable to download yt-dlp and FFmpeg.")); }
    }
    Ok((yt, ffmpeg))
}

#[tauri::command]
fn download_youtube(app: tauri::AppHandle, url: String, folder: String) -> Result<String, String> {
    let (yt, ffmpeg) = ensure_tools(&app)?;
    let output = Command::new(yt)
        .args([
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "-o", "%(playlist_index|0)03d - %(title)s.%(ext)s",
            "--yes-playlist",
            "--restrict-filenames",
            "--ffmpeg-location", ffmpeg.to_str().ok_or("Invalid FFmpeg path")?,
            &url
        ])
        .current_dir(&folder)
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if output.status.success() {
        Ok(String::from("Download complete"))
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("yt-dlp error: {}", err))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(discord::start())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![scan_folder, download_youtube, update_track_metadata, get_lyrics, discord::update_presence, discord::clear_presence])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
