import { useEffect, useMemo, useState } from "react";
import { BENCH_CASES } from "../lab/bench-cases";
import { QUOTATIONS } from "../content/quotations";
import { loadRepertoire, type Excerpt } from "../music/repertoire";
import { ACTIVITY, type ActivityRecord } from "../activity/records";
import {
  newId,
  type FamilyNote,
  type Gift,
  type GiftKind,
} from "../activity/family-data";
import {
  DAY,
  areaCounts,
  highlights,
  startOfDay,
  starters,
} from "../activity/stories";
import type { useFamilyData } from "../activity/useFamilyData";
import { keep, remember } from "../puzzles/util";

type Data = ReturnType<typeof useFamilyData>;

const FRIENDLY: Record<ActivityRecord["outcome"], string> = {
  correct: "got it",
  incorrect: "had a go",
  solved: "finished",
  finished: "finished",
  revealed: "looked at the answer",
  stopped: "set it aside",
};
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
const minutes = (rs: ActivityRecord[]) =>
  Math.round(rs.reduce((a, r) => a + (r.seconds ?? 0), 0) / 60);

export function CompanionHome({ family }: { family: Data }) {
  const { data } = family;
  const records = data?.records ?? [];
  const today = startOfDay(new Date());
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const start = new Date(today.getTime() - (6 - i) * DAY);
        const end = new Date(start.getTime() + DAY);
        return {
          start,
          list: records.filter(
            (r) => new Date(r.at) >= start && new Date(r.at) < end,
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, today.getTime()],
  );
  const [chosen, setChosen] = useState(6);
  const week = days.flatMap((d) => d.list);
  const last = records[records.length - 1];
  const counts = areaCounts(week);

  if (!data) return null;
  return (
    <div className="companion">
      <section className="companion-week">
        <div className="companion-head">
          <h2>This week</h2>
          <p className="muted">
            {data.sharing?.on === false
              ? "Sharing is turned off on her iPad."
              : last
                ? `Last played ${new Date(last.at).toLocaleDateString(undefined, { weekday: "long" })} at ${time(last.at)}.`
                : "Nothing shared yet."}
          </p>
        </div>
        <div className="week-strip" role="group" aria-label="Days this week">
          {days.map((d, i) => {
            const m = minutes(d.list);
            return (
              <button
                key={i}
                aria-pressed={chosen === i}
                onClick={() => setChosen(i)}
                className="week-day"
              >
                <span>
                  {d.start.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span
                  className="week-dot"
                  style={
                    {
                      "--size": `${d.list.length ? 14 + Math.min(30, m / 3) : 8}px`,
                    } as React.CSSProperties
                  }
                  data-empty={!d.list.length}
                />
                <small>{d.list.length ? `${m} min` : "—"}</small>
              </button>
            );
          })}
        </div>
        <div className="area-counts">
          {Object.entries(counts).map(([area, n]) => (
            <div key={area}>
              <strong>{n}</strong>
              <span>{area}</span>
            </div>
          ))}
        </div>
        <div className="day-list">
          <h3>
            {days[chosen].start.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {days[chosen].list.length ? (
            <ul>
              {days[chosen].list.map((r) => (
                <li key={r.id}>
                  <span className="day-time">{time(r.at)}</span>
                  <span>
                    <strong>{ACTIVITY[r.activity].label}</strong>
                    {r.title.startsWith(ACTIVITY[r.activity].label)
                      ? r.title.slice(ACTIVITY[r.activity].label.length)
                      : ` · ${r.title}`}{" "}
                    · {FRIENDLY[r.outcome]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">A day off.</p>
          )}
        </div>
      </section>

      <div className="companion-grid">
        <section className="companion-card">
          <h2>Highlights</h2>
          <ul className="highlights">
            {highlights(week).map((h, i) => (
              <li key={i}>
                {h.text}
                <small>
                  {" "}
                  ·{" "}
                  {new Date(h.at).toLocaleDateString(undefined, {
                    weekday: "long",
                  })}
                </small>
              </li>
            ))}
            {!highlights(week).length && (
              <li className="muted">Highlights appear as she plays.</li>
            )}
          </ul>
        </section>
        <section className="companion-card">
          <h2>Something to talk about</h2>
          <ul className="starters">
            {starters(records).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="companion-grid">
        <Notes family={family} />
        <SendSomething family={family} />
      </div>
    </div>
  );
}

export function Notes({
  family,
  author = "companion",
  limit = 6,
}: {
  family: Data;
  author?: FamilyNote["author"];
  limit?: number;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState(
    () =>
      remember(`${author}:name`, { name: author === "companion" ? "Dad" : "" })
        .name,
  );
  const [status, setStatus] = useState("");
  const notes = [...(family.data?.notes ?? [])].reverse().slice(0, limit);
  async function save() {
    if (!text.trim()) return;
    if (!name.trim())
      return setStatus("Add your name so the family knows who wrote it.");
    keep(`${author}:name`, { name });
    if (family.data?.fictional || !family.familyId || !family.client) {
      setStatus("This is the fictional example, so the note wasn’t saved.");
      return;
    }
    try {
      await family.client.addNote(family.familyId, {
        v: 1,
        id: newId(),
        at: new Date().toISOString(),
        author,
        name: name.trim().slice(0, 40),
        text: text.trim().slice(0, 2000),
      });
      setText("");
      setStatus("Saved.");
    } catch {
      setStatus("Couldn’t save just now. Please try again in a moment.");
    }
  }
  return (
    <section className="companion-card">
      <h2>{author === "companion" ? "A quick note" : "Notes"}</h2>
      <p className="muted">
        {author === "companion"
          ? "How was today? Anything you noticed. Only the family sees these."
          : "Context the numbers can’t carry: sleep, visits, appointments, a medication change. Mom never sees these."}
      </p>
      <textarea
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Note"
      />
      <div className="actions">
        <label className="inline-label">
          From{" "}
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            size={10}
          />
        </label>
        <button className="primary" onClick={save} disabled={!text.trim()}>
          Save note
        </button>
      </div>
      {status && <p role="status">{status}</p>}
      <ul className="note-list">
        {notes.map((n) => (
          <li key={n.id}>
            <small>
              {n.name} ·{" "}
              {new Date(n.at).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </small>
            <p>{n.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SendSomething({
  family,
  from = "companion",
}: {
  family: Data;
  from?: Gift["from"];
}) {
  const [kind, setKind] = useState<GiftKind>("piece");
  const [pieces, setPieces] = useState<Excerpt[]>([]);
  const [item, setItem] = useState("");
  const [message, setMessage] = useState("");
  const [fromName, setFromName] = useState(
    () =>
      remember(`${from}:gift-name`, { name: from === "companion" ? "Dad" : "" })
        .name,
  );
  const [status, setStatus] = useState("");
  useEffect(() => {
    loadRepertoire().then(setPieces, () => {});
  }, []);
  const options: { id: string; title: string }[] =
    kind === "piece"
      ? pieces.map((p) => ({ id: p.id, title: `${p.title} (${p.composer})` }))
      : kind === "bench"
        ? BENCH_CASES.map((c) => ({
            id: c.id,
            title: `${c.title} (${c.from})`,
          }))
        : kind === "quote"
          ? QUOTATIONS.map((q) => ({
              id: q.id,
              title: `${q.author}: ${q.text.slice(0, 70)}${q.text.length > 70 ? "…" : ""}`,
            }))
          : [];
  const sent = (family.data?.gifts ?? [])
    .filter((g) => g.from === from)
    .slice(-4)
    .reverse();
  async function send() {
    if (!fromName.trim())
      return setStatus("Add your name so she knows who it’s from.");
    if (kind !== "message" && !item)
      return setStatus("Choose something to send.");
    if (kind === "message" && !message.trim())
      return setStatus("Write a short message.");
    keep(`${from}:gift-name`, { name: fromName });
    if (family.data?.fictional || !family.familyId || !family.client)
      return setStatus("This is the fictional example, so nothing was sent.");
    const chosen = options.find((o) => o.id === item);
    try {
      await family.client.sendGift(family.familyId, {
        v: 1,
        id: newId(),
        at: new Date().toISOString(),
        from,
        fromName: fromName.trim().slice(0, 40),
        kind,
        item: kind === "message" ? "" : item,
        title:
          (kind === "piece"
            ? chosen?.title.replace(/ \(.*\)$/, "")
            : chosen?.title) ?? "",
        message: message.trim().slice(0, 500),
        status: "sent",
      });
      setMessage("");
      setItem("");
      setStatus("Sent. It will be waiting on her home screen.");
    } catch {
      setStatus("Couldn’t send just now. Please try again in a moment.");
    }
  }
  return (
    <section className="companion-card">
      <h2>Send something to Mom</h2>
      <p className="muted">It appears on her home screen with your name.</p>
      <div className="segmented" role="group" aria-label="What to send">
        {(
          [
            ["piece", "A piece of music"],
            ["bench", "A lab case"],
            ["quote", "A quotation"],
            ["message", "Just a message"],
          ] as [GiftKind, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              setItem("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {kind !== "message" && (
        <select
          value={item}
          onChange={(e) => setItem(e.target.value)}
          aria-label="Choose"
        >
          <option value="">Choose…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      )}
      <textarea
        rows={2}
        maxLength={500}
        placeholder="A few words (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Message"
      />
      <div className="actions">
        <label className="inline-label">
          From{" "}
          <input
            value={fromName}
            maxLength={40}
            onChange={(e) => setFromName(e.target.value)}
            size={10}
          />
        </label>
        <button className="primary" onClick={send}>
          Send
        </button>
      </div>
      {status && <p role="status">{status}</p>}
      {sent.length > 0 && (
        <ul className="note-list">
          {sent.map((g) => (
            <li key={g.id}>
              <small>
                {new Date(g.at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {g.status === "opened" ? "She opened it" : "Waiting for her"}
              </small>
              <p>{g.title || g.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
