let context: AudioContext | undefined;
let audioEpoch = 0;
const voices = new Set<OscillatorNode>();
export const notes = ["C", "D", "E", "F", "G", "A", "B", "C"];
export const midi = [60, 62, 64, 65, 67, 69, 71, 72];
export async function tone(
  note: number,
  volume: number,
  duration = 0.45,
  delay = 0,
) {
  const currentEpoch = audioEpoch;
  context ??= new AudioContext();
  await context.resume();
  if (currentEpoch !== audioEpoch) return;
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  const when = context.currentTime + delay;
  oscillator.type = "triangle";
  oscillator.frequency.value = 440 * 2 ** ((midi[note] - 69) / 12);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(
    Math.max(0.001, volume * 0.35),
    when + 0.015,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
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
export async function playNotes(sequence: number[], volume: number) {
  stopAudio();
  await Promise.all(sequence.map((n, i) => tone(n, volume, 0.5, i * 0.6)));
}
