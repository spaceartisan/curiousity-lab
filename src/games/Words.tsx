import { useRef, useState } from "react";
import {
  connections,
  searchBoard,
  findWordPaths,
  wordPath,
} from "../content/words";
import { medicalExplanation } from "../content/medical-words";
import type { GameProps } from "./types";
import {
  matchingConnection,
  connectionWords,
  connectionsTier,
  connectionsPool,
  connectionsMode,
  type ConnectionsTier,
  type ConnectionsData,
} from "./connections-engine";
export type { ConnectionsData } from "./connections-engine";
export interface SearchData {
  pack?: number;
  found: string[];
}
export function Connections({
  draft,
  update,
  finish,
  replay,
  repeat,
}: GameProps) {
  const d = draft.data as ConnectionsData;
  const pack = connections[d.pack];
  const [message, setMessage] = useState("");
  const [hintStep, setHintStep] = useState(0);
  const left = pack.groups.filter((g) => !d.solved.includes(g.title));
  const words = connectionWords(d);
  const complete = d.solved.length === pack.groups.length;
  const tier = connectionsTier(d.pack);
  const pool = connectionsPool(tier);
  function changeChallenge(next: ConnectionsTier) {
    if (
      next === tier ||
      !window.confirm(
        "Start a fresh puzzle? Your current puzzle will be replaced.",
      )
    )
      return;
    const pack = connectionsPool(next)[0];
    update({ pack, solved: [], selected: [] }, { mode: connectionsMode(pack) });
    setHintStep(0);
    setMessage("");
  }
  function check() {
    if (complete) return;
    const group = matchingConnection(d);
    if (!group) {
      setMessage(
        tier !== "Classic"
          ? "That isn't one of this puzzle's four groups. Try another grouping."
          : "These words have different connections. Try another grouping, or use a hint.",
      );
      return;
    }
    const solved = [...d.solved, group.title];
    update({ ...d, solved, selected: [] });
    setHintStep(0);
    setMessage(`Connected: ${group.title}.`);
    if (solved.length === pack.groups.length) finish("completed");
  }
  function hint() {
    const group = left[0];
    if (!group) return;
    if (hintStep === 0) setMessage(`Look for ${group.title.toLowerCase()}.`);
    else if (hintStep === 1)
      setMessage(
        `One word in ${group.title.toLowerCase()} is ${group.words[0]}.`,
      );
    else {
      setMessage(
        `Four words for ${group.title.toLowerCase()} are selected. Choose Connect when you like.`,
      );
    }
    update(hintStep === 2 ? { ...d, selected: [...group.words] } : d, {
      hint: true,
    });
    setHintStep(Math.min(2, hintStep + 1));
  }
  const groupSelected = left[0]?.words.every((w) => d.selected.includes(w));
  return (
    <div className="connections-workspace">
      <label className="connections-challenge">
        Challenge{" "}
        <select
          aria-label="Word Connections challenge"
          value={tier}
          onChange={(e) => changeChallenge(e.target.value as ConnectionsTier)}
        >
          <option>Classic</option>
          <option>Challenging</option>
          <option>Medical</option>
        </select>
      </label>
      <h2>{pack.title}</h2>
      <p>
        {d.solved.length} of {pack.groups.length} connections found · Puzzle{" "}
        {pool.indexOf(d.pack) + 1} of {pool.length}
      </p>
      <p id="connections-instructions">
        Select four related words, then choose “Connect.”
      </p>
      {tier === "Medical" && (
        <p>
          Medical Latin &amp; Greek: connect terms by meaning. Explanations are
          available after a group is solved.
        </p>
      )}
      <details>
        <summary>How to play & get help</summary>
        <p>
          Classic groups use direct categories. Challenging groups may use
          compound words, phrases, alternate meanings or sounds. A plausible
          grouping may leave other words without a match; consider the full
          board. Wordplay can use one word or a phrase with spaces. Medical
          boards mix roots or prefixes; a word can contain more than one
          meaningful part. Look for four groups that cover the whole board.
        </p>
        <p>
          Select a word to add it; select it again to remove it. You can choose
          up to four words. Clear selection or press Escape to start your
          selection again.
        </p>
        <p>
          Hints can name a category, show one word, then select all four words
          for you. Undo last connection brings back the most recently solved
          group while a puzzle is in progress. Replay this puzzle starts a fresh
          attempt on the same board.
        </p>
      </details>
      <div className="solved-groups">
        {pack.groups
          .filter((g) => d.solved.includes(g.title))
          .map((g) => (
            <div className="solved" key={g.title}>
              <strong>{g.title}</strong>
              <span>{g.words.join(" · ")}</span>
              {medicalExplanation(pack.id, g.title) && (
                <details className="medical-root-details">
                  <summary>Explore these roots: {g.title}</summary>
                  <p>{medicalExplanation(pack.id, g.title)}</p>
                  <p>
                    <a
                      href="https://medlineplus.gov/appendixa.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Word-part reference · MedlinePlus
                    </a>
                  </p>
                </details>
              )}
            </div>
          ))}
      </div>
      <p className="connections-selection" aria-live="polite">
        Selected: {d.selected.length ? d.selected.join(" · ") : "none"} ·{" "}
        {d.selected.length} of 4
      </p>
      <div
        className={
          tier === "Medical" ? "word-grid medical-word-grid" : "word-grid"
        }
        role="group"
        aria-label="Connection words"
        aria-describedby="connections-instructions"
        onKeyDown={(e) => {
          if (e.key === "Escape" && d.selected.length) {
            e.preventDefault();
            update({ ...d, selected: [] });
            setMessage("Selection cleared.");
          }
        }}
      >
        {words.map((w) => (
          <button
            key={w}
            aria-pressed={d.selected.includes(w)}
            onClick={() => {
              if (complete) return;
              if (d.selected.length === 4 && !d.selected.includes(w)) {
                setMessage(
                  "Four words are selected. Remove one or clear the selection to choose another.",
                );
                return;
              }
              update({
                ...d,
                selected: d.selected.includes(w)
                  ? d.selected.filter((x) => x !== w)
                  : [...d.selected, w],
              });
              setMessage("");
            }}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="actions">
        <button
          className="primary"
          disabled={complete || d.selected.length !== 4}
          onClick={check}
        >
          Connect
        </button>
        <button
          disabled={!d.selected.length}
          onClick={() => {
            update({ ...d, selected: [] });
            setMessage("Selection cleared.");
          }}
        >
          Clear selection
        </button>
        <button
          disabled={complete || (hintStep === 2 && !!groupSelected)}
          onClick={hint}
        >
          {hintStep === 0
            ? "Hint"
            : hintStep === 1
              ? "Show one word"
              : "Show four words"}
        </button>
        <button
          disabled={complete || !d.solved.length}
          onClick={() => {
            const title = d.solved[d.solved.length - 1];
            update(
              { ...d, solved: d.solved.slice(0, -1), selected: [] },
              { undo: true },
            );
            setHintStep(0);
            setMessage(`Returned ${title.toLowerCase()} to the board.`);
          }}
        >
          Undo last connection
        </button>
        <button
          disabled={complete}
          onClick={() => {
            update({ ...d, order: ((d.order ?? 0) % 31) + 1 }, { view: true });
            setMessage("Word positions changed. Your selection is kept.");
          }}
        >
          Shuffle words
        </button>
        {repeat && <button onClick={repeat}>Replay this puzzle</button>}
        <button onClick={replay}>Another puzzle</button>
      </div>
      <p role="status">
        {complete ? "You found all four connections." : message}
      </p>
    </div>
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
  const complete = d.found.length === pack.words.length;
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
        Find the listed words by selecting their first and last letters.
      </p>
      <p className="muted search-scroll-help">
        On a small screen, slide the board sideways to see all columns.
      </p>
      <details>
        <summary>How to play & get help</summary>
        <p>
          Select in either direction. Arrow keys move between letters; Enter or
          Space selects, and Escape clears the selection.
        </p>
        <p>
          Found words stay marked. Undo last word returns the most recently
          found word to the list while this puzzle is in progress. You can find
          it again whenever you like. Hints outline a real first letter.
        </p>
        <p>
          There is no time limit or limit on tries. Replay this puzzle starts a
          fresh attempt on the same board after completion, or whenever you want
          to begin again.
        </p>
      </details>
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
        <button
          disabled={complete || !d.found.length}
          onClick={() => {
            const word = d.found[d.found.length - 1];
            update({ ...d, found: d.found.slice(0, -1) }, { undo: true });
            setStart(null);
            setHint(null);
            setMessage(`Returned ${word.toLowerCase()} to the words to find.`);
          }}
        >
          Undo last word
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
