import { useLayoutEffect, useRef, useState } from "react";
import {
  dimensions,
  generateSudoku,
  isComplete,
  validSudoku,
  findLogicalStep,
  findAdvancedStep,
  explainStep,
  removePeerNote,
  type Size,
  type SudokuTier,
  type SudokuData,
} from "./sudoku-engine";
import type { GameProps } from "./types";
export function Sudoku({ draft, update, finish, replay, repeat }: GameProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0),
    [noteMode, setNoteMode] = useState(false),
    [message, setMessage] = useState("");
  const largeCells = (draft.data as SudokuData)?.largeCells === true;
  useLayoutEffect(() => {
    if (!largeCells) return;
    const holder = viewport.current;
    const reveal = () => {
      if (!holder?.clientWidth) return;
      const cell = holder.querySelector<HTMLElement>(`#cell-${selected}`);
      if (!cell) return;
      const bounds = holder.getBoundingClientRect(),
        square = cell.getBoundingClientRect(),
        left = bounds.left + holder.clientLeft,
        top = bounds.top + holder.clientTop,
        right = left + holder.clientWidth,
        bottom = top + holder.clientHeight;
      if (square.left < left + 6) holder.scrollLeft += square.left - left - 6;
      else if (square.right > right - 6)
        holder.scrollLeft += square.right - right + 6;
      if (square.top < top + 6) holder.scrollTop += square.top - top - 6;
      else if (square.bottom > bottom - 6)
        holder.scrollTop += square.bottom - bottom + 6;
    };
    reveal();
    if (!holder || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(reveal);
    observer.observe(holder);
    if (holder.firstElementChild) observer.observe(holder.firstElementChild);
    return () => observer.disconnect();
  }, [selected, largeCells, (draft.data as SudokuData)?.size]);
  if (!validSudoku(draft.data))
    return (
      <p>
        This saved puzzle needs a fresh start.{" "}
        <button onClick={replay}>New puzzle</button>
      </p>
    );
  const d = draft.data;
  const complete = isComplete(d);
  const { rows, cols } = dimensions(d.size);
  function move(n: number, hint = false) {
    if (d.givens[selected] || complete) return;
    const cells = [...d.cells],
      notes =
        n && !noteMode && !hint
          ? removePeerNote(d.notes, selected, n, d.size)
          : d.notes.map((a) => [...a]);
    if (noteMode && !hint && n) {
      notes[selected] = notes[selected].includes(n)
        ? notes[selected].filter((x) => x !== n)
        : [...notes[selected], n].sort();
    } else {
      cells[selected] = n;
      notes[selected] = [];
    }
    const next: SudokuData = {
      ...d,
      cells,
      notes,
      history: [...d.history, { cells: d.cells, notes: d.notes }].slice(-200),
    };
    update(next, { hint });
    setMessage("");
    if (isComplete(next)) finish("completed");
  }
  function hint(explainOnly = false) {
    const wrong = d.cells.findIndex((n, i) => n && n !== d.solution[i]);
    const step =
      wrong < 0
        ? d.tier === "Challenging"
          ? findAdvancedStep(d.cells, d.size)
          : findLogicalStep(d.cells, d.size)
        : undefined;
    if (explainOnly) {
      update(d, { hint: true, view: true });
      if (step) {
        setSelected(step.index);
        setMessage(explainStep(step, d.size));
      } else
        setMessage(
          "Some entries need another look. Check entries, undo a move, or use Hint to fill a square.",
        );
      return;
    }
    const empty =
      step?.index ??
      (wrong >= 0 ? wrong : d.cells.findIndex((n, i) => n !== d.solution[i]));
    if (empty < 0) return;
    const cells = [...d.cells];
    cells[empty] = d.solution[empty];
    const notes = removePeerNote(d.notes, empty, d.solution[empty], d.size);
    setSelected(empty);
    const next = {
      ...d,
      cells,
      notes,
      history: [...d.history, { cells: d.cells, notes: d.notes }].slice(-200),
    };
    update(next, { hint: true });
    setMessage(
      step
        ? `${explainStep(step, d.size)} The square is filled for you.`
        : `Row ${Math.floor(empty / d.size) + 1}, column ${(empty % d.size) + 1}: ${wrong >= 0 ? "this entry differed from the solution" : "filled from the puzzle’s solution"}. The square is filled for you.`,
    );
    if (isComplete(next)) finish("completed");
  }
  function change(size: Size, tier: SudokuTier) {
    if (
      !window.confirm(
        "Start a fresh puzzle? Your current puzzle will be replaced.",
      )
    )
      return;
    update(
      {
        ...generateSudoku(
          size,
          crypto.getRandomValues(new Uint32Array(1))[0],
          tier,
        ),
        largeCells,
      },
      {
        mode: `${size}x${size}:${tier}`,
      },
    );
    setSelected(0);
    setMessage("");
  }
  return (
    <div className="sudoku-workspace">
      <div className="toolbar">
        <label>
          Grid{" "}
          <select
            aria-label="Grid"
            value={d.size}
            onChange={(e) =>
              change(
                Number(e.target.value) as Size,
                (d.tier === "Hidden singles" || d.tier === "Challenging") &&
                  Number(e.target.value) !== 9
                  ? "Classic"
                  : d.tier,
              )
            }
          >
            <option value={9}>9 × 9</option>
            <option value={6}>6 × 6</option>
            <option value={4}>4 × 4</option>
          </select>
        </label>
        <label>
          Challenge{" "}
          <select
            aria-label="Challenge"
            value={d.tier}
            onChange={(e) => change(d.size, e.target.value as SudokuTier)}
          >
            <option>Relaxed</option>
            <option>Classic</option>
            <option disabled={d.size !== 9}>Hidden singles</option>
            <option disabled={d.size !== 9}>Challenging</option>
          </select>
        </label>
      </div>
      <p className="muted sudoku-technique">
        {d.tier === "Challenging"
          ? "Challenging · Locked candidates and naked pairs."
          : d.tier === "Hidden singles"
            ? "Hidden singles · Single-candidate and hidden-single placements."
            : d.tier === "Relaxed"
              ? "Relaxed · More givens; single-candidate placements."
              : "Classic · Fewer givens; single-candidate placements."}{" "}
        {d.tier === "Hidden singles" || d.tier === "Challenging"
          ? "9 × 9 only; smaller grids start Classic."
          : "Advanced challenges use the 9 × 9 grid."}
      </p>
      <details>
        <summary>Controls & solving techniques</summary>
        <p>
          Select a square and enter a number. Arrow keys move; Home/End select
          row endpoints; Control+Home/End select board endpoints. Delete or
          Backspace erases. Pencil notes and Undo are available below.
        </p>
        <p>
          A hidden single has only one possible place in a row, column or box.
          Locked candidates confine a number to the overlap of a box and a row
          or column, removing it elsewhere in that unit. A naked pair consists
          of two squares in one unit with the same two candidates, removing
          those candidates from other squares in that unit.
        </p>
        <p>
          Show a step explains a deduction without entering a number. Hint fills
          a square. Assistance and checking are optional; nothing is revealed
          automatically. All challenges have a unique solution and can be solved
          logically without guessing.
        </p>
      </details>
      <label className="check-label sudoku-size-choice">
        <input
          type="checkbox"
          checked={largeCells}
          onChange={(e) =>
            update({ ...d, largeCells: e.target.checked }, { view: true })
          }
        />
        Larger Sudoku squares
      </label>
      <p className="muted" id="sudoku-size-help">
        {largeCells
          ? "Scroll inside the grid; navigation keeps the selected square visible."
          : "Optional larger squares keep the same puzzle."}
      </p>
      <div className="sudoku-layout">
        <div
          ref={viewport}
          className={`sudoku-viewport ${largeCells ? "large-cells" : ""}`}
          role="region"
          aria-label="Sudoku grid viewport"
          aria-describedby="sudoku-size-help"
          tabIndex={largeCells ? 0 : -1}
        >
          <div
            className="sudoku"
            data-size={d.size}
            style={{
              gridTemplateColumns: `repeat(${d.size},1fr)`,
              ...(largeCells
                ? { width: `calc(${d.size} * max(48px, 4em))` }
                : {}),
            }}
            role="group"
            aria-label={`${d.size} by ${d.size} Sudoku`}
            onKeyDown={(e) => {
              const moves: Record<string, number> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -d.size,
                ArrowDown: d.size,
              };
              if (e.key in moves) {
                e.preventDefault();
                const row = Math.floor(selected / d.size),
                  col = selected % d.size;
                const index =
                  e.key === "ArrowLeft"
                    ? row * d.size + Math.max(0, col - 1)
                    : e.key === "ArrowRight"
                      ? row * d.size + Math.min(d.size - 1, col + 1)
                      : Math.max(
                          0,
                          Math.min(d.cells.length - 1, selected + moves[e.key]),
                        );
                setSelected(index);
                document
                  .getElementById(`cell-${index}`)
                  ?.focus({ preventScroll: largeCells });
              } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                const index = e.ctrlKey
                  ? e.key === "Home"
                    ? 0
                    : d.cells.length - 1
                  : Math.floor(selected / d.size) * d.size +
                    (e.key === "Home" ? 0 : d.size - 1);
                setSelected(index);
                document
                  .getElementById(`cell-${index}`)
                  ?.focus({ preventScroll: largeCells });
              } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= d.size)
                move(Number(e.key));
              else if (e.key === "Backspace" || e.key === "Delete") {
                e.preventDefault();
                move(0);
              }
            }}
          >
            {d.cells.map((n, i) => (
              <button
                id={`cell-${i}`}
                key={i}
                className={`cell ${d.givens[i] ? "given" : ""} ${selected === i ? "selected" : ""}`}
                style={{
                  borderRightWidth: ((i % d.size) + 1) % cols === 0 ? 3 : 1,
                  borderBottomWidth:
                    (Math.floor(i / d.size) + 1) % rows === 0 ? 3 : 1,
                }}
                tabIndex={selected === i ? 0 : -1}
                aria-label={`Row ${Math.floor(i / d.size) + 1}, column ${(i % d.size) + 1}, ${n || "empty"}${d.givens[i] ? ", given" : ""}${d.notes[i].length ? `, notes ${d.notes[i].join(", ")}` : ""}`}
                aria-pressed={selected === i}
                onClick={() => setSelected(i)}
                onFocus={() => setSelected(i)}
              >
                {n || <span className="pencil">{d.notes[i].join(" ")}</span>}
              </button>
            ))}
          </div>
        </div>
        <aside className="sudoku-tools">
          <div className="square-picker">
            <label>
              Row{" "}
              <select
                aria-label="Row"
                value={Math.floor(selected / d.size)}
                onChange={(e) =>
                  setSelected(
                    Number(e.target.value) * d.size + (selected % d.size),
                  )
                }
              >
                {Array.from({ length: d.size }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Column{" "}
              <select
                aria-label="Column"
                value={selected % d.size}
                onChange={(e) =>
                  setSelected(
                    Math.floor(selected / d.size) * d.size +
                      Number(e.target.value),
                  )
                }
              >
                {Array.from({ length: d.size }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="selected-square" aria-live="polite">
            Row {Math.floor(selected / d.size) + 1}, column{" "}
            {(selected % d.size) + 1}: {d.cells[selected] || "empty"}
            {d.givens[selected] ? " (given)" : ""}
            {d.notes[selected].length
              ? ` · Notes: ${d.notes[selected].join(", ")}`
              : ""}
          </p>
          <p className="eyebrow">Numbers</p>
          <div className="numberpad">
            {Array.from({ length: d.size }, (_, i) => (
              <button
                key={i}
                onClick={() => move(i + 1)}
                disabled={!!d.givens[selected] || complete}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="actions">
            <button
              onClick={() => move(0)}
              disabled={!!d.givens[selected] || complete}
            >
              Erase
            </button>
            <button
              aria-pressed={noteMode}
              onClick={() => setNoteMode(!noteMode)}
            >
              Pencil notes {noteMode ? "on" : "off"}
            </button>
            <button
              disabled={!d.history.length || complete}
              onClick={() => {
                const prev = d.history.at(-1)!;
                update(
                  { ...d, ...prev, history: d.history.slice(0, -1) },
                  { undo: true },
                );
                setMessage("");
              }}
            >
              Undo
            </button>
            <button disabled={complete} onClick={() => hint(true)}>
              Show a step
            </button>
            <button disabled={complete} onClick={() => hint()}>
              Hint
            </button>
            <button
              onClick={() =>
                setMessage(
                  d.cells.every((n, i) => !n || n === d.solution[i])
                    ? "Your entries fit the solution so far."
                    : "Some entries differ from the solution. You can revisit them, or use a hint.",
                )
              }
            >
              Check entries
            </button>
          </div>
        </aside>
      </div>
      <p role="status">{complete ? "Puzzle complete." : message}</p>
      <div className="actions sudoku-replay">
        <button onClick={repeat ?? replay}>Replay this puzzle</button>
        <button onClick={replay}>
          {complete ? "Play another" : "Another puzzle"}
        </button>
      </div>
    </div>
  );
}
