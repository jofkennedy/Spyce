let context: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceAudio: HTMLAudioElement | null = null;

export function ensureGraph(audio: HTMLAudioElement) {
  if (analyser) return analyser;
  sourceAudio = audio;
  context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -20;
  source.connect(analyser);
  analyser.connect(context.destination);
  return analyser;
}

export function getAnalyser() { return analyser; }
export function resumeGraph() {
  if (context?.state === "suspended") return context.resume();
  return Promise.resolve();
}
export function getGraphAudio() { return sourceAudio; }
