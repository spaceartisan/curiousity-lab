import { useEffect, useState } from "react";
import { keep, remember } from "./util";

export interface CountdownRound {
  id: string;
  numbers: number[];
  target: number;
  solution: [number, string, number, number][];
}

type Op = "+" | "−" | "×" | "÷";
const SYMBOL: Record<string, Op> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
interface Tile {
  id: number;
  value: number;
}
interface Step {
  a: number;
  op: Op;
  b: number;
  result: number;
}

function apply(a: number, op: Op, b: number): number | null {
  if (op === "+") return a + b;
  if (op === "×") return a * b;
  if (op === "−") return a > b ? a - b : null;
  return b !== 0 && a % b === 0 ? a / b : null;
}

export function Countdown({ rounds }: { rounds: CountdownRound[] }) {
  const [saved, setSaved] = useState(() =>
    remember("countdown:v1", {
      index: 0,
      solved: [] as string[],
      clock: false,
    }),
  );
  const round = rounds[saved.index % rounds.length];
  const fresh = () => round.numbers.map((value, id) => ({ id, value }));
  const [tiles, setTiles] = useState<Tile[]>(fresh);
  const [steps, setSteps] = useState<{ step: Step; before: Tile[] }[]>([]);
  const [pick, setPick] = useState<{ tile?: Tile; op?: Op }>({});
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    setTiles(fresh());
    setSteps([]);
    setPick({});
    setMessage("");
    setShown(false);
    setSeconds(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  const done = tiles.some((t) => t.value === round.target);
  const closest = Math.min(
    ...tiles.map((t) => Math.abs(t.value - round.target)),
  );

  useEffect(() => {
    if (!saved.clock || done || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [saved.clock, done, seconds]);

  function persist(next: typeof saved) {
    setSaved(next);
    keep("countdown:v1", next);
  }

  function tap(tile: Tile) {
    if (done) return;
    if (!pick.tile || !pick.op) {
      setPick({ tile });
      setMessage("");
      return;
    }
    if (tile.id === pick.tile.id) return;
    const result = apply(pick.tile.value, pick.op, tile.value);
    if (result === null) {
      setMessage(
        pick.op === "÷"
          ? `${pick.tile.value} doesn’t divide evenly by ${tile.value}.`
          : "Results must stay positive; subtract the smaller from the larger.",
      );
      setPick({});
      return;
    }
    const newTile = {
      id: Math.max(...tiles.map((t) => t.id)) + 1,
      value: result,
    };
    const next = [
      ...tiles.filter((t) => t.id !== pick.tile!.id && t.id !== tile.id),
      newTile,
    ];
    setSteps([
      ...steps,
      {
        step: { a: pick.tile.value, op: pick.op, b: tile.value, result },
        before: tiles,
      },
    ]);
    setTiles(next);
    setPick({ tile: newTile });
    if (result === round.target) {
      setMessage("Exactly right.");
      if (!saved.solved.includes(round.id))
        persist({ ...saved, solved: [...saved.solved, round.id] });
    }
  }

  return (
    <div className="countdown">
      <p className="muted">
        Reach the target using any of the six numbers, once each, with + − × ÷.
        Every step must give a whole, positive number.
      </p>
      <div className="cd-target" aria-live="polite">
        <span>Target</span>
        <strong>{round.target}</strong>
        {saved.clock && !done && (
          <em className={seconds <= 5 ? "cd-clock low" : "cd-clock"}>
            {seconds > 0 ? `${seconds}s` : "Time"}
          </em>
        )}
      </div>
      <div className="cd-tiles">
        {tiles.map((t) => (
          <button
            key={t.id}
            className={pick.tile?.id === t.id ? "cd-tile selected" : "cd-tile"}
            onClick={() => tap(t)}
          >
            {t.value}
          </button>
        ))}
      </div>
      <div className="cd-ops" role="group" aria-label="Operation">
        {(["+", "−", "×", "÷"] as Op[]).map((op) => (
          <button
            key={op}
            aria-pressed={pick.op === op}
            disabled={!pick.tile || done}
            onClick={() => setPick({ ...pick, op })}
          >
            {op}
          </button>
        ))}
      </div>
      <p className="piy-status" aria-live="polite">
        {message ||
          (done
            ? "Exactly right."
            : pick.tile && pick.op
              ? `${pick.tile.value} ${pick.op} … choose the next number`
              : pick.tile
                ? `${pick.tile.value}: now choose an operation`
                : closest === 0
                  ? ""
                  : `Closest so far: ${closest} away`)}
      </p>
      {steps.length > 0 && (
        <ol className="cd-steps">
          {steps.map(({ step }, i) => (
            <li key={i}>
              {step.a} {step.op} {step.b} = <strong>{step.result}</strong>
            </li>
          ))}
        </ol>
      )}
      <div className="actions">
        <button
          disabled={!steps.length}
          onClick={() => {
            const last = steps[steps.length - 1];
            setTiles(last.before);
            setSteps(steps.slice(0, -1));
            setPick({});
            setMessage("");
          }}
        >
          Undo step
        </button>
        <button
          onClick={() => {
            setTiles(fresh());
            setSteps([]);
            setPick({});
            setMessage("");
          }}
        >
          Start over
        </button>
        <button onClick={() => setShown(!shown)}>
          {shown ? "Hide the solution" : "Show a solution"}
        </button>
        <button
          className={done ? "primary" : ""}
          onClick={() => persist({ ...saved, index: saved.index + 1 })}
        >
          New numbers
        </button>
      </div>
      {shown && (
        <ol className="cd-steps solution">
          {round.solution.map(([a, op, b, r], i) => (
            <li key={i}>
              {a} {SYMBOL[op]} {b} = <strong>{r}</strong>
            </li>
          ))}
        </ol>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={saved.clock}
          onChange={(e) => persist({ ...saved, clock: e.target.checked })}
        />
        Play against the 30-second clock
      </label>
    </div>
  );
}
