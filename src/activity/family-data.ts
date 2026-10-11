// Shapes stored under families/{familyId}/... alongside activity records.
export interface FamilyNote {
  v: 1;
  id: string;
  at: string;
  /** Who wrote it: Dad's Companion or the Insights owner. */
  author: "companion" | "insights";
  name: string;
  text: string;
  uid?: string;
}

export type GiftKind = "piece" | "bench" | "quote" | "message";
export interface Gift {
  v: 1;
  id: string;
  at: string;
  from: "companion" | "insights";
  fromName: string;
  kind: GiftKind;
  /** Content id (repertoire id, bench case id, quotation id); empty for a plain message. */
  item: string;
  title: string;
  message: string;
  status: "sent" | "opened";
  openedAt?: string;
  uid?: string;
}

export interface SharingState {
  v: 1;
  on: boolean;
  at: string;
  uid?: string;
}

const id = (v: unknown) =>
  typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v);
const text = (v: unknown, max: number, min = 0) =>
  typeof v === "string" && v.length >= min && v.length <= max;
const iso = (v: unknown) =>
  typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));

export function validNote(n: unknown): n is FamilyNote {
  const x = n as FamilyNote;
  return (
    !!x &&
    x.v === 1 &&
    id(x.id) &&
    iso(x.at) &&
    ["companion", "insights"].includes(x.author) &&
    text(x.name, 40) &&
    text(x.text, 2000, 1)
  );
}

export function validGift(g: unknown): g is Gift {
  const x = g as Gift;
  return (
    !!x &&
    x.v === 1 &&
    id(x.id) &&
    iso(x.at) &&
    ["companion", "insights"].includes(x.from) &&
    text(x.fromName, 40, 1) &&
    ["piece", "bench", "quote", "message"].includes(x.kind) &&
    text(x.item, 120) &&
    text(x.title, 160) &&
    text(x.message, 500) &&
    ["sent", "opened"].includes(x.status) &&
    (x.openedAt === undefined || iso(x.openedAt))
  );
}

export const newId = () => crypto.randomUUID().replace(/-/g, "");
