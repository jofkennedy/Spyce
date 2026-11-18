use discord_presence::{models::ActivityType, Client};
use std::sync::Mutex;
use tauri::State;

const CLIENT_ID: u64 = 1572513697757270097;
pub struct DiscordState(pub Mutex<Option<Client>>);

pub fn start() -> DiscordState {
    let mut client = Client::new(CLIENT_ID);
    client.start();
    DiscordState(Mutex::new(Some(client)))
}

#[tauri::command]
pub fn update_presence(state: State<'_, DiscordState>, title: String, artist: String, playing: bool) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(client) = guard.as_mut() {
        client.set_activity(|activity| activity
            .details(if title.is_empty() { "Spyce" } else { &title })
            .state(if playing { artist.as_str() } else { "Paused" })
            .activity_type(ActivityType::Listening))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn clear_presence(state: State<'_, DiscordState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(client) = guard.as_mut() { client.clear_activity().map_err(|e| e.to_string())?; }
    Ok(())
}
