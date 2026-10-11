import { useMemo, useRef, useState } from "react";
import { strike, unlockPiano } from "../games/piano";
import { Keyboard } from "./Keyboard";
import { Score } from "./Score";
import { useRecord, since } from "../activity/recorder";
import { melodyOf, noteName, notesOf, type Excerpt } from "./repertoire";
import type { usePlayer } from "./usePlayer";

type Player = ReturnType<typeof usePlayer>;

/** Play the tune on the keyboard; the piano waits for each note and can supply the accompaniment. */
export function PlayItYourself({
  piece,
  pieces,
  onPiece,
  player,
}: {
  piece: Excerpt;
  pieces: Excerpt[];
  onPiece: (p: Excerpt) => void;
  player: Player;
}) {
  const melody = useMemo(() => melodyOf(piece), [piece]);
  const accompaniment = useMemo(() => {
    const tune = new Set(melody.map((n) => `${n.at}:${n.midi}`));
    return notesOf(piece).filter((n) => !tune.has(`${n.at}:${n.midi}`));
  }, [piece, melody]);
  const [index, setIndex] = useState(0);
  const [showKey, setShowKey] = useState(true);
  const [accompany, setAccompany] = useState(true);
  const [pressed, setPressed] = useState<{ midi: number; right: boolean }>();
  const flash = useRef(0);
  const record = useRecord();
  const started = useRef(0);
  const misses = useRef(0);
  const done = index >= melody.length;
  const target = done ? undefined : melody[index];

  const low = Math.min(...melody.map((n) => n.midi));
  const high = Math.max(...melody.map((n) => n.midi));
  const from = low - (low % 12);
  const to = high + (11 - (high % 12)) + 1;

  async function press(midi: number) {
    const context = await unlockPiano();
    player.stop();
    const now = context.currentTime;
    const right = target !== undefined && midi === target.midi;
    const secondsPerBeat = 60 / piece.tempo;
    strike(
      midi,
      now,
      right ? Math.max(0.35, target!.beats * secondsPerBeat) : 0.5,
      82,
    );
    if (right && accompany) {
      const next = melody[index + 1]?.at ?? piece.beats;
      for (const n of accompaniment)
        if (n.at >= target!.at && n.at < next)
          strike(
            n.midi,
            now + (n.at - target!.at) * secondsPerBeat,
            n.beats * secondsPerBeat,
            Math.min(70, n.velocity),
          );
    }
    setPressed({ midi, right });
    clearTimeout(flash.current);
    flash.current = window.setTimeout(() => setPressed(undefined), 350);
    if (index === 0 && right) {
      started.current = Date.now();
      misses.current = 0;
    }
    if (!right && target) misses.current++;
    if (right) setIndex(index + 1);
    if (right && index + 1 === melody.length)
      record({
        activity: "play-it-yourself",
        item: piece.id,
        title: `${piece.title} — ${piece.composer}`,
        outcome: "solved",
        seconds: since(started.current || Date.now()),
        detail: { notes: melody.length, wrongNotes: misses.current, showKey, accompany },
      });
  }

  const others = pieces.filter((p) => p.id !== piece.id);

  return (
    <div className="piy">
      <div className="piy-head">
        <div>
          <h2>{piece.title}</h2>
          <p className="muted">
            {piece.composer} · play the top line; the piano follows you.
          </p>
        </div>
        <label>
          Choose a piece{" "}
          <select
            value={piece.id}
            onChange={(e) => {
              const p = pieces.find((x) => x.id === e.target.value);
              if (p) {
                onPiece(p);
                setIndex(0);
              }
            }}
          >
            <option value={piece.id}>{piece.title}</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.composer}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Score
        abc={piece.abc}
        tempo={piece.tempo}
        beat={player.playingId ? player.beat : target ? target.at + 0.01 : -1}
        label={`Score of ${piece.title}`}
      />
      <p className="piy-status" aria-live="polite">
        {done
          ? "You played the whole excerpt."
          : `Note ${index + 1} of ${melody.length}${showKey ? ` · ${noteName(target!.midi)}` : ""}`}
      </p>
      <Keyboard
        low={Math.max(21, from)}
        high={Math.min(108, to)}
        onPress={(m) => void press(m)}
        target={showKey ? target?.midi : undefined}
        pressed={pressed}
      />
      <div className="actions">
        <button
          onClick={() =>
            player.playingId
              ? player.stop()
              : void player.play(piece, { key: "piy" })
          }
        >
          {player.playingId ? "Stop" : "Hear it first"}
        </button>
        <button onClick={() => setIndex(0)}>
          {done ? "Play it again" : "Start over"}
        </button>
        <label className="check-label">
          <input
            type="checkbox"
            checked={showKey}
            onChange={(e) => setShowKey(e.target.checked)}
          />
          Show the next key
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={accompany}
            onChange={(e) => setAccompany(e.target.checked)}
          />
          Piano plays the rest
        </label>
      </div>
    </div>
  );
}
