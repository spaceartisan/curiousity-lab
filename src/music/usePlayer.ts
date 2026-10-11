import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadPiano,
  perform,
  setPianoVolume,
  unlockPiano,
  type Performance,
  type ScheduledNote,
} from "../games/piano";
import { notesOf, type Excerpt } from "./repertoire";

/** Plays excerpts on the sampled piano and reports the sounding beat for score highlighting. */
export function usePlayer(volume: number, sound: boolean) {
  const current = useRef<Performance | null>(null);
  const frame = useRef(0);
  const [beat, setBeat] = useState(-1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ready, setReady] = useState<"loading" | "piano" | "fallback">(
    "loading",
  );

  useEffect(() => {
    let live = true;
    loadPiano().then((ok) => live && setReady(ok ? "piano" : "fallback"));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => setPianoVolume(sound ? volume : 0), [volume, sound]);

  const stop = useCallback(() => {
    current.current?.stop();
    current.current = null;
    cancelAnimationFrame(frame.current);
    setBeat(-1);
    setPlayingId(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (
      excerpt: Excerpt,
      options: { rate?: number; notes?: ScheduledNote[]; key?: string } = {},
    ) => {
      stop();
      await unlockPiano();
      if (!sound) return;
      const performance = perform(options.notes ?? notesOf(excerpt), {
        tempo: excerpt.tempo,
        rate: options.rate,
        pedal: excerpt.pedal,
        totalBeats: excerpt.beats,
      });
      current.current = performance;
      const key = options.key ?? excerpt.id;
      setPlayingId(key);
      const tick = () => {
        if (current.current !== performance) return;
        setBeat(performance.beat());
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
      await performance.done;
      if (current.current === performance) {
        current.current = null;
        cancelAnimationFrame(frame.current);
        setBeat(-1);
        setPlayingId(null);
      }
    },
    [sound, stop],
  );

  return { play, stop, beat, playingId, ready };
}
