import { findActive, parseLrc } from "./lrc";

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function runLrcTests() {
  const parsed = parseLrc("[ti:Demo]\n[ar:Artist]\n[00:01.2][00:02:50]<00:01.20>Hello\n[00:03.000]\n[bad]ignored");
  expect(parsed.metadata.title === "Demo", "title metadata");
  expect(parsed.lines.some(line => line.time === 1.2 && line.text === "Hello"), "fraction timestamp");
  expect(parsed.lines.some(line => line.time === 2.5), "colon fraction timestamp");
  expect(parsed.lines.some(line => line.time === 3 && line.text === ""), "empty timestamp line");
  expect(findActive(parsed.lines, 1.5).length === 1, "active binary search");
  const bilingual = parseLrc("[00:01]One\n[00:01]一");
  expect(findActive(bilingual.lines, 1).length === 2, "same-time bilingual lines");
  const offset = parseLrc("[offset:-500]\n[00:02]Delayed");
  expect(offset.lines[0]?.time === 1.5, "negative offset");
  const unsynced = parseLrc("plain text\n[xx:bad]");
  expect(unsynced.lines.every(line => line.time === -1), "unsynced text");
}
