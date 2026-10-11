import { useEffect, useMemo, useState } from "react";
import { strike, unlockPiano } from "../games/piano";
import {
  CELL_KEYS,
  CELL_NAMES,
  HEME_CASES,
  buildSlide,
  type CellType,
  type HemeCase,
} from "./heme-cases";
import type { LabProgress } from "./lab-progress";

const cellSrc = (file: string) =>
  import.meta.env.BASE_URL + "media/cells/" + file;
const WBC_TYPES = CELL_KEYS.filter((k) => k.id !== "nrbc").map((k) => k.id);

export function Differential({
  progress,
  onProgress,
  sound,
}: {
  progress: LabProgress;
  onProgress: (p: LabProgress) => void;
  sound: boolean;
}) {
  const [active, setActive] = useState<HemeCase | null>(null);
  if (!active)
    return (
      <div className="bench-list">
        <p className="muted">
          A 100-cell manual differential on real Wright-stained cells, one cell
          at a time, the way you would scan a smear. Tap a key on the counter
          for each cell; the bell rings at 100.
        </p>
        <div className="bench-cards">
          {HEME_CASES.map((c) => (
            <button
              key={c.id}
              className="bench-card"
              onClick={() => setActive(c)}
            >
              <strong>{c.title}</strong>
              <span>{c.patient}</span>
              <small>
                {progress.diffs.some((d) => d.caseId === c.id)
                  ? "Counted · count again"
                  : `WBC ${c.wbc} × 10⁹/L`}
              </small>
            </button>
          ))}
        </div>
        <p className="ntp-source">
          Cell images: Acevedo A, et al. Peripheral blood cell dataset, Hospital
          Clínic de Barcelona, Data in Brief 2020 (CC BY 4.0), resized. Labels
          are the dataset’s expert annotations.
        </p>
      </div>
    );
  return (
    <Counter
      key={active.id}
      c={active}
      sound={sound}
      onClose={() => setActive(null)}
      onDone={(counts, agreement) =>
        onProgress({
          ...progress,
          diffs: [
            ...progress.diffs,
            {
              caseId: active.id,
              at: new Date().toISOString(),
              counts,
              agreement,
            },
          ],
        })
      }
    />
  );
}

function Counter({
  c,
  sound,
  onClose,
  onDone,
}: {
  c: HemeCase;
  sound: boolean;
  onClose: () => void;
  onDone: (
    counts: Partial<Record<CellType, number>>,
    agreement: number,
  ) => void;
}) {
  const slide = useMemo(() => buildSlide(c, c.id.length * 7919 + 17), [c]);
  const [calls, setCalls] = useState<CellType[]>([]);
  const wbcCounted = calls.filter((t) => t !== "nrbc").length;
  const finished = calls.length === slide.length;
  const cell = slide[calls.length];

  const tally = (list: (CellType | undefined)[]) =>
    Object.fromEntries(
      CELL_KEYS.map((k) => [k.id, list.filter((t) => t === k.id).length]),
    ) as Record<CellType, number>;
  const mine = tally(calls);
  const truth = tally(slide.map((s) => s.type));

  function call(type: CellType) {
    if (finished) return;
    const next = [...calls, type];
    setCalls(next);
    if (sound)
      void unlockPiano().then((ctx) => {
        strike(type === "nrbc" ? 79 : 84, ctx.currentTime, 0.06, 40);
        if (next.filter((t) => t !== "nrbc").length === 100 && type !== "nrbc")
          strike(96, ctx.currentTime + 0.05, 1.6, 90);
      });
    if (next.length === slide.length) {
      const agree = next.filter((t, i) => t === slide[i].type).length;
      onDone(tally(next), Math.round((agree / slide.length) * 100));
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const k = CELL_KEYS.find((x) => x.key === e.key);
      if (k) {
        e.preventDefault();
        call(k.id);
      } else if (e.key === "Backspace") setCalls((c) => c.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="diff">
      <button className="back-button" onClick={onClose}>
        ← All smears
      </button>
      <section className="requisition">
        <p className="eyebrow">CBC with manual differential</p>
        <h2>{c.title}</h2>
        <dl>
          <dt>Patient</dt>
          <dd>{c.patient}</dd>
          <dt>History</dt>
          <dd>{c.history}</dd>
          <dt>WBC</dt>
          <dd>{c.wbc} × 10⁹/L</dd>
        </dl>
      </section>

      {!finished ? (
        <section className="diff-scope">
          <div className="diff-cell">
            <img src={cellSrc(cell.file)} alt="Cell to classify" />
            <p className="diff-progress" aria-live="polite">
              {wbcCounted} of 100 white cells
            </p>
          </div>
          <div
            className="diff-keys"
            role="group"
            aria-label="Differential counter"
          >
            {CELL_KEYS.map((k) => (
              <button key={k.id} onClick={() => call(k.id)}>
                <strong>{k.label}</strong>
                <small>{mine[k.id]}</small>
              </button>
            ))}
          </div>
          <div className="actions">
            <button
              onClick={() => setCalls(calls.slice(0, -1))}
              disabled={!calls.length}
            >
              Undo last cell
            </button>
          </div>
        </section>
      ) : (
        <Results
          c={c}
          slide={slide}
          calls={calls}
          mine={mine}
          truth={truth}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function Results({
  c,
  slide,
  calls,
  mine,
  truth,
  onClose,
}: {
  c: HemeCase;
  slide: { type: CellType; file: string }[];
  calls: CellType[];
  mine: Record<CellType, number>;
  truth: Record<CellType, number>;
  onClose: () => void;
}) {
  const differences = slide
    .map((s, i) => ({ ...s, called: calls[i] }))
    .filter((s) => s.called !== s.type);
  const agree = slide.length - differences.length;
  return (
    <section className="diff-results">
      <h3>Your differential</h3>
      <div className="table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>Cell</th>
              <th>Your count</th>
              <th>Reference</th>
              <th>× 10⁹/L</th>
            </tr>
          </thead>
          <tbody>
            {CELL_KEYS.filter((k) => mine[k.id] || truth[k.id]).map((k) => (
              <tr key={k.id}>
                <td>{CELL_NAMES[k.id]}</td>
                <td>
                  {mine[k.id]}
                  {k.id === "nrbc" ? " /100 WBC" : "%"}
                </td>
                <td>
                  {truth[k.id]}
                  {k.id === "nrbc" ? " /100 WBC" : "%"}
                </td>
                <td>
                  {WBC_TYPES.includes(k.id)
                    ? ((c.wbc * mine[k.id]) / 100).toFixed(1)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Your calls matched the reference labels on {agree} of {slide.length}{" "}
        cells.
        {differences.length > 0 &&
          " The ones that differ are below. Band versus seg is the classic disagreement, even between experienced morphologists."}
      </p>
      <p className="ntp-hint">{c.interpretation}</p>
      {differences.length > 0 && (
        <details className="diff-review">
          <summary>Review the {differences.length} cells that differed</summary>
          <div className="diff-gallery">
            {differences.map((d, i) => (
              <figure key={i}>
                <img
                  src={cellSrc(d.file)}
                  alt={CELL_NAMES[d.type]}
                  loading="lazy"
                />
                <figcaption>
                  You: {CELL_NAMES[d.called]}
                  <br />
                  Reference: {CELL_NAMES[d.type]}
                </figcaption>
              </figure>
            ))}
          </div>
        </details>
      )}
      <div className="actions">
        <button className="primary" onClick={onClose}>
          Another smear
        </button>
      </div>
    </section>
  );
}
