import { useEffect, useState } from "react";
import type { FamilyContext } from "../family/useFamilyConnection";
import type { Session } from "../storage/contracts";
import { QUOTATIONS } from "../content/quotations";
import type { Gift } from "./family-data";
import { requestOpen } from "./open-request";
import { fromSession } from "./records";
import { RECORDED } from "./recorder";
import { markUploaded, pendingRecords } from "./store";

type Decision = { on: boolean; at: string };
const decisionKey = (uid: string) => `curiosity-lab:sharing:${uid}`;
export function readDecision(uid: string): Decision | null {
  try {
    return JSON.parse(localStorage.getItem(decisionKey(uid)) ?? "null");
  } catch {
    return null;
  }
}
function writeDecision(uid: string, d: Decision) {
  try {
    localStorage.setItem(decisionKey(uid), JSON.stringify(d));
  } catch {
    /* in memory only */
  }
}
const LEGACY_KEY = "curiosity-lab:legacy-uploaded";

/** Play: after Mom agrees, copy finished activity to the family whenever she is online. */
export function useActivitySync(family: FamilyContext, sessions: Session[]) {
  const approved =
    family.connection.status === "approved" ? family.connection : null;
  const [decision, setDecision] = useState<Decision | null>(() =>
    approved ? readDecision(approved.uid) : null,
  );
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [failing, setFailing] = useState(false);
  useEffect(() => {
    setDecision(approved ? readDecision(approved.uid) : null);
  }, [approved?.uid]);

  const familyId =
    approved?.membership.role === "play" ? approved.membership.familyId : null;
  const sharing = !!familyId && !!decision?.on;

  useEffect(() => {
    if (!sharing || !family.client || !familyId) return;
    let busy = false;
    let live = true;
    const run = async () => {
      if (busy || !navigator.onLine) return;
      busy = true;
      try {
        const pending = await pendingRecords();
        const sent = await family.client!.uploadActivity(familyId, pending);
        await markUploaded(sent);
        // Older games file Sessions; send any finished ones not yet shared.
        let done: string[] = [];
        try {
          done = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
        } catch {
          done = [];
        }
        const legacy = sessions
          .filter((s) => !done.includes(s.id))
          .map(fromSession);
        if (legacy.length) {
          const ok = await family.client!.uploadActivity(familyId, legacy);
          const ids = new Set(ok);
          const updated = [
            ...done,
            ...sessions
              .filter((s) => ids.has(fromSession(s).id))
              .map((s) => s.id),
          ];
          try {
            localStorage.setItem(
              LEGACY_KEY,
              JSON.stringify(updated.slice(-5000)),
            );
          } catch {
            /* retried next time */
          }
        }
        if (live) {
          setLastSync(new Date().toISOString());
          setFailing(false);
        }
      } catch {
        if (live) setFailing(true);
      } finally {
        busy = false;
      }
    };
    void run();
    const timer = setInterval(run, 60_000);
    window.addEventListener(RECORDED, run);
    window.addEventListener("online", run);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener(RECORDED, run);
      window.removeEventListener("online", run);
    };
  }, [sharing, family.client, familyId, sessions]);

  async function decide(on: boolean) {
    if (!approved) return;
    const d = { on, at: new Date().toISOString() };
    writeDecision(approved.uid, d);
    setDecision(d);
    if (familyId && family.client)
      await family.client.setSharing(familyId, on).catch(() => {});
  }

  return {
    familyId,
    decision,
    sharing,
    lastSync,
    failing,
    decide,
    needsDecision: !!familyId && !decision,
  };
}

/** The one-time question on Mom's home screen. */
export function SharingQuestion({
  onAnswer,
}: {
  onAnswer: (on: boolean) => void;
}) {
  return (
    <section className="welcome-note sharing-question">
      <h2>Share your puzzles and music with the family?</h2>
      <p>
        If you say yes, the family will see what you played and how it went: the
        pieces you named, lab cases you signed out, puzzles you finished.
        Nothing you type in a note is shared. You can turn this off any time in
        Settings.
      </p>
      <div className="actions">
        <button className="primary" onClick={() => onAnswer(true)}>
          Yes, share with the family
        </button>
        <button onClick={() => onAnswer(false)}>Not now</button>
      </div>
    </section>
  );
}

/** Gifts from Dad or the family, waiting on Mom's home screen. */
export function GiftShelf({
  family,
  familyId,
  onOpenRoom,
}: {
  family: FamilyContext;
  familyId: string | null;
  onOpenRoom: (room: "music" | "lab") => void;
}) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [quote, setQuote] = useState<Gift | null>(null);
  useEffect(() => {
    if (!familyId || !family.client) return;
    return family.client.watchGifts(familyId, setGifts, () => {});
  }, [familyId, family.client]);
  const waiting = gifts
    .filter((g) => g.status === "sent")
    .slice(-3)
    .reverse();
  if (!waiting.length && !quote) return null;
  const open = (g: Gift) => {
    if (familyId && family.client)
      void family.client.openGift(familyId, g.id).catch(() => {});
    if (g.kind === "piece") {
      requestOpen({ kind: "piece", item: g.item });
      onOpenRoom("music");
    } else if (g.kind === "bench") {
      requestOpen({ kind: "bench", item: g.item });
      onOpenRoom("lab");
    } else setQuote(g);
  };
  const q = quote && QUOTATIONS.find((x) => x.id === quote.item);
  return (
    <section className="gift-shelf" aria-label="Sent to you">
      {quote && (
        <article className="gift open">
          <p className="eyebrow">From {quote.fromName}</p>
          {quote.message && <p className="gift-message">“{quote.message}”</p>}
          {q && (
            <blockquote>
              {q.text}
              <footer>
                {q.author}, {q.source}
              </footer>
            </blockquote>
          )}
          <button onClick={() => setQuote(null)}>Close</button>
        </article>
      )}
      {waiting.map((g) => (
        <article key={g.id} className="gift">
          <p className="eyebrow">From {g.fromName}</p>
          {g.message && <p className="gift-message">“{g.message}”</p>}
          {g.title && <p className="gift-title">{g.title}</p>}
          <button className="primary" onClick={() => open(g)}>
            {g.kind === "piece"
              ? "Listen"
              : g.kind === "bench"
                ? "Open the case"
                : "Open"}
          </button>
        </article>
      ))}
    </section>
  );
}
