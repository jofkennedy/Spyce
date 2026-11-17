export interface LrcLine { time: number; text: string; }
export interface LrcMetadata { title?: string; artist?: string; album?: string; by?: string; offset: number; }
export interface ParsedLrc { lines: LrcLine[]; metadata: LrcMetadata; }

const timestamp = /\[(\d{1,3}):(\d{2})(?:(?:\.(\d{1,3}))|:(\d{1,2}))?\]/g;
const metadata = /^\[([a-z]+):([^\]]*)\]/i;

function timeFromMatch(match: RegExpExecArray): number {
  const minutes = Number(match[1]); const seconds = Number(match[2]);
  const fraction = match[3] ? Number(`0.${match[3]}`) : match[4] ? Number(match[4]) / 100 : 0;
  return minutes * 60 + seconds + fraction;
}

export function parseLrc(raw: string): ParsedLrc {
  const result: ParsedLrc = { lines: [], metadata: { offset: 0 } };
  for (const source of raw.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const meta = source.match(metadata);
    if (meta && !/^\d/.test(meta[1])) {
      const key = meta[1].toLowerCase();
      if (key === "offset") { const value = Number(meta[2].trim()); if (Number.isFinite(value)) result.metadata.offset = value; }
      else if (["ti", "ar", "al", "by"].includes(key)) result.metadata[key as "title" | "artist" | "album" | "by"] = meta[2].trim();
    }
    timestamp.lastIndex = 0;
    const times: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = timestamp.exec(source))) { const value = timeFromMatch(match); if (Number.isFinite(value)) times.push(value + result.metadata.offset / 1000); }
    const text = source.replace(timestamp, "").replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g, "").trim();
    if (times.length) for (const time of times) result.lines.push({ time, text });
    else if (source.trim() && !meta) result.lines.push({ time: -1, text: source.trim() });
  }
  result.lines.sort((a, b) => a.time - b.time);
  return result;
}

export function findActive(lines: LrcLine[], seconds: number): number[] {
  if (!lines.length || seconds < 0) return [];
  let low = 0; let high = lines.length - 1; let found = -1;
  while (low <= high) { const mid = (low + high) >> 1; if (lines[mid].time >= 0 && lines[mid].time <= seconds) { found = mid; low = mid + 1; } else high = mid - 1; }
  if (found < 0) return [];
  const time = lines[found].time; const start = found;
  while (start > 0 && lines[start - 1].time === time) found--;
  const result: number[] = []; for (let i = found; i < lines.length && lines[i].time === time; i++) result.push(i);
  return result;
}
