// Fictional family data so Companion and Insights can be explored before anything is shared.
import { BENCH_CASES } from "../lab/bench-cases";
import { HEME_CASES } from "../lab/heme-cases";
import { QUOTATIONS } from "../content/quotations";
import type { ActivityRecord, ActivityKind, Outcome } from "./records";
import type { FamilyNote, Gift, SharingState } from "./family-data";

const PIECES: [string, string, "classical" | "ragtime" | "hymn"][] = [
  ["fur-elise", "Für Elise — Ludwig van Beethoven", "classical"],
  [
    "moonlight",
    "“Moonlight” Sonata, first movement — Ludwig van Beethoven",
    "classical",
  ],
  ["clair-de-lune", "Clair de lune — Claude Debussy", "classical"],
  ["entertainer", "The Entertainer — Scott Joplin", "ragtime"],
  ["maple-leaf", "Maple Leaf Rag — Scott Joplin", "ragtime"],
  ["solace", "Solace — Scott Joplin", "ragtime"],
  ["amazing-grace", "Amazing Grace — Tune NEW BRITAIN, American", "hymn"],
  ["it-is-well", "It Is Well with My Soul — Philip P. Bliss", "hymn"],
  ["be-still", "Be Still, My Soul — Jean Sibelius", "hymn"],
  ["prelude-e-minor", "Prelude in E minor — Frédéric Chopin", "classical"],
  ["gymnopedie-1", "Gymnopédie No. 1 — Erik Satie", "classical"],
  ["minute-waltz", "“Minute” Waltz — Frédéric Chopin", "classical"],
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FamilyData {
  records: ActivityRecord[];
  notes: FamilyNote[];
  gifts: Gift[];
  sharing: SharingState | null;
  fictional: boolean;
}

export function fictionalFamily(now = new Date()): FamilyData {
  const r = rng(20261012);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const records: ActivityRecord[] = [];
  let n = 0;
  const add = (
    day: Date,
    activity: ActivityKind,
    item: string,
    title: string,
    outcome: Outcome,
    seconds: number,
    detail: ActivityRecord["detail"],
  ) => {
    records.push({
      v: 1,
      id: `demo${String(++n).padStart(6, "0")}`,
      at: day.toISOString(),
      seconds: Math.round(seconds),
      tz: "America/New_York",
      app: "0.33.0",
      activity,
      item,
      title,
      outcome,
      detail,
    });
  };
  for (let back = 69; back >= 0; back--) {
    const date = new Date(now);
    date.setDate(date.getDate() - back);
    if (r() < 0.28) continue; // some days off
    let minute = (13 + Math.floor(r() * 5)) * 60 + Math.floor(r() * 60); // afternoons, sometimes mornings
    if (r() < 0.25)
      minute = (9 + Math.floor(r() * 2)) * 60 + Math.floor(r() * 60);
    const sessions = 2 + Math.floor(r() * 4);
    for (let k = 0; k < sessions; k++) {
      const t = new Date(date);
      t.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      if (t > now) break;
      const roll = r();
      if (roll < 0.3) {
        const [id, title, family] = pick(PIECES);
        const heard = records.filter((x) => x.item === id).length;
        const outcome: Outcome =
          r() < (family === "hymn" ? 0.9 : 0.78) + Math.min(0.1, heard * 0.03)
            ? "correct"
            : "incorrect";
        add(t, "name-that-piece", id, title, outcome, 40 + r() * 90, {
          family,
          meet: r() < 0.3 ? "score" : "ear",
          answer: "choices",
          clues: outcome === "incorrect" ? 1 : 0,
          heard,
        });
        if (r() < 0.25)
          add(t, "play-it-yourself", id, title, "solved", 120 + r() * 300, {
            notes: 30,
            wrongNotes: Math.floor(r() * 9),
          });
      } else if (roll < 0.48) {
        const c = pick(BENCH_CASES);
        const ok = r() < 0.8;
        add(
          t,
          "bench",
          c.id,
          `${c.title} (${c.from})`,
          ok ? "correct" : "incorrect",
          300 + r() * 600,
          {
            organism: c.answer,
            tests: 3 + Math.floor(r() * 5),
          },
        );
      } else if (roll < 0.56) {
        const c = pick(HEME_CASES);
        add(t, "differential", c.id, c.title, "finished", 400 + r() * 500, {
          agreement: 84 + Math.floor(r() * 14),
          cells: 100,
        });
      } else if (roll < 0.7) {
        const tier = pick(["Gentle", "Classic", "Classic", "Challenging"]);
        add(
          t,
          "killer",
          `killer-${tier.toLowerCase()}-${1 + Math.floor(r() * 10)}`,
          `Killer Sudoku · ${tier}`,
          r() < 0.85 ? "solved" : "stopped",
          (tier === "Gentle" ? 700 : tier === "Classic" ? 1100 : 1700) *
            (0.8 + r() * 0.6),
          { tier, filledForMe: Math.floor(r() * 2) },
        );
      } else if (roll < 0.8) {
        const solved = r() < 0.7;
        add(
          t,
          "countdown",
          `numbers-${String(1 + Math.floor(r() * 150)).padStart(3, "0")}`,
          `Countdown · target ${101 + Math.floor(r() * 898)}`,
          solved ? "solved" : r() < 0.5 ? "revealed" : "stopped",
          60 + r() * 120,
          {
            steps: 3 + Math.floor(r() * 3),
            away: solved ? 0 : 1 + Math.floor(r() * 9),
          },
        );
      } else if (roll < 0.88) {
        const q = pick(QUOTATIONS);
        add(
          t,
          "cryptogram",
          q.id,
          `${q.author}: “${q.text.slice(0, 60)}${q.text.length > 60 ? "…" : ""}”`,
          "solved",
          240 + r() * 400,
          { theme: q.theme, revealed: Math.floor(r() * 3) },
        );
      } else if (roll < 0.95) {
        const total = 25 + Math.floor(r() * 18);
        const found = Math.floor(total * (0.35 + r() * 0.5));
        add(
          t,
          "hive",
          `hive-${String(1 + Math.floor(r() * 60)).padStart(2, "0")}`,
          "Letter Hive",
          "finished",
          500 + r() * 600,
          {
            found,
            total,
            share: Math.round((found / total) * 100),
            pangram: r() < 0.6,
          },
        );
      } else {
        const par = 4 + Math.floor(r() * 3);
        add(
          t,
          "ladder",
          r() < 0.3
            ? "carroll-head-tail"
            : `ladder-4-${1 + Math.floor(r() * 20)}`,
          r() < 0.3 ? "Change HEAD into TAIL" : "Word ladder",
          "solved",
          120 + r() * 200,
          { steps: par + Math.floor(r() * 2), par },
        );
      }
      minute += 10 + Math.floor(r() * 35);
    }
  }
  const at = (daysAgo: number, h: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const notes: FamilyNote[] = [
    {
      v: 1,
      id: "demonote0001",
      at: at(26, 19),
      author: "companion",
      name: "Dad",
      text: "Good afternoon. She played Clair de lune for me twice and talked about her piano teacher.",
    },
    {
      v: 1,
      id: "demonote0002",
      at: at(12, 20),
      author: "companion",
      name: "Dad",
      text: "Tired today. Asked about lunch a few times. Did a crossword-type puzzle and enjoyed it.",
    },
    {
      v: 1,
      id: "demonote0003",
      at: at(4, 18),
      author: "insights",
      name: "Me",
      text: "Called in the evening; she described the sheep case in detail.",
    },
  ];
  const gifts: Gift[] = [
    {
      v: 1,
      id: "demogift0001",
      at: at(9, 10),
      from: "companion",
      fromName: "Dad",
      kind: "piece",
      item: "it-is-well",
      title: "It Is Well with My Soul",
      message: "Our wedding hymn.",
      status: "opened",
      openedAt: at(9, 14),
    },
    {
      v: 1,
      id: "demogift0002",
      at: at(1, 9),
      from: "insights",
      fromName: "Me",
      kind: "bench",
      item: "fowl-cholera",
      title: "Sudden deaths in the flock",
      message: "Thought you’d like this one.",
      status: "sent",
    },
  ];
  return {
    records,
    notes,
    gifts,
    sharing: { v: 1, on: true, at: at(70, 12) },
    fictional: true,
  };
}
