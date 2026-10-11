// Turns records into plain-language highlights and conversation starters for Dad.
import { BENCH_CASES } from "../lab/bench-cases";
import { QUOTATIONS } from "../content/quotations";
import { ACTIVITY, type ActivityRecord } from "./records";

export const DAY = 86_400_000;
export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export const weekday = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
const pieceTitle = (r: ActivityRecord) => r.title.split(" — ")[0];

/** A few good moments worth mentioning, newest first. */
export function highlights(
  records: ActivityRecord[],
  limit = 6,
): { text: string; at: string }[] {
  const out: { text: string; at: string; weight: number }[] = [];
  for (const r of records) {
    const d = r.detail;
    if (r.activity === "name-that-piece" && r.outcome === "correct")
      out.push({
        text: `Recognized ${pieceTitle(r)}${d.meet === "score" ? " from the sheet music" : " by ear"}`,
        at: r.at,
        weight: d.meet === "score" ? 3 : 2,
      });
    if (r.activity === "play-it-yourself")
      out.push({
        text: `Played ${pieceTitle(r)} on the keyboard`,
        at: r.at,
        weight: 3,
      });
    if (r.activity === "bench" && r.outcome === "correct") {
      const c = BENCH_CASES.find((x) => x.id === r.item);
      out.push({
        text: `Worked up a lab unknown, “${c?.title ?? r.title}”, and identified it`,
        at: r.at,
        weight: 3,
      });
    }
    if (r.activity === "differential")
      out.push({
        text: `Counted a 100-cell blood differential (“${r.title}”)`,
        at: r.at,
        weight: 2,
      });
    if (r.activity === "killer" && r.outcome === "solved")
      out.push({
        text: `Solved a ${String(d.tier ?? "").toLowerCase()} Killer Sudoku`,
        at: r.at,
        weight: d.tier === "Challenging" ? 3 : 2,
      });
    if (r.activity === "countdown" && r.outcome === "solved")
      out.push({
        text: `Hit a Countdown target exactly (${r.title.replace("Countdown · ", "")})`,
        at: r.at,
        weight: 1,
      });
    if (r.activity === "cryptogram")
      out.push({
        text: `Decoded a quotation by ${r.title.split(":")[0]}`,
        at: r.at,
        weight: 2,
      });
    if (r.activity === "hive" && d.pangram)
      out.push({
        text: "Found the seven-letter word in a Letter Hive",
        at: r.at,
        weight: 2,
      });
    if (r.activity === "ladder" && String(r.item).startsWith("carroll"))
      out.push({
        text: `Solved one of Lewis Carroll’s own word ladders: ${r.title}`,
        at: r.at,
        weight: 3,
      });
  }
  return out
    .sort((a, b) => b.weight - a.weight || b.at.localeCompare(a.at))
    .slice(0, limit)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Gentle openers drawn from what she actually did. Never quizzes her on it. */
export function starters(records: ActivityRecord[], limit = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of [...records].reverse()) {
    let s = "";
    if (r.activity === "bench") {
      const c = BENCH_CASES.find((x) => x.id === r.item);
      if (c)
        s = `She worked a lab case, “${c.title}” (${c.from.toLowerCase()}), on ${weekday(r.at)}. Ask what cases like that were like in her lab days.`;
    } else if (
      r.activity === "name-that-piece" ||
      r.activity === "play-it-yourself"
    ) {
      s = `Put on ${pieceTitle(r)} together. She heard it on ${weekday(r.at)}. Ask if she ever played it.`;
    } else if (r.activity === "differential") {
      s =
        "She counted a blood smear the way she did in the hospital. Ask her about working in hematology.";
    } else if (r.activity === "cryptogram") {
      const q = QUOTATIONS.find((x) => x.id === r.item);
      if (q)
        s = `She decoded “${q.text}” (${q.author}). Ask what she makes of it.`;
    } else if (
      r.activity === "ladder" &&
      String(r.item).startsWith("carroll")
    ) {
      s =
        "Lewis Carroll invented word ladders, and she solved one of his. Try one out loud together: CAT to DOG.";
    } else if (r.activity === "killer" || r.activity === "sudoku") {
      s =
        "She has been doing Sudoku. Ask her to show you her favorite trick for finding a number.";
    }
    const key =
      r.activity +
      (r.activity === "bench" || r.activity === "cryptogram" ? r.item : "");
    if (s && !seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
    if (out.length >= limit) break;
  }
  return out;
}

export function areaCounts(records: ActivityRecord[]) {
  const counts: Record<string, number> = {
    Music: 0,
    Lab: 0,
    Numbers: 0,
    Words: 0,
  };
  for (const r of records) counts[ACTIVITY[r.activity].area]++;
  return counts;
}
