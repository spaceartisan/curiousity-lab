import { useEffect, useMemo, useState } from "react";
import type { FamilyContext } from "../family/useFamilyConnection";
import { fictionalFamily, type FamilyData } from "./demo";
import type { FamilyNote, Gift, SharingState } from "./family-data";
import type { ActivityRecord } from "./records";

export type Load =
  "waiting" | "live" | "fictional" | "unavailable" | "not-connected";

/** Companion and Insights: the family's shared records, live from Firestore or the fictional example. */
export function useFamilyData(family: FamilyContext, fictional: boolean) {
  const approved =
    family.connection.status === "approved" ? family.connection : null;
  const familyId =
    approved && approved.membership.role !== "play"
      ? approved.membership.familyId
      : null;
  const [records, setRecords] = useState<ActivityRecord[] | null>(null);
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [sharing, setSharing] = useState<SharingState | null>(null);
  const [failed, setFailed] = useState(false);
  const demo = useMemo(
    () => (fictional ? fictionalFamily() : null),
    [fictional],
  );

  useEffect(() => {
    if (fictional || !familyId || !family.client) return;
    const fail = () => setFailed(true);
    const stops = [
      family.client.watchActivity(familyId, setRecords, fail),
      family.client.watchNotes(familyId, setNotes, fail),
      family.client.watchGifts(familyId, setGifts, fail),
      family.client.watchSharing(familyId, setSharing, () => {}),
    ];
    return () => stops.forEach((s) => s());
  }, [fictional, familyId, family.client]);

  const data: FamilyData | null =
    demo ??
    (records ? { records, notes, gifts, sharing, fictional: false } : null);
  const load: Load = demo
    ? "fictional"
    : !familyId
      ? "not-connected"
      : failed
        ? "unavailable"
        : records
          ? "live"
          : "waiting";
  return { data, load, familyId, client: family.client };
}
