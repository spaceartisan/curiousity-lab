import { useEffect, useMemo, useState } from "react";
import { keep, remember } from "./util";

export interface KillerPuzzle {
  id: string;
  tier: "Gentle" | "Classic" | "Challenging";
  solution: number[];
  cages: { cells: number[]; sum: number }[];
}

interface Saved {
  tier: KillerPuzzle["tier"];
  index: Record<string, number>;
  boards: Record<string, { entries: number[]; notes: number[] }>;
  solved: string[];
}

/** All sets of distinct digits 1–9 of a given size adding to a sum. */
export function combinations(size: number, sum: number): number[][] {
  const out: number[][] = [];
  const walk = (start: number, left: number, total: number, acc: number[]) => {
    if (left === 0) {
      if (total === sum) out.push([...acc]);
      return;
    }
    for (let d = start; d <= 9; d++) {
      if (total + d > sum) break;
      acc.push(d);
      walk(d + 1, left - 1, total + d, acc);
      acc.pop();
    }
  };
  walk(1, size, 0, []);
  return out;
}

const TIERS: KillerPuzzle["tier"][] = ["Gentle", "Classic", "Challenging"];

export function KillerSudoku({ puzzles }: { puzzles: KillerPuzzle[] }) {
  const [saved, setSaved] = useState<Saved>(() =>
    remember<Saved>("killer:v1", {
      tier: "Gentle",
      index: {},
      boards: {},
      solved: [],
    }),
  );
  const pool = puzzles.filter((p) => p.tier === saved.tier);
  const puzzle = pool[(saved.index[saved.tier] ?? 0) % pool.length];
  const board = saved.boards[puzzle.id] ?? {
    entries: Array(81).fill(0),
    notes: Array(81).fill(0),
  };
  const [selected, setSelected] = useState(0);
  const [noting, setNoting] = useState(false);
  const [history, setHistory] = useState<
    { entries: number[]; notes: number[] }[]
  >([]);
  const [checked, setChecked] = useState(false);
  const [showCombos, setShowCombos] = useState(true);

  const cageOf = useMemo(() => {
    const map = Array(81).fill(0);
    puzzle.cages.forEach((c, k) => c.cells.forEach((i) => (map[i] = k)));
    return map;
  }, [puzzle]);
  const solved = board.entries.every((v, i) => v === puzzle.solution[i]);

  function persist(next: Saved) {
    setSaved(next);
    keep("killer:v1", next);
  }
  function setBoard(entries: number[], notes: number[]) {
    setHistory((h) => [...h.slice(-80), board]);
    setChecked(false);
    const nowSolved = entries.every((v, i) => v === puzzle.solution[i]);
    persist({
      ...saved,
      boards: { ...saved.boards, [puzzle.id]: { entries, notes } },
      solved:
        nowSolved && !saved.solved.includes(puzzle.id)
          ? [...saved.solved, puzzle.id]
          : saved.solved,
    });
  }
  function put(d: number) {
    if (solved) return;
    const entries = [...board.entries];
    const notes = [...board.notes];
    if (noting && d) {
      if (entries[selected]) return;
      notes[selected] ^= 1 << d;
    } else {
      entries[selected] = entries[selected] === d ? 0 : d;
      notes[selected] = 0;
    }
    setBoard(entries, notes);
  }
  function choose(tier: KillerPuzzle["tier"]) {
    setHistory([]);
    persist({ ...saved, tier });
  }
  function another() {
    setHistory([]);
    persist({
      ...saved,
      index: {
        ...saved.index,
        [saved.tier]: (saved.index[saved.tier] ?? 0) + 1,
      },
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (/^[1-9]$/.test(e.key)) put(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0")
        put(0);
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const r = Math.floor(selected / 9),
          c = selected % 9;
        const [dr, dc] = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        }[e.key] ?? [0, 0];
        setSelected(((r + dr + 9) % 9) * 9 + ((c + dc + 9) % 9));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cage = puzzle.cages[cageOf[selected]];
  const placed = cage.cells.map((i) => board.entries[i]).filter(Boolean);
  const combos = combinations(cage.cells.length, cage.sum);
  const sr = Math.floor(selected / 9),
    sc = selected % 9;

  return (
    <div className="killer">
      <div className="segmented" role="group" aria-label="Difficulty">
        {TIERS.map((t) => (
          <button
            key={t}
            aria-pressed={saved.tier === t}
            onClick={() => choose(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="muted">
        Each dashed cage’s digits add to its small number, with no digit
        repeated in a cage, row, column or box. There are no starting digits;
        the sums are the clues.
      </p>
      <div className="killer-layout">
        <div className="killer-grid" role="grid" aria-label="Killer Sudoku">
          {puzzle.solution.map((_, i) => {
            const r = Math.floor(i / 9),
              c = i % 9,
              k = cageOf[i];
            const same = (j: number) => j >= 0 && j < 81 && cageOf[j] === k;
            const cls = [
              "kcell",
              c % 3 === 2 && c < 8 ? "box-r" : "",
              r % 3 === 2 && r < 8 ? "box-b" : "",
              i === selected ? "sel" : "",
              r === sr || c === sc || cageOf[i] === cageOf[selected]
                ? "peer"
                : "",
              checked &&
              board.entries[i] &&
              board.entries[i] !== puzzle.solution[i]
                ? "wrong"
                : "",
            ].join(" ");
            // Each cage draws as one continuous dashed outline: inset on its
            // outer edges, reaching the cell edge where the cage continues.
            const up = same(i - 9),
              down = same(i + 9),
              left = c > 0 && same(i - 1),
              right = c < 8 && same(i + 1);
            const cageBorder = {
              borderTopStyle: up ? "none" : "dashed",
              borderBottomStyle: down ? "none" : "dashed",
              borderLeftStyle: left ? "none" : "dashed",
              borderRightStyle: right ? "none" : "dashed",
              top: up ? -1 : 3,
              bottom: down ? -1 : 3,
              left: left ? -1 : 3,
              right: right ? -1 : 3,
            } as const;
            const first = puzzle.cages[k].cells[0] === i;
            return (
              <button
                key={i}
                className={cls}
                role="gridcell"
                aria-label={`Row ${r + 1}, column ${c + 1}, cage of ${puzzle.cages[k].cells.length} adding to ${puzzle.cages[k].sum}: ${board.entries[i] || "empty"}`}
                onClick={() => setSelected(i)}
              >
                <span className="kcage" style={cageBorder} />
                {first && <span className="ksum">{puzzle.cages[k].sum}</span>}
                {board.entries[i] ? (
                  <span className="kval">{board.entries[i]}</span>
                ) : board.notes[i] ? (
                  <span className="knotes">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                      <span key={d}>{board.notes[i] & (1 << d) ? d : ""}</span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="killer-side">
          <div className="numberpad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button key={d} onClick={() => put(d)}>
                {d}
              </button>
            ))}
          </div>
          <div className="actions">
            <button onClick={() => put(0)}>Erase</button>
            <button aria-pressed={noting} onClick={() => setNoting(!noting)}>
              Pencil notes {noting ? "on" : "off"}
            </button>
            <button
              disabled={!history.length}
              onClick={() => {
                const prev = history[history.length - 1];
                setHistory(history.slice(0, -1));
                persist({
                  ...saved,
                  boards: { ...saved.boards, [puzzle.id]: prev },
                });
              }}
            >
              Undo
            </button>
            <button onClick={() => setChecked(true)}>Check entries</button>
            <button
              onClick={() => {
                const entries = [...board.entries];
                entries[selected] = puzzle.solution[selected];
                setBoard(
                  entries,
                  board.notes.map((n, i) => (i === selected ? 0 : n)),
                );
              }}
            >
              Fill this square
            </button>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={showCombos}
              onChange={(e) => setShowCombos(e.target.checked)}
            />
            Show cage combinations
          </label>
          {showCombos && (
            <div className="combos" aria-live="polite">
              <strong>
                {cage.cells.length} cells adding to {cage.sum}
              </strong>
              <ul>
                {combos.map((c) => {
                  const fits = placed.every((d) => c.includes(d));
                  return (
                    <li key={c.join("")} className={fits ? "" : "ruled-out"}>
                      {c.join(" + ")}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
      <p className="piy-status" aria-live="polite">
        {solved
          ? "Solved. Every cage adds up."
          : checked
            ? board.entries.some((v, i) => v && v !== puzzle.solution[i])
              ? "Squares that don’t match the solution are marked."
              : "Everything so far is right."
            : `${board.entries.filter(Boolean).length} of 81 squares filled`}
      </p>
      <div className="actions">
        <button className={solved ? "primary" : ""} onClick={another}>
          Another {saved.tier.toLowerCase()} puzzle
        </button>
        <button
          onClick={() => {
            if (window.confirm("Clear this board and start it again?"))
              setBoard(Array(81).fill(0), Array(81).fill(0));
          }}
        >
          Start this one over
        </button>
      </div>
    </div>
  );
}
