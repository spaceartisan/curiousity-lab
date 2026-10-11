import { useMemo, useState } from "react";
import manifest from "../../public/media/lab/manifest.json";
import {
  BENCH_CASES,
  NOT_DONE,
  ORGANISMS,
  TESTS,
  type BenchCase,
  type Finding,
  type TestId,
} from "./bench-cases";
import type { LabProgress } from "./lab-progress";

const credits = new Map(
  (
    manifest as {
      file: string;
      credit: string;
      year: string;
      sourceCaption: string;
      sourceUrl: string;
    }[]
  ).map((m) => [m.file, m]),
);
const src = (file: string) => import.meta.env.BASE_URL + "media/lab/" + file;

function Photo({
  file,
  alt,
  revealed,
}: {
  file: string;
  alt: string;
  revealed: boolean;
}) {
  const [big, setBig] = useState(false);
  const c = credits.get(file);
  return (
    <figure className={big ? "bench-photo big" : "bench-photo"}>
      <button
        className="bench-photo-button"
        onClick={() => setBig(!big)}
        aria-label={big ? "Show smaller" : "Enlarge image"}
      >
        <img src={src(file)} alt={alt} loading="lazy" />
      </button>
      {c && (
        <figcaption>
          {revealed ? `${c.sourceCaption} ` : ""}
          <a href={c.sourceUrl} target="_blank" rel="noreferrer">
            {c.credit}
            {c.year ? `, ${c.year}` : ""}
          </a>
        </figcaption>
      )}
    </figure>
  );
}

function Result({
  finding,
  revealed,
}: {
  finding: Finding;
  revealed: boolean;
}) {
  return (
    <div className="bench-result">
      <p>{finding.text}</p>
      {finding.image && (
        <Photo file={finding.image} alt={finding.text} revealed={revealed} />
      )}
    </div>
  );
}

export function BenchUnknowns({
  progress,
  onProgress,
}: {
  progress: LabProgress;
  onProgress: (p: LabProgress) => void;
}) {
  const [caseId, setCaseId] = useState<string | null>(
    progress.benchDraft?.caseId ?? null,
  );
  const current = BENCH_CASES.find((c) => c.id === caseId);
  if (!current)
    return (
      <CaseList
        progress={progress}
        onOpen={(c) => {
          setCaseId(c.id);
          if (progress.benchDraft?.caseId !== c.id)
            onProgress({
              ...progress,
              benchDraft: { caseId: c.id, seen: [], ordered: [] },
            });
        }}
      />
    );
  return (
    <Workup
      key={current.id}
      c={current}
      progress={progress}
      onProgress={onProgress}
      onClose={() => {
        setCaseId(null);
      }}
    />
  );
}

function CaseList({
  progress,
  onOpen,
}: {
  progress: LabProgress;
  onOpen: (c: BenchCase) => void;
}) {
  const done = new Set(progress.bench.map((r) => r.caseId));
  return (
    <div className="bench-list">
      <p className="muted">
        Each unknown arrives with a requisition. Read the Gram stain and the
        plates, set up whatever bench tests you like, and sign out an
        identification.
      </p>
      <div className="bench-cards">
        {BENCH_CASES.map((c) => (
          <button key={c.id} className="bench-card" onClick={() => onOpen(c)}>
            <strong>{c.title}</strong>
            <span>{c.from}</span>
            <small>
              {progress.benchDraft?.caseId === c.id
                ? "In progress"
                : done.has(c.id)
                  ? "Signed out · open again"
                  : c.specimen}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Workup({
  c,
  progress,
  onProgress,
  onClose,
}: {
  c: BenchCase;
  progress: LabProgress;
  onProgress: (p: LabProgress) => void;
  onClose: () => void;
}) {
  const draft =
    progress.benchDraft?.caseId === c.id
      ? progress.benchDraft
      : { caseId: c.id, seen: [], ordered: [] };
  const [answer, setAnswer] = useState("");
  const [comment, setComment] = useState("");
  const [signed, setSigned] = useState<null | {
    answer: string;
    correct: boolean;
  }>(null);
  const seen = new Set(draft.seen);
  const save = (next: typeof draft) =>
    onProgress({ ...progress, benchDraft: next });
  const look = (step: string) =>
    !seen.has(step) && save({ ...draft, seen: [...draft.seen, step] });
  const order = (t: TestId) =>
    !draft.ordered.includes(t) &&
    save({ ...draft, ordered: [...draft.ordered, t] });
  const groups = useMemo(() => [...new Set(TESTS.map((t) => t.group))], []);
  const orgGroups = useMemo(
    () => [...new Set(ORGANISMS.map((o) => o.group))],
    [],
  );
  const revealed = !!signed;

  function signOut() {
    const correct = answer === c.answer;
    setSigned({ answer, correct });
    onProgress({
      ...progress,
      benchDraft: undefined,
      bench: [
        ...progress.bench,
        {
          caseId: c.id,
          at: new Date().toISOString(),
          ordered: draft.ordered,
          answer,
          correct,
          comment,
        },
      ],
    });
  }

  return (
    <div className="bench">
      <button className="back-button" onClick={onClose}>
        ← All unknowns
      </button>
      <section className="requisition">
        <p className="eyebrow">Requisition</p>
        <h2>{c.title}</h2>
        <dl>
          <dt>From</dt>
          <dd>{c.from}</dd>
          <dt>Specimen</dt>
          <dd>{c.specimen}</dd>
          <dt>History</dt>
          <dd>{c.history}</dd>
        </dl>
        {c.scene && <Photo file={c.scene} alt="The farm" revealed={revealed} />}
      </section>

      <section className="bench-step">
        <h3>Gram stain</h3>
        {seen.has("gram") || revealed ? (
          <Result finding={c.gram} revealed={revealed} />
        ) : (
          <button className="primary" onClick={() => look("gram")}>
            Read the slide
          </button>
        )}
      </section>

      <section className="bench-step">
        <h3>Primary plates</h3>
        {seen.has("plates") || revealed ? (
          c.plates.map((p) => (
            <div key={p.medium} className="bench-plate">
              <h4>{p.medium}</h4>
              <Result finding={p.finding} revealed={revealed} />
            </div>
          ))
        ) : (
          <button className="primary" onClick={() => look("plates")}>
            Take the plates out of the incubator
          </button>
        )}
      </section>

      <section className="bench-step">
        <h3>Bench tests</h3>
        <p className="muted">
          Set up any test. Results go onto your worksheet below in the order you
          ran them.
        </p>
        {groups.map((g) => (
          <div key={g} className="bench-test-group">
            <h4>{g}</h4>
            <div className="bench-tests">
              {TESTS.filter((t) => t.group === g).map((t) => (
                <button
                  key={t.id}
                  aria-pressed={draft.ordered.includes(t.id)}
                  onClick={() => order(t.id)}
                  disabled={revealed}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {draft.ordered.length > 0 && (
          <ol className="worksheet" aria-label="Worksheet">
            {draft.ordered.map((t) => (
              <li key={t}>
                <strong>{TESTS.find((x) => x.id === t)!.name}</strong>
                <Result
                  finding={c.tests[t] ?? { text: NOT_DONE }}
                  revealed={revealed}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="bench-step signout">
        <h3>Sign out</h3>
        {!signed ? (
          <>
            <label>
              Identification
              <select
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              >
                <option value="">Choose an organism…</option>
                {orgGroups.map((g) => (
                  <optgroup key={g} label={g}>
                    {ORGANISMS.filter((o) => o.group === g).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              Comment for the report (optional)
              <textarea
                value={comment}
                maxLength={500}
                rows={2}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <button className="primary" disabled={!answer} onClick={signOut}>
              Sign out the report
            </button>
          </>
        ) : (
          <div className="bench-verdict">
            <p className={signed.correct ? "ntp-verdict right" : "ntp-verdict"}>
              {signed.correct
                ? "Agrees with the reference identification."
                : `The reference identification differs from ${ORGANISMS.find((o) => o.id === signed.answer)?.name}.`}
            </p>
            <h3 className="bench-answer">
              {ORGANISMS.find((o) => o.id === c.answer)?.name}
            </h3>
            <h4>Key findings</h4>
            <ul>
              {c.keyFindings.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p>{c.note}</p>
            <div className="actions">
              <button className="primary" onClick={onClose}>
                Next unknown
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
