import { useRef, useState } from "react";
import {
  connections,
  searchBoard,
  findWordPaths,
  wordPath,
} from "../content/words";
import type { GameProps } from "./types";
export interface ConnectionsData {
  pack: number;
  solved: string[];
  selected: string[];
}
export interface SearchData {
  pack?: number;
  found: string[];
}
export function Connections({ draft, update, finish, replay }: GameProps) {
  const d = draft.data as ConnectionsData;
  const pack = connections[d.pack % connections.length];
  const [message, setMessage] = useState("");
  const left = pack.groups.filter((g) => !d.solved.includes(g.title));
  const words = left.flatMap((g) => g.words).sort((a, b) => a.localeCompare(b));
  function check() {
    const group = left.find((g) =>
      g.words.every((w) => d.selected.includes(w)),
    );
    if (!group) {
      setMessage("Try a different connection, or ask for a hint.");
      return;
    }
    const solved = [...d.solved, group.title];
    update({ ...d, solved, selected: [] });
    setMessage(`Connected: ${group.title}.`);
    if (solved.length === 4) finish("completed");
  }
  return (
    <>
      <p>
        Find four words that belong together. Select them, then choose
        “Connect.”
      </p>
      <div className="solved-groups">
        {pack.groups
          .filter((g) => d.solved.includes(g.title))
          .map((g) => (
            <div className="solved" key={g.title}>
              <strong>{g.title}</strong>
              <span>{g.words.join(" · ")}</span>
            </div>
          ))}
      </div>
      <div className="word-grid">
        {words.map((w) => (
          <button
            key={w}
            aria-pressed={d.selected.includes(w)}
            onClick={() => {
              const selected = d.selected.includes(w)
                ? d.selected.filter((x) => x !== w)
                : d.selected.length < 4
                  ? [...d.selected, w]
                  : d.selected;
              update({ ...d, selected });
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="actions">
        <button
          className="primary"
          disabled={d.selected.length !== 4}
          onClick={check}
        >
          Connect
        </button>
        <button onClick={() => update({ ...d, selected: [] })}>
          Clear selection
        </button>
        <button
          disabled={!left.length}
          onClick={() => {
            setMessage(
              `Look for ${left[0].title.toLowerCase()}. One word is ${left[0].words[0]}.`,
            );
            update(d, { hint: true });
          }}
        >
          Hint
        </button>
        <button onClick={replay}>Another puzzle</button>
      </div>
      <p role="status">
        {d.solved.length === 4 ? "You found all four connections." : message}
      </p>
    </>
  );
}
export function WordSearch({
  draft,
  update,
  finish,
  replay,
  repeat,
}: GameProps) {
  const d = draft.data as SearchData;
  const pack = searchBoard(d.pack);
  const [start, setStart] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [focus, setFocus] = useState(0),
    [hint, setHint] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const cells = pack.rows.join("").split("");
  const foundCells = new Set(
    d.found.flatMap((w) => findWordPaths(pack, w).flat()),
  );
  function select(index: number) {
    if (start === null) {
      setStart(index);
      setMessage(
        `Start selected: row ${Math.floor(index / pack.size) + 1}, column ${(index % pack.size) + 1}. Now choose the last letter.`,
      );
      return;
    }
    if (start === index) {
      setStart(null);
      setMessage("Selection cleared.");
      return;
    }
    const path = wordPath(start, index, pack.size),
      word = path.map((i) => cells[i]).join("");
    const match = pack.words.find(
      (w) => w === word || w === word.split("").reverse().join(""),
    );
    if (match && !d.found.includes(match)) {
      const found = [...d.found, match];
      update({ ...d, found });
      setHint(null);
      setMessage(`Found ${match.toLowerCase()}.`);
      if (found.length === pack.words.length) finish("completed");
    } else if (match)
      setMessage(`${match.toLowerCase()} is already found. Try another word.`);
    else
      setMessage(
        "Choose the first and last letter of a word in a straight line.",
      );
    setStart(null);
  }
  return (
    <>
      <div className="search-summary">
        <h2>{pack.title}</h2>
        <p>
          {pack.directions} · {d.found.length} of {pack.words.length} words
          found
        </p>
      </div>
      <p id="word-search-instructions">
        Tap the first letter, then the last letter of a word. You can select in
        either direction. With a keyboard, use arrow keys to move and Enter or
        Space to select. Escape clears the selection.
      </p>
      <p className="muted search-scroll-help">
        On a small screen, slide the board sideways to see all columns.
      </p>
      <div className="search-layout">
        <div className="search-board-scroll">
          <div
            className="letter-grid"
            role="group"
            aria-label="Word search"
            aria-describedby="word-search-instructions"
          >
            {cells.map((letter, i) => (
              <button
                key={i}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                tabIndex={focus === i ? 0 : -1}
                onFocus={() => setFocus(i)}
                className={[
                  start === i ? "selected" : "",
                  foundCells.has(i) ? "found-letter" : "",
                  hint === i ? "hint-letter" : "",
                ].join(" ")}
                onClick={() => select(i)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setStart(null);
                    setMessage("Selection cleared.");
                    return;
                  }
                  const row = Math.floor(i / pack.size),
                    col = i % pack.size;
                  const next =
                    e.key === "ArrowRight"
                      ? row * pack.size + Math.min(pack.size - 1, col + 1)
                      : e.key === "ArrowLeft"
                        ? row * pack.size + Math.max(0, col - 1)
                        : e.key === "ArrowDown"
                          ? Math.min(pack.size - 1, row + 1) * pack.size + col
                          : e.key === "ArrowUp"
                            ? Math.max(0, row - 1) * pack.size + col
                            : e.key === "Home"
                              ? row * pack.size
                              : e.key === "End"
                                ? row * pack.size + pack.size - 1
                                : null;
                  if (next !== null) {
                    e.preventDefault();
                    buttons.current[next]?.focus();
                  }
                }}
                aria-pressed={start === i}
                aria-label={`Row ${Math.floor(i / pack.size) + 1}, column ${(i % pack.size) + 1}: ${letter}${foundCells.has(i) ? ", found" : ""}${hint === i ? ", hint starts here" : ""}`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
        <ul className="word-list" aria-label="Words to find">
          {pack.words.map((w) => (
            <li key={w} className={d.found.includes(w) ? "found" : ""}>
              {d.found.includes(w) ? "✓ " : ""}
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="actions">
        <button
          onClick={() => {
            setStart(null);
            setMessage("Selection cleared.");
          }}
        >
          Clear selection
        </button>
        <button
          onClick={() => {
            const word = pack.words.find((w) => !d.found.includes(w));
            const path = word ? findWordPaths(pack, word)[0] : undefined;
            if (word && path) {
              setStart(null);
              setHint(path[0]);
              setMessage(
                `${word.toLowerCase()} starts at row ${Math.floor(path[0] / pack.size) + 1}, column ${(path[0] % pack.size) + 1}. Its first letter is outlined.`,
              );
              update(d, { hint: true });
            }
          }}
          disabled={d.found.length === pack.words.length}
        >
          Hint
        </button>
        <button onClick={replay}>Another puzzle</button>
        {repeat && <button onClick={repeat}>Replay this puzzle</button>}
      </div>
      <p role="status">
        {d.found.length === pack.words.length
          ? "You found all eight words. You can replay or try another puzzle."
          : message}
      </p>
    </>
  );
}
