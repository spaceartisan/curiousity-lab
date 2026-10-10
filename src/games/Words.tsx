import { useState } from "react";
import { connections, searchPack, wordPath } from "../content/words";
import type { GameProps } from "./types";
export interface ConnectionsData {
  pack: number;
  solved: string[];
  selected: string[];
}
export interface SearchData {
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
export function WordSearch({ draft, update, finish, replay }: GameProps) {
  const d = draft.data as SearchData;
  const [start, setStart] = useState<number | null>(null),
    [message, setMessage] = useState("");
  const cells = searchPack.rows.join("").split("");
  function select(index: number) {
    if (start === null) {
      setStart(index);
      return;
    }
    const path = wordPath(start, index, 8),
      word = path.map((i) => cells[i]).join("");
    const match = searchPack.words.find(
      (w) => w === word || w === word.split("").reverse().join(""),
    );
    if (match && !d.found.includes(match)) {
      const found = [...d.found, match];
      update({ found });
      setMessage(`Found ${match.toLowerCase()}.`);
      if (found.length === searchPack.words.length) finish("completed");
    } else
      setMessage(
        "Choose the first and last letter of a word in a straight line.",
      );
    setStart(null);
  }
  return (
    <>
      <p>
        Tap the first letter, then the last letter of a word. You can select in
        either direction.
      </p>
      <div className="search-layout">
        <div className="letter-grid" role="group" aria-label="Word search">
          {cells.map((letter, i) => (
            <button
              key={i}
              className={start === i ? "selected" : ""}
              onClick={() => select(i)}
              aria-pressed={start === i}
              aria-label={`Row ${Math.floor(i / 8) + 1}, column ${(i % 8) + 1}: ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
        <ul className="word-list">
          {searchPack.words.map((w) => (
            <li key={w} className={d.found.includes(w) ? "found" : ""}>
              {d.found.includes(w) ? "✓ " : ""}
              {w}
            </li>
          ))}
        </ul>
      </div>
      <div className="actions">
        <button onClick={() => setStart(null)}>Clear selection</button>
        <button
          onClick={() => {
            const row = searchPack.words.findIndex((w) => !d.found.includes(w));
            if (row >= 0) {
              setMessage(
                `Look along row ${row + 1} for ${searchPack.words[row].toLowerCase()}.`,
              );
              update(d, { hint: true });
            }
          }}
          disabled={d.found.length === 8}
        >
          Hint
        </button>
        <button onClick={replay}>Replay this puzzle</button>
      </div>
      <p role="status">
        {d.found.length === 8 ? "You found every word in the garden." : message}
      </p>
    </>
  );
}
