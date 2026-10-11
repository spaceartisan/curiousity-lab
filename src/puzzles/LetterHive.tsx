import { useEffect, useRef, useState } from "react";
import { useRecord } from "../activity/recorder";
import { keep, remember, shuffledCopy } from "./util";

export interface Hive {
  id: string;
  center: string;
  letters: string;
  answers: string[];
  bonus: string[];
  pangrams: string[];
}

interface Saved {
  index: number;
  found: Record<string, string[]>;
}

const RANKS: [number, string][] = [
  [0, "Beginning"],
  [0.1, "Warming up"],
  [0.25, "Good"],
  [0.45, "Solid"],
  [0.65, "Splendid"],
  [0.85, "Formidable"],
  [1, "Every word"],
];

export function LetterHive({ hives }: { hives: Hive[] }) {
  const [saved, setSaved] = useState<Saved>(() =>
    remember<Saved>("hive:v1", { index: 0, found: {} }),
  );
  const hive = hives[saved.index % hives.length];
  const found = saved.found[hive.id] ?? [];
  const [outer, setOuter] = useState(() => hive.letters.split(""));
  const [word, setWord] = useState("");
  const [message, setMessage] = useState("");
  const [reveal, setReveal] = useState(false);
  const record = useRecord();
  const opened = useRef({ id: hive.id, at: Date.now() });
  if (opened.current.id !== hive.id) opened.current = { id: hive.id, at: Date.now() };
  // File progress when she leaves the hive too, not only via "Another hive".
  const latest = useRef<() => void>(() => {});
  // Survives remounts so the same words are never filed twice.
  const filedCount = useRef<Record<string, number>>(remember("hive:filed", {}));
  useEffect(() => () => latest.current(), []);
  if (outer.join("").split("").sort().join("") !== hive.letters)
    setOuter(hive.letters.split(""));

  const common = found.filter((w) => hive.answers.includes(w));
  const share = common.length / hive.answers.length;
  const rank = [...RANKS].reverse().find(([t]) => share >= t)![1];

  function persist(next: Saved) {
    setSaved(next);
    keep("hive:v1", next);
  }
  function submit() {
    const w = word.toLowerCase();
    setWord("");
    if (w.length < 4) return setMessage("Words need at least four letters.");
    if (!w.includes(hive.center))
      return setMessage(
        `Every word uses the center letter, ${hive.center.toUpperCase()}.`,
      );
    if (found.includes(w)) return setMessage("Already found.");
    const isAnswer = hive.answers.includes(w);
    if (!isAnswer && !hive.bonus.includes(w))
      return setMessage("Not in this word list.");
    persist({ ...saved, found: { ...saved.found, [hive.id]: [...found, w] } });
    setMessage(
      hive.pangrams.includes(w)
        ? "A pangram: every letter!"
        : isAnswer
          ? w.length >= 7
            ? "Lovely long one."
            : "Good."
          : "A less common word, but a word. Counted as a bonus.",
    );
  }

  latest.current = () => {
    if (found.length <= (filedCount.current[hive.id] ?? 0)) return;
    filedCount.current[hive.id] = found.length;
    keep("hive:filed", filedCount.current);
    record({
      activity: "hive",
      item: hive.id,
      title: `Letter Hive · ${hive.center.toUpperCase()} with ${hive.letters.toUpperCase()}`,
      outcome: reveal ? "revealed" : "finished",
      seconds: (Date.now() - opened.current.at) / 1000,
      detail: {
        found: common.length,
        total: hive.answers.length,
        share: Math.round(share * 100),
        bonus: found.length - common.length,
        pangram: found.some((w) => hive.pangrams.includes(w)),
        longest: Math.max(0, ...found.map((w) => w.length)),
      },
    });
  };
  const letters = [hive.center, ...outer];
  return (
    <div className="hive">
      <p className="muted">
        Make words of four or more letters. Every word must use the center
        letter; letters can repeat. One word uses all seven.
      </p>
      <div className="hive-word" aria-live="polite">
        {word.split("").map((c, i) => (
          <span
            key={i}
            className={c === hive.center.toUpperCase() ? "center" : ""}
          >
            {c}
          </span>
        ))}
        <span className="caret" />
      </div>
      <div className="hive-cells">
        {letters.map((l, i) => (
          <button
            key={l + i}
            className={i === 0 ? "hex center" : `hex pos${i}`}
            onClick={() => setWord(word + l.toUpperCase())}
            aria-label={l.toUpperCase()}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="actions hive-actions">
        <button onClick={() => setWord(word.slice(0, -1))}>Delete</button>
        <button onClick={() => setOuter(shuffledCopy(outer))}>Shuffle</button>
        <button className="primary" onClick={submit} disabled={!word}>
          Enter
        </button>
      </div>
      <p className="piy-status" aria-live="polite">
        {message ||
          `${rank} · ${common.length} of ${hive.answers.length} words`}
      </p>
      <div className="hive-found">
        <strong>
          Found {common.length} of {hive.answers.length}
          {found.length > common.length
            ? ` · ${found.length - common.length} bonus`
            : ""}
        </strong>
        <ul>
          {[...found].sort().map((w) => (
            <li
              key={w}
              className={
                hive.pangrams.includes(w)
                  ? "pangram"
                  : hive.answers.includes(w)
                    ? ""
                    : "bonus"
              }
            >
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="actions">
        <button onClick={() => setReveal(!reveal)}>
          {reveal ? "Hide the word list" : "Show the word list"}
        </button>
        <button
          onClick={() => {
            if (found.length > (filedCount.current[hive.id] ?? 0))
              record({
                activity: "hive",
                item: hive.id,
                title: `Letter Hive · ${hive.center.toUpperCase()} with ${hive.letters.toUpperCase()}`,
                outcome: reveal ? "revealed" : "finished",
                seconds: (Date.now() - opened.current.at) / 1000,
                detail: {
                  found: common.length,
                  total: hive.answers.length,
                  share: Math.round(share * 100),
                  bonus: found.length - common.length,
                  pangram: found.some((w) => hive.pangrams.includes(w)),
                  longest: Math.max(0, ...found.map((w) => w.length)),
                },
              });
            filedCount.current[hive.id] = found.length;
            keep("hive:filed", filedCount.current);
            setMessage("");
            setReveal(false);
            persist({ ...saved, index: saved.index + 1 });
          }}
        >
          Another hive
        </button>
      </div>
      {reveal && (
        <ul className="hive-all">
          {hive.answers.map((w) => (
            <li key={w} className={found.includes(w) ? "got" : ""}>
              {w}
            </li>
          ))}
        </ul>
      )}
      <p className="ntp-source">
        Word lists from SCOWL (Kevin Atkinson), common words only.
      </p>
    </div>
  );
}
