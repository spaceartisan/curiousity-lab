import { useEffect, useRef, useState } from "react";
import { notes, playNotes, tone, stopAudio, setAudioVolume } from "./audio";
import {
  phraseExercises,
  melodyExercises,
  rhythmExercises,
  rhythmFeedback,
  melodyTier,
  melodyPool,
  phraseTier,
  phrasePool,
  musicTaskMode,
  type MelodyTier,
  type MusicMode,
} from "../content/music";
import type { GameProps } from "./types";
export interface MusicData {
  mode: MusicMode;
  notes: number[];
  title: string;
  solved: boolean;
  exercise?: number;
  presentation?: "staff" | "pattern" | "ear";
  tempo?: "comfortable" | "slow";
  taps?: number;
  flexibility?: "gentle" | "extra";
}
const noteName = (n: number) => `${notes[n]}${n === 7 ? "5" : "4"}`;
function Staff({
  sequence,
  active = -1,
}: {
  sequence: number[];
  active?: number;
}) {
  const x = (i: number) => 52 + i * 62;
  return (
    <svg
      className="staff"
      viewBox="0 0 380 120"
      role="img"
      aria-label={`Treble staff, middle C to high C. Notes: ${sequence.map(noteName).join(", ") || "none yet"}`}
    >
      <text x="12" y="14" fontSize="12" fill="currentColor">
        Treble · C4–C5
      </text>
      {[28, 40, 52, 64, 76].map((y) => (
        <line key={y} x1="12" y1={y} x2="370" y2={y} stroke="currentColor" />
      ))}
      {sequence.map((n, i) => (
        <g key={i} className={active === i ? "playing-note" : ""}>
          {active === i && (
            <rect
              x={x(i) - 18}
              y="20"
              width="36"
              height="78"
              rx="5"
              className="note-highlight"
            />
          )}
          {n === 0 && (
            <line
              x1={x(i) - 12}
              x2={x(i) + 12}
              y1="88"
              y2="88"
              stroke="currentColor"
            />
          )}
          <ellipse
            cx={x(i)}
            cy={88 - n * 6}
            rx="8"
            ry="6"
            transform={`rotate(-18 ${x(i)} ${88 - n * 6})`}
            fill="currentColor"
          />
          <line
            x1={x(i) + (n >= 6 ? -7 : 7)}
            x2={x(i) + (n >= 6 ? -7 : 7)}
            y1={88 - n * 6}
            y2={88 - n * 6 + (n >= 6 ? 33 : -33)}
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x={x(i)}
            y="112"
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
          >
            {noteName(n)}
          </text>
        </g>
      ))}
    </svg>
  );
}
function NotePattern({
  sequence,
  active = -1,
}: {
  sequence: number[];
  active?: number;
}) {
  return (
    <div
      className="note-pattern"
      role="img"
      aria-label={`Note pattern: ${sequence.map(noteName).join(", ") || "none yet"}`}
    >
      {sequence.map((n, i) => (
        <div
          className={
            active === i ? "pattern-note playing-note" : "pattern-note"
          }
          key={i}
        >
          <span
            className="music-bar"
            style={{ height: `${20 + n * 7}px` }}
            aria-hidden="true"
          />
          <span>{noteName(n)}</span>
        </div>
      ))}
    </div>
  );
}
function RhythmPattern({
  beats,
  description,
  active,
}: {
  beats: number[];
  description: string;
  active: number;
}) {
  return (
    <svg
      className="rhythm-pattern"
      viewBox="0 0 380 90"
      role="img"
      aria-label={description}
    >
      <line x1="25" x2="355" y1="35" y2="35" stroke="currentColor" />
      {beats.map((beat, i) => {
        const x = 25 + (beat / Math.max(3, beats.at(-1)!)) * 330;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy="35"
              r={active === i ? 14 : 9}
              fill="currentColor"
            />
            <text
              x={x}
              y="75"
              textAnchor="middle"
              fontSize="18"
              fill="currentColor"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function Music({
  draft,
  update,
  finish,
  create,
  replay,
  repeat,
  sound,
  volume,
  onSoundChange,
  onVolumeChange,
}: GameProps & {
  sound: boolean;
  volume: number;
  onSoundChange: (value: boolean) => void;
  onVolumeChange: (value: number) => void;
}) {
  const d = draft.data as MusicData;
  const index = d.exercise ?? 0;
  const phrase = phraseExercises[index % phraseExercises.length];
  const melody = melodyExercises[index % melodyExercises.length];
  const rhythm = rhythmExercises[index % rhythmExercises.length];
  const presentation = d.presentation ?? "staff";
  const [message, setMessage] = useState(""),
    [active, setActive] = useState(-1),
    [source, setSource] = useState<"target" | number>("target");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playbackEpoch = useRef(0);
  const tapLock = useRef(false);
  const tapTimes = useRef<number[]>([]);
  function cancelPlayback(clear = true) {
    playbackEpoch.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopAudio();
    if (clear) setActive(-1);
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancelPlayback();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      cancelPlayback(false);
    };
  }, []);
  useEffect(() => {
    if (!sound) stopAudio();
  }, [sound]);
  useEffect(() => {
    setAudioVolume(volume);
  }, [volume]);
  const target =
    d.mode === "piano"
      ? d.notes
      : d.mode === "phrase"
        ? phrase.heard
        : d.mode === "match"
          ? melody.target
          : [0, 0, 0, 0];
  function play(
    sequence: number[],
    offsets?: number[],
    playingSource: "target" | number = "target",
  ) {
    cancelPlayback();
    if (!sound && presentation === "ear" && d.mode !== "rhythm") {
      setMessage(
        "Sound is off. Choose Staff or Note pattern, or turn sound on here.",
      );
      return;
    }
    const epoch = playbackEpoch.current;
    const step = d.tempo === "slow" ? 0.95 : 0.6;
    setSource(playingSource);
    setMessage(
      sound
        ? "Playing. You can listen again whenever you like."
        : "Playing the visual pattern. Sound is off.",
    );
    // Reduced motion keeps a static readable pattern.
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      sequence.forEach((_, i) => {
        timers.current.push(
          setTimeout(
            () => {
              if (playbackEpoch.current === epoch) setActive(i);
            },
            (offsets?.[i] ?? i) * step * 1000,
          ),
        );
      });
    timers.current.push(
      setTimeout(
        () => {
          if (playbackEpoch.current === epoch) {
            setActive(-1);
            setMessage("Playback finished. Replay whenever you like.");
          }
        },
        ((offsets?.at(-1) ?? sequence.length - 1) * step + 0.6) * 1000,
      ),
    );
    if (sound)
      playNotes(sequence, volume, step, offsets).catch(() => {
        if (playbackEpoch.current === epoch) {
          cancelPlayback();
          setMessage(
            "Sound could not start. Try Play again after checking your device volume, or choose a visual view.",
          );
        }
      });
  }
  function previewNote(n: number) {
    cancelPlayback();
    const epoch = playbackEpoch.current;
    if (sound)
      tone(n, volume).catch(() => {
        if (epoch === playbackEpoch.current)
          setMessage(
            "Sound could not start. Check your device volume or continue visually.",
          );
      });
  }
  function press(n: number) {
    previewNote(n);
    if (d.mode === "piano") update({ ...d, notes: [...d.notes, n].slice(-64) });
    else if (d.mode === "phrase" && !d.solved) {
      if (n === phrase.next) {
        update({ ...d, solved: true });
        finish("completed");
        setMessage(
          phraseTier(index) === "Challenging"
            ? `${noteName(n)} completes the stated pattern.`
            : `${noteName(n)} continues this pattern. Try it again or explore another phrase.`,
        );
      } else
        setMessage(
          phraseTier(index) === "Challenging"
            ? "That note doesn't continue the stated pattern."
            : "Try the pattern again, or use Hint to see the next note.",
        );
    }
  }
  function mode(next: MusicMode) {
    if (next === d.mode) return;
    cancelPlayback();
    // Keep the free-piano recording when exploring another mode.
    update(
      { ...d, mode: next, exercise: 0, solved: false, taps: 0 },
      { mode: musicTaskMode({ mode: next, exercise: 0 }) },
    );
  }
  function changeMelodyTier(tier: MelodyTier) {
    if (
      tier === (d.mode === "phrase" ? phraseTier(index) : melodyTier(index)) ||
      !window.confirm(
        d.mode === "phrase"
          ? "Start a fresh phrase? Your current exercise will be replaced."
          : "Start a fresh melody? Your current exercise will be replaced.",
      )
    )
      return;
    cancelPlayback();
    const exercise = (
      d.mode === "phrase" ? phrasePool(tier) : melodyPool(tier)
    )[0];
    const data = { ...d, exercise, solved: false, taps: 0 };
    update(data, { mode: musicTaskMode(data) });
    setMessage("");
  }
  function view(next: MusicData["presentation"]) {
    cancelPlayback();
    update({ ...d, presentation: next }, { view: true });
    setMessage("");
  }
  const showSequence = (seq: number[], playing = -1) =>
    presentation === "staff" ? (
      <Staff sequence={seq} active={playing} />
    ) : presentation === "pattern" ? (
      <NotePattern sequence={seq} active={playing} />
    ) : null;
  const taps = d.taps ?? 0;
  return (
    <>
      <div className="music-controls">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => {
              if (!e.target.checked) stopAudio();
              onSoundChange(e.target.checked);
            }}
          />
          Sound
        </label>
        <label className="music-volume">
          Volume{" "}
          <input
            aria-label="Music volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
          />
        </label>
      </div>
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
      {(d.mode === "match" || d.mode === "phrase") && (
        <label className="melody-challenge">
          Challenge{" "}
          <select
            aria-label={
              d.mode === "phrase"
                ? "Phrase challenge"
                : "Melody matching challenge"
            }
            value={d.mode === "phrase" ? phraseTier(index) : melodyTier(index)}
            onChange={(e) => changeMelodyTier(e.target.value as MelodyTier)}
          >
            <option>Classic</option>
            <option>Challenging</option>
          </select>
        </label>
      )}
      <h2>
        {d.mode === "piano"
          ? "Your piano"
          : d.mode === "phrase"
            ? phrase.title
            : d.mode === "match"
              ? melody.title
              : rhythm.title}
      </h2>
      <p>
        {d.mode === "piano"
          ? "Explore the keyboard and save a melody to your collection."
          : d.mode === "phrase"
            ? phrase.rule
            : d.mode === "match"
              ? "Play the target phrase, then choose its matching pattern. You can hear either choice before selecting it."
              : `${rhythm.description} Listen or watch, then tap four beats at your own pace. There is no timing score.`}
      </p>
      {d.mode === "phrase" && (
        <>
          <p>
            Phrase {phrasePool(phraseTier(index)).indexOf(index) + 1} of{" "}
            {phrasePool(phraseTier(index)).length}
          </p>
          <details>
            <summary>Phrase controls & help</summary>
            <p>
              A keyboard step means one adjacent white key in C4–C5, rather than
              a semitone. Interleaved lines alternate notes from two sequences.
              Choose the next note on the keyboard. Staff and Note pattern show
              the phrase; By ear hides the visual sequence. Playback and hints
              are available on request. On small screens, scroll the keyboard
              sideways to reach all keys. Another phrase stays in the chosen
              collection; Try this exercise again repeats the same phrase.
            </p>
          </details>
        </>
      )}
      {d.mode === "match" && (
        <>
          <p>
            Melody {melodyPool(melodyTier(index)).indexOf(index) + 1} of{" "}
            {melodyPool(melodyTier(index)).length}
          </p>
          <details>
            <summary>Matching controls & help</summary>
            <p>
              Play the target and either choice as often as you like. Staff and
              Note pattern show the notes; By ear hides them. Sound starts only
              when you choose playback. Hint reveals a difference only when
              requested. Try this exercise again repeats the same melody;
              Another melody stays in the chosen collection.
            </p>
          </details>
        </>
      )}
      {d.mode !== "rhythm" && (
        <div className="actions" aria-label="Music presentation">
          {(["staff", "pattern", "ear"] as const).map((p) => (
            <button
              key={p}
              aria-pressed={presentation === p}
              onClick={() => view(p)}
            >
              {{ staff: "Staff", pattern: "Note pattern", ear: "By ear" }[p]}
            </button>
          ))}
        </div>
      )}
      <div className="actions" aria-label="Playback pace">
        <span>Playback pace</span>
        <button
          aria-pressed={d.tempo !== "slow"}
          onClick={() => {
            cancelPlayback();
            update({ ...d, tempo: "comfortable" }, { view: true });
          }}
        >
          Comfortable
        </button>
        <button
          aria-pressed={d.tempo === "slow"}
          onClick={() => {
            cancelPlayback();
            update({ ...d, tempo: "slow" }, { view: true });
          }}
        >
          Slower
        </button>
      </div>
      {d.mode === "rhythm" ? (
        <RhythmPattern
          beats={rhythm.beats}
          description={rhythm.description}
          active={active}
        />
      ) : (
        showSequence(
          d.mode === "piano" ? d.notes.slice(-5) : target,
          source === "target"
            ? d.mode === "piano"
              ? active - Math.max(0, d.notes.length - 5)
              : active
            : -1,
        )
      )}
      {presentation === "ear" && !sound && d.mode !== "rhythm" && (
        <p className="muted">
          Sound is off. Turn it on above, or choose Staff or Note pattern.
        </p>
      )}
      <div className="actions">
        <button
          className="primary"
          disabled={!target.length}
          onClick={() =>
            play(target, d.mode === "rhythm" ? rhythm.beats : undefined)
          }
        >
          Play / replay
        </button>
        <button
          onClick={() => {
            cancelPlayback();
            setMessage("Playback stopped.");
          }}
        >
          Stop sound
        </button>
        {d.mode === "phrase" && (
          <button
            disabled={d.solved}
            onClick={() => {
              setMessage(phrase.hint);
              update(d, { hint: true });
            }}
          >
            Hint
          </button>
        )}
        {d.mode === "match" && (
          <button
            disabled={d.solved}
            onClick={() => {
              const different = melody.target.findIndex(
                (n, i) => n !== melody.other[i],
              );
              setMessage(
                `Compare note ${different + 1}. The target has ${noteName(melody.target[different])} at that position.`,
              );
              update(d, { hint: true });
            }}
          >
            Hint
          </button>
        )}
      </div>
      {(d.mode === "piano" || d.mode === "phrase") && (
        <>
          {d.mode === "piano" && (
            <p className="muted">
              The keyboard runs from middle C to the next C. On a small screen,
              slide it sideways to reach all keys.
            </p>
          )}
          <div className="piano-scroll">
            <div className="piano" role="group" aria-label="Piano keyboard">
              {notes.map((n, i) => (
                <button
                  key={i}
                  onClick={() => press(i)}
                  aria-label={`Play ${n}${i === 7 ? " high" : ""}`}
                >
                  <span>
                    {n}
                    <small>{i === 7 ? "5" : "4"}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {d.mode === "piano" && (
        <>
          <p className="muted">
            {d.notes.length
              ? `${d.notes.length} notes recorded. Last notes: ${d.notes.slice(-8).map(noteName).join(" · ")}`
              : "Your notes will appear here."}
          </p>
          <label>
            Melody name{" "}
            <input
              maxLength={80}
              value={d.title}
              onChange={(e) =>
                update({ ...d, title: e.target.value }, { view: true })
              }
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
            <button
              onClick={() => {
                cancelPlayback();
                update({ ...d, notes: [] });
              }}
            >
              Clear keyboard recording
            </button>
          </div>
        </>
      )}
      {d.mode === "match" && (
        <div className="match-choices">
          {(melody.correct === 0
            ? [melody.target, melody.other]
            : [melody.other, melody.target]
          ).map((seq, i) => (
            <div className="melody-choice" key={i}>
              <h3>Pattern {i + 1}</h3>
              {showSequence(seq, source === i ? active : -1)}
              <div className="actions">
                <button onClick={() => play(seq, undefined, i)}>
                  Hear pattern {i + 1}
                </button>
                <button
                  disabled={d.solved}
                  onClick={() => {
                    cancelPlayback();
                    if (i === melody.correct) {
                      update({ ...d, solved: true });
                      finish("completed");
                      setMessage(
                        "That is the matching melody. Replay it or explore another.",
                      );
                    } else
                      setMessage(
                        "Listen or look again. You can preview either pattern as often as you like.",
                      );
                  }}
                >
                  Choose pattern {i + 1}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {d.mode === "rhythm" && (
        <>
          <div className="actions" aria-label="Rhythm feedback flexibility">
            <span>Rhythm feedback</span>
            <button
              aria-pressed={d.flexibility !== "extra"}
              onClick={() =>
                update({ ...d, flexibility: "gentle" }, { view: true })
              }
            >
              Gentle
            </button>
            <button
              aria-pressed={d.flexibility === "extra"}
              onClick={() =>
                update({ ...d, flexibility: "extra" }, { view: true })
              }
            >
              Extra flexible
            </button>
          </div>
          <p aria-live="polite">
            {taps} of 4 beats tapped
            {d.solved ? " · This exploration is complete." : "."}
          </p>
          <button
            className="tap-button"
            disabled={d.solved || taps >= 4}
            onClick={() => {
              if (tapLock.current) return;
              tapLock.current = true;
              tapTimes.current.push(performance.now());
              previewNote(0);
              const next = taps + 1;
              update({ ...d, taps: next, solved: next === 4 });
              if (next === 4) {
                finish("explored");
                setMessage(
                  rhythmFeedback(tapTimes.current, rhythm.beats, d.flexibility)
                    ? "Your spacing followed the pattern at your own pace. Try again whenever you like."
                    : "You explored four beats. Listen or watch again, and try another rhythm whenever you like.",
                );
              }
              queueMicrotask(() => {
                tapLock.current = false;
              });
            }}
          >
            Tap a beat
          </button>
        </>
      )}
      <div className="actions">
        {d.mode !== "piano" && (
          <button onClick={replay}>
            {
              {
                phrase: "Another phrase",
                match: "Another melody",
                rhythm: "Another rhythm",
              }[d.mode]
            }
          </button>
        )}
        {repeat && (
          <button onClick={repeat}>
            {d.mode === "piano"
              ? "New recording"
              : d.mode === "rhythm"
                ? "Try again"
                : "Try this exercise again"}
          </button>
        )}
      </div>
      <p role="status">
        {message ||
          (d.solved
            ? "This exercise is complete. You can play it again or start another."
            : "")}
      </p>
    </>
  );
}
