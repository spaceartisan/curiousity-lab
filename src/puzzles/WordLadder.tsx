import { useMemo, useState } from "react";
import { keep, remember } from "./util";

export interface Ladder {
  id: string;
  from: string;
  to: string;
  title: string;
  par: number;
  length: number;
  carroll?: string[];
  example?: string[];
}

interface Saved {
  index: number;
  paths: Record<string, string[]>;
}

const differsByOne = (a: string, b: string) =>
  a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;

export function WordLadder({
  ladders,
  dictionary,
}: {
  ladders: Ladder[];
  dictionary: Record<string, string[]>;
}) {
  const [saved, setSaved] = useState<Saved>(() =>
    remember<Saved>("ladder:v1", { index: 0, paths: {} }),
  );
  const ladder = ladders[saved.index % ladders.length];
  const words = useMemo(
    () => new Set(dictionary[String(ladder.length)] ?? []),
    [dictionary, ladder.length],
  );
  const path = saved.paths[ladder.id] ?? [ladder.from];
  const last = path[path.length - 1];
  const done = last === ladder.to;
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);

  function persist(next: Saved) {
    setSaved(next);
    keep("ladder:v1", next);
  }
  function setPath(p: string[]) {
    persist({ ...saved, paths: { ...saved.paths, [ladder.id]: p } });
  }
  function add() {
    const w = entry.trim().toLowerCase();
    setEntry("");
    if (w.length !== ladder.length)
      return setMessage(`Each rung has ${ladder.length} letters.`);
    if (!differsByOne(last, w))
      return setMessage(`Change exactly one letter of ${last.toUpperCase()}.`);
    if (!words.has(w) && w !== ladder.to)
      return setMessage(`${w.toUpperCase()} isn’t in this word list.`);
    if (path.includes(w))
      return setMessage("That word is already on the ladder.");
    setMessage("");
    setPath([...path, w]);
  }

  const reference = ladder.carroll ?? ladder.example ?? [];
  const steps = path.length - 1;
  return (
    <div className="ladder">
      <p className="muted">
        Climb from the first word to the last, changing one letter at a time.
        Every rung must be a real word.
        {ladder.carroll
          ? " This is one of Lewis Carroll’s own puzzles; he called them Doublets (1879)."
          : ""}
      </p>
      <h3 className="ladder-title">{ladder.title}</h3>
      <ol className="ladder-rungs">
        {path.map((w, i) => (
          <li
            key={i}
            className={i === 0 ? "start" : w === ladder.to ? "end" : ""}
          >
            {w.toUpperCase()}
          </li>
        ))}
        {!done && (
          <li className="ladder-entry">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <input
                value={entry}
                onChange={(e) =>
                  setEntry(
                    e.target.value
                      .replace(/[^a-zA-Z]/g, "")
                      .slice(0, ladder.length),
                  )
                }
                maxLength={ladder.length}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Next word"
                placeholder={"?".repeat(ladder.length)}
              />
              <button
                className="primary"
                type="submit"
                disabled={entry.length !== ladder.length}
              >
                Add
              </button>
            </form>
          </li>
        )}
        {!done && <li className="end ghost">{ladder.to.toUpperCase()}</li>}
      </ol>
      <p className="piy-status" aria-live="polite">
        {message ||
          (done
            ? `Done in ${steps} step${steps === 1 ? "" : "s"}${steps <= ladder.par ? " — as short as it can be." : `; it can be done in ${ladder.par}.`}`
            : `${steps} step${steps === 1 ? "" : "s"} so far · shortest is ${ladder.par}`)}
      </p>
      <div className="actions">
        <button
          disabled={path.length < 2}
          onClick={() => setPath(path.slice(0, -1))}
        >
          Undo last rung
        </button>
        <button onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer
            ? "Hide the answer"
            : ladder.carroll
              ? "Show Carroll’s answer"
              : "Show a shortest ladder"}
        </button>
        <button
          className={done ? "primary" : ""}
          onClick={() => {
            setShowAnswer(false);
            setMessage("");
            persist({ ...saved, index: saved.index + 1 });
          }}
        >
          Another ladder
        </button>
      </div>
      {showAnswer && (
        <p className="ladder-answer">
          {reference.map((w) => w.toUpperCase()).join(" → ")}
        </p>
      )}
    </div>
  );
}
