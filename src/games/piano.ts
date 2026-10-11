// Sampled grand piano (Salamander Grand Piano V3, Alexander Holm, CC BY 3.0).
// Samples sit every minor third from A0 to C8; nearby notes are pitch-shifted.
const SAMPLE_NAMES = ["C", "Ds", "Fs", "A"];
const SAMPLE_OFFSETS = [0, 3, 6, 9];
export const PIANO_SAMPLES: { file: string; midi: number }[] = [];
for (let octave = 0; octave <= 8; octave++)
  SAMPLE_NAMES.forEach((name, i) => {
    const midi = 12 * (octave + 1) + SAMPLE_OFFSETS[i];
    if (midi >= 21 && midi <= 108)
      PIANO_SAMPLES.push({ file: `${name}${octave}.mp3`, midi });
  });

export interface ScheduledNote {
  /** Start, in beats from the beginning of the excerpt. */
  at: number;
  /** Length in beats. */
  beats: number;
  midi: number;
  /** MIDI velocity 1–127. */
  velocity: number;
  staff: number;
}

let context: AudioContext | undefined;
let master: GainNode | undefined;
let volume = 0.6;
const buffers = new Map<number, AudioBuffer>();
const live = new Set<{ source: AudioScheduledSourceNode; gain: GainNode }>();

export function pianoContext() {
  if (!context) {
    // Let iPhone/iPad play even with the ring/silent switch set to silent.
    const session = (navigator as { audioSession?: { type: string } })
      .audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
        /* older Safari */
      }
    }
    context = new AudioContext({ latencyHint: "interactive" });
    master = context.createGain();
    master.gain.value = volume;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.ratio.value = 3;
    master.connect(compressor);
    compressor.connect(context.destination);
  }
  return { context, master: master! };
}

export function setPianoVolume(next: number) {
  volume = Math.max(0, Math.min(1, next));
  if (context && master)
    master.gain.setTargetAtTime(volume, context.currentTime, 0.02);
}

export function pianoReady() {
  return buffers.size === PIANO_SAMPLES.length;
}

const bytes = new Map<number, ArrayBuffer>();
let fetching: Promise<boolean> | undefined;
let decoding: Promise<boolean> | undefined;

/**
 * Download the samples once (no audio is created yet, so nothing can sound before a tap).
 * Resolves false if they can't load; a soft tone is used instead.
 */
export function loadPiano(base = import.meta.env.BASE_URL + "media/piano/") {
  fetching ??= (async () => {
    const results = await Promise.allSettled(
      PIANO_SAMPLES.map(async ({ file, midi }) => {
        const response = await fetch(base + file);
        if (!response.ok) throw new Error(file);
        bytes.set(midi, await response.arrayBuffer());
      }),
    );
    return results.every((r) => r.status === "fulfilled");
  })();
  return fetching;
}

function decodePiano(context: AudioContext) {
  decoding ??= (async () => {
    await loadPiano();
    await Promise.allSettled(
      [...bytes].map(async ([midi, data]) =>
        buffers.set(midi, await context.decodeAudioData(data)),
      ),
    );
    return pianoReady();
  })();
  return decoding;
}

/** Must be called from a tap/click so iOS allows sound. Also prepares the piano samples. */
export async function unlockPiano() {
  const { context } = pianoContext();
  if (context.state !== "running") await context.resume();
  await decodePiano(context);
  return context;
}

function nearestSample(midi: number) {
  let best = PIANO_SAMPLES[0].midi;
  for (const { midi: m } of PIANO_SAMPLES)
    if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  return best;
}

/** Play one note at an absolute AudioContext time. Returns the time its sound ends. */
export function strike(
  midi: number,
  when: number,
  seconds: number,
  velocity = 80,
): number {
  const { context, master } = pianoContext();
  const level = 0.15 + 0.85 * Math.pow(Math.max(1, velocity) / 127, 1.6);
  const gain = context.createGain();
  const release = midi < 48 ? 0.5 : midi < 72 ? 0.35 : 0.25;
  const end = when + Math.max(0.08, seconds);
  const sample = buffers.get(nearestSample(midi));
  let source: AudioScheduledSourceNode;
  if (sample) {
    const node = context.createBufferSource();
    node.buffer = sample;
    node.playbackRate.value = 2 ** ((midi - nearestSample(midi)) / 12);
    source = node;
    gain.gain.setValueAtTime(level, when);
  } else {
    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    source = osc;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level * 0.35, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(level * 0.12, when + 0.6);
  }
  gain.gain.setValueAtTime(sample ? level : level * 0.12, end);
  gain.gain.setTargetAtTime(0, end, release / 4);
  source.connect(gain);
  gain.connect(master);
  source.start(when);
  source.stop(end + release * 2);
  const voice = { source, gain };
  live.add(voice);
  source.onended = () => {
    live.delete(voice);
    source.disconnect();
    gain.disconnect();
  };
  return end + release;
}

export function silencePiano() {
  if (!context) return;
  const now = context.currentTime;
  for (const { source, gain } of live) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.03);
    try {
      source.stop(now + 0.2);
    } catch {
      /* already stopped */
    }
  }
  live.clear();
}

export interface Performance {
  /** Seconds since the start, adjusted for playback speed, in beats. */
  beat(): number;
  stop(): void;
  done: Promise<void>;
  totalBeats: number;
}

/**
 * Schedule an excerpt. The sustain pedal holds notes until it lifts.
 * `rate` 1 = written tempo; 0.75 = slower without changing pitch.
 */
export function perform(
  notes: ScheduledNote[],
  options: {
    tempo: number;
    rate?: number;
    pedal?: [number, number][];
    totalBeats: number;
    fromBeat?: number;
  },
): Performance {
  const { context } = pianoContext();
  const rate = options.rate ?? 1;
  const secondsPerBeat = 60 / (options.tempo * rate);
  const from = options.fromBeat ?? 0;
  const start = context.currentTime + 0.08;
  const pedal = options.pedal ?? [];
  const releaseAt = (beat: number) => {
    // If the pedal is down when the key lifts, hold until it comes up.
    let down = false;
    let lift = beat;
    for (const [at, state] of pedal) {
      if (at > beat) {
        if (down && state === 0) {
          lift = at;
          break;
        }
        continue;
      }
      down = state === 1;
    }
    return down ? Math.max(beat, lift) : beat;
  };
  for (const note of notes) {
    if (note.at < from) continue;
    const when = start + (note.at - from) * secondsPerBeat;
    const off = releaseAt(note.at + note.beats);
    strike(note.midi, when, (off - note.at) * secondsPerBeat, note.velocity);
  }
  let stopped = false;
  let finish: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  const length = (options.totalBeats - from) * secondsPerBeat;
  const timer = setTimeout(() => finish(), (length + 0.4) * 1000);
  return {
    totalBeats: options.totalBeats,
    beat: () =>
      stopped ? -1 : from + (context.currentTime - start) / secondsPerBeat,
    stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      silencePiano();
      finish();
    },
    done,
  };
}
