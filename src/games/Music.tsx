import { useEffect, useState } from "react";
import { notes, playNotes, tone, stopAudio } from "./audio";
import type { GameProps } from "./types";
export interface MusicData {
  mode: "piano" | "phrase" | "match" | "rhythm";
  notes: number[];
  title: string;
  solved: boolean;
}
const phrase = [0, 1, 2, 3];
function Staff({ sequence }: { sequence: number[] }) {
  return (
    <svg
      className="staff"
      viewBox="0 0 380 110"
      role="img"
      aria-label={`Treble staff, middle C to high C. Notes: ${sequence.map((n) => notes[n]).join(", ")}`}
    >
      {[28, 40, 52, 64, 76].map((y) => (
        <line
          key={y}
          x1="12"
          y1={y}
          x2="370"
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
      {sequence.map((n, i) => (
        <g key={i}>
          {n === 0 && (
            <line
              x1={38 + i * 62}
              x2={62 + i * 62}
              y1="88"
              y2="88"
              stroke="currentColor"
              strokeWidth="1"
            />
          )}
          <ellipse
            cx={50 + i * 62}
            cy={88 - n * 6}
            rx="8"
            ry="6"
            transform={`rotate(-18 ${50 + i * 62} ${88 - n * 6})`}
            fill="currentColor"
          />
          <line
            x1={57 + i * 62}
            x2={57 + i * 62}
            y1={88 - n * 6}
            y2={55 - n * 6}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={50 + i * 62}
            y="106"
            textAnchor="middle"
            fontSize="13"
            fill="currentColor"
          >
            {notes[n]}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function Music({
  draft,
  update,
  finish,
  create,
  sound,
  volume,
}: GameProps & { sound: boolean; volume: number }) {
  const d = draft.data as MusicData;
  const [message, setMessage] = useState(""),
    [showNotes, setShowNotes] = useState(true),
    [taps, setTaps] = useState<number[]>([]);
  useEffect(() => () => stopAudio(), []);
  const play = (seq: number[]) => {
    if (!sound) {
      setMessage(
        "Sound is off. You can follow the notes visually, or turn sound on in Settings.",
      );
      return;
    }
    playNotes(seq, volume).catch(() =>
      setMessage(
        "Sound could not start. Try Play again after checking your device volume.",
      ),
    );
  };
  function press(n: number) {
    if (sound)
      tone(n, volume).catch(() =>
        setMessage("Check your device volume, then try again."),
      );
    if (d.mode === "piano") update({ ...d, notes: [...d.notes, n].slice(-64) });
    else if (d.mode === "phrase") {
      if (n === 3) {
        update({ ...d, solved: true });
        finish("completed");
        setMessage("F continues the step-by-step pattern.");
      } else
        setMessage(
          "Listen or look again. The notes move up one step at a time.",
        );
    }
  }
  function mode(m: MusicData["mode"]) {
    stopAudio();
    update(
      { mode: m, notes: [], title: "My melody", solved: false },
      { mode: m },
    );
    setMessage("");
    setTaps([]);
  }
  return (
    <>
      <div className="tabs" aria-label="Music activities">
        {(["piano", "phrase", "match", "rhythm"] as const).map((m) => (
          <button key={m} aria-pressed={d.mode === m} onClick={() => mode(m)}>
            {
              {
                piano: "Free piano",
                phrase: "Complete the phrase",
                match: "Match the melody",
                rhythm: "Rhythm echo",
              }[m]
            }
          </button>
        ))}
      </div>
      <p>
        {d.mode === "piano"
          ? "Explore the keyboard and save a melody to your collection."
          : d.mode === "phrase"
            ? "C, D, E… which note continues this ascending phrase?"
            : d.mode === "match"
              ? "Listen as often as you like. Which pattern matches?"
              : "Listen to four evenly spaced beats, then tap four beats at your own comfortable pace."}
      </p>
      {d.mode !== "rhythm" && (
        <>
          <button
            onClick={() => setShowNotes(!showNotes)}
            aria-pressed={showNotes}
          >
            Notation {showNotes ? "shown" : "hidden"}
          </button>
          {showNotes && (
            <Staff
              sequence={
                d.mode === "piano"
                  ? d.notes.slice(-5)
                  : d.mode === "match"
                    ? [0, 2, 4, 2]
                    : phrase.slice(0, 3)
              }
            />
          )}
        </>
      )}
      <div className="actions">
        <button
          className="primary"
          onClick={() =>
            play(
              d.mode === "piano"
                ? d.notes
                : d.mode === "phrase"
                  ? phrase.slice(0, 3)
                  : d.mode === "match"
                    ? [0, 2, 4, 2]
                    : [0, 0, 0, 0],
            )
          }
          disabled={d.mode === "piano" && !d.notes.length}
        >
          Play / replay
        </button>
        <button onClick={stopAudio}>Stop sound</button>
      </div>
      {(d.mode === "piano" || d.mode === "phrase") && (
        <div className="piano" role="group" aria-label="Piano keyboard">
          {notes.map((n, i) => (
            <button
              key={i}
              onClick={() => press(i)}
              aria-label={`Play ${n}${i === 7 ? " high" : ""}`}
            >
              <span>{n}</span>
            </button>
          ))}
        </div>
      )}
      {d.mode === "piano" && (
        <>
          <p className="muted">
            {d.notes.length
              ? `${d.notes.length} notes recorded. Last notes: ${d.notes
                  .slice(-8)
                  .map((n) => notes[n])
                  .join(" · ")}`
              : "Your notes will appear here."}
          </p>
          <label>
            Melody name{" "}
            <input
              maxLength={80}
              value={d.title}
              onChange={(e) => update({ ...d, title: e.target.value })}
            />
          </label>
          <div className="actions">
            <button
              disabled={!d.notes.length}
              onClick={() => {
                create({
                  kind: "melody",
                  title: d.title.trim() || "My melody",
                  notes: d.notes,
                });
                setMessage("Your melody is saved in My Creations.");
              }}
            >
              Save melody
            </button>
            <button
              disabled={!d.notes.length}
              onClick={() =>
                update({ ...d, notes: d.notes.slice(0, -1) }, { undo: true })
              }
            >
              Undo note
            </button>
            <button onClick={() => update({ ...d, notes: [] })}>
              Clear keyboard recording
            </button>
          </div>
        </>
      )}
      {d.mode === "match" && (
        <div className="match-choices">
          {[
            [0, 2, 4, 2],
            [4, 2, 0, 2],
          ].map((seq, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === 0) {
                  update({ ...d, solved: true });
                  finish("completed");
                  setMessage("That is the matching melody.");
                } else
                  setMessage(
                    "Try hearing the phrase again. It starts low, rises, then comes back a little.",
                  );
              }}
            >
              <Staff sequence={seq} />
              <span>Pattern {i + 1}</span>
            </button>
          ))}
        </div>
      )}
      {d.mode === "rhythm" && (
        <>
          <div className="beats" aria-label="Four evenly spaced beats">
            ● &nbsp; ● &nbsp; ● &nbsp; ●
          </div>
          <button
            className="tap-button"
            onClick={() => {
              const next = [...taps, performance.now()];
              if (sound) tone(0, volume, 0.12).catch(() => undefined);
              setTaps(next);
              if (next.length === 4) {
                const gaps = next.slice(1).map((t, i) => t - next[i]);
                const mean = gaps.reduce((a, b) => a + b, 0) / 3;
                setMessage(
                  gaps.every(
                    (g) => Math.abs(g - mean) <= Math.max(250, mean * 0.5),
                  )
                    ? "You tapped four beats with a steady rhythm."
                    : "You tapped four beats. You can explore another rhythm whenever you like.",
                );
                finish("explored");
              } else setMessage(`${next.length} of 4 beats tapped.`);
            }}
            disabled={taps.length >= 4}
          >
            Tap a beat
          </button>
          <button
            onClick={() => {
              setTaps([]);
              setMessage("");
            }}
          >
            Try again
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </>
  );
}
