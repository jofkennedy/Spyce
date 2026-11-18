import type { Track } from "../stores/library";
export type SortKey = "none" | "title" | "artist" | "added";
export type SortDir = "asc" | "desc";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
function normalize(value: string) { return value.replace(/^[^\p{L}\p{N}]+/u, "").trim(); }
function unknown(value: string) { return !value.trim() || value === "Unknown Artist"; }
export function sortTracks(tracks: Track[], key: SortKey, dir: SortDir): Track[] {
  if (key === "none") return [...tracks];
  const prepared = tracks.map((track, index) => ({ track, index, title: normalize(track.title), artist: normalize(track.artist), album: normalize(track.album), unknown: unknown(track.artist), added: track.added_at ?? 0 }));
  prepared.sort((a, b) => {
    let result = 0;
    if (key === "added") result = a.added - b.added;
    else if (key === "artist") result = a.unknown !== b.unknown ? (a.unknown ? 1 : -1) : collator.compare(a.artist, b.artist) || collator.compare(a.album, b.album) || collator.compare(a.title, b.title);
    else result = collator.compare(a.title, b.title) || collator.compare(a.artist, b.artist);
    if (result === 0) result = a.index - b.index;
    return (key === "added" ? (dir === "asc" ? -result : result) : (dir === "asc" ? result : -result));
  });
  return prepared.map(entry => entry.track);
}
