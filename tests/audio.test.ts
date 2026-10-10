import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
});
function audioStub(resume = async () => {}) {
  const voices: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    frequency: { value: number };
  }[] = [];
  const constructor = vi.fn();
  const gains: { setTargetAtTime: ReturnType<typeof vi.fn> }[] = [];
  class FakeAudioContext {
    currentTime = 10;
    destination = {};
    resume = resume;
    constructor() {
      constructor();
    }
    createOscillator() {
      const voice = {
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: "",
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
      };
      voices.push(voice);
      return voice;
    }
    createGain() {
      const target = vi.fn();
      gains.push({ setTargetAtTime: target });
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
          setTargetAtTime: target,
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return { voices, constructor, gains };
}
it("audio schedules slower nonuniform rhythm offsets and zero volume creates no audio context", async () => {
  vi.resetModules();
  const { voices, constructor, gains } = audioStub();
  const { tone, playNotes, stopAudio, setAudioVolume } =
    await import("../src/games/audio");
  await tone(0, 0);
  expect(constructor).not.toHaveBeenCalled();
  await playNotes([0, 0, 0, 0], 0.25, 0.95, [0, 1, 3, 4]);
  expect(voices.map((v) => v.start.mock.calls[0][0])).toEqual([
    10, 10.95, 12.85, 13.8,
  ]);
  expect(voices[0].frequency.value).toBeCloseTo(261.625565, 5);
  setAudioVolume(0.73);
  expect(gains[0].setTargetAtTime).toHaveBeenLastCalledWith(0.73, 10, 0.02);
  setAudioVolume(0);
  expect(gains[0].setTargetAtTime).toHaveBeenLastCalledWith(0, 10, 0.02);
  stopAudio();
  expect(voices.every((v) => v.stop.mock.calls.length === 2)).toBe(true);
});
it("Stop cancels notes waiting for audio unlock before any oscillator is created", async () => {
  vi.resetModules();
  let unlock: () => void = () => {};
  const pending = new Promise<void>((r) => {
    unlock = r;
  });
  const { voices } = audioStub(() => pending);
  const { tone, stopAudio } = await import("../src/games/audio");
  const playing = tone(0, 0.25);
  stopAudio();
  unlock();
  await playing;
  expect(voices).toHaveLength(0);
});
