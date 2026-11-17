use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Clone)]
pub struct LyricsData {
    pub text: String,
    pub path: String,
    pub mtime: u64,
}

fn decode_lyrics(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let units: Vec<u16> = bytes[2..].chunks_exact(2).map(|c| u16::from_le_bytes([c[0], c[1]])).collect();
        return String::from_utf16_lossy(&units);
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        let units: Vec<u16> = bytes[2..].chunks_exact(2).map(|c| u16::from_be_bytes([c[0], c[1]])).collect();
        return String::from_utf16_lossy(&units);
    }
    let bytes = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
    String::from_utf8_lossy(bytes).into_owned()
}

#[tauri::command]
pub async fn get_lyrics(path: String) -> Result<Option<LyricsData>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let source = PathBuf::from(&path);
        let Some(parent) = source.parent() else { return Ok(None); };
        let Some(stem) = source.file_stem().and_then(|v| v.to_str()) else { return Ok(None); };
        let target_lower = format!("{}.lrc", stem).to_lowercase();
        let lyric_path = std::fs::read_dir(parent).ok()
            .and_then(|entries| entries.filter_map(Result::ok).map(|e| e.path()).find(|p| {
                p.file_name().and_then(|v| v.to_str()).map(|n| n.to_lowercase() == target_lower).unwrap_or(false)
            }));
        let Some(lyric_path) = lyric_path else { return Ok(None); };
        let metadata = std::fs::metadata(&lyric_path).map_err(|e| e.to_string())?;
        if metadata.len() > 2 * 1024 * 1024 { return Ok(None); }
        let bytes = std::fs::read(&lyric_path).map_err(|e| e.to_string())?;
        let mtime = metadata.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_millis() as u64).unwrap_or(0);
        Ok(Some(LyricsData { text: decode_lyrics(&bytes), path: lyric_path.to_string_lossy().into_owned(), mtime }))
    }).await.map_err(|e| e.to_string())?
}

#[allow(dead_code)]
fn _path(_: &Path) {}
