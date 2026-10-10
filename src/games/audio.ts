let context: AudioContext | undefined;
let master: GainNode | undefined;
let audioEpoch = 0;
const voices = new Set<OscillatorNode>();
export const notes = ["C", "D", "E", "F", "G", "A", "B", "C"];
export const midi = [60, 62, 64, 65, 67, 69, 71, 72];
export function setAudioVolume(volume: number) {
  if (!context || !master) return;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(
    Math.max(0, Math.min(1, volume)),
    context.currentTime,
    0.02,
  );
}
export async function tone(
  note: number,
  volume: number,
  duration = 0.45,
  delay = 0,
) {
  if (volume <= 0) {
    setAudioVolume(0);
    return;
  }
  const currentEpoch = audioEpoch;
  context ??= new AudioContext();
  if (!master) {
    master = context.createGain();
    master.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      context.currentTime,
    );
    master.connect(context.destination);
  }
  setAudioVolume(volume);
  await context.resume();
  if (currentEpoch !== audioEpoch) return;
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  const when = context.currentTime + delay;
  oscillator.type = "triangle";
  oscillator.frequency.value = 440 * 2 ** ((midi[note] - 69) / 12);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.35, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.05);
  voices.add(oscillator);
  oscillator.onended = () => {
    voices.delete(oscillator);
    oscillator.disconnect();
    gain.disconnect();
  };
}
export function stopAudio() {
  audioEpoch++;
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      /* already stopped */
    }
  }
  voices.clear();
}
export async function playNotes(
  sequence: number[],
  volume: number,
  step = 0.6,
  offsets?: number[],
) {
  stopAudio();
  await Promise.all(
    sequence.map((n, i) =>
      tone(n, volume, Math.min(0.5, step * 0.8), (offsets?.[i] ?? i) * step),
    ),
  );
}
