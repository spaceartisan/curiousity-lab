import { createContext, useContext, type ReactNode } from "react";
import { APP_VERSION } from "../storage/contracts";
import { timeZone, type ActivityRecord } from "./records";
import { saveRecord } from "./store";

export type NewRecord = Omit<
  ActivityRecord,
  "v" | "id" | "at" | "tz" | "app"
> & { at?: string };
type Record = (r: NewRecord) => void;

const RecorderContext = createContext<Record>(() => {});
export const RECORDED = "curiosity-lab:recorded";

/** Wraps Play. Records are kept only when activity history is on. */
export function ActivityRecorder({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const record: Record = (r) => {
    if (!enabled) return;
    const full: ActivityRecord = {
      v: 1,
      id: crypto.randomUUID().replace(/-/g, ""),
      at: r.at ?? new Date().toISOString(),
      tz: timeZone(),
      app: APP_VERSION,
      ...r,
      title: r.title.slice(0, 160),
    };
    if (full.seconds !== undefined)
      full.seconds = Math.max(0, Math.min(86399, Math.round(full.seconds)));
    void saveRecord(full)
      .then(() => window.dispatchEvent(new CustomEvent(RECORDED)))
      .catch(() => {});
  };
  return (
    <RecorderContext.Provider value={record}>
      {children}
    </RecorderContext.Provider>
  );
}

export const useRecord = () => useContext(RecorderContext);

/** Seconds since a start time, for records. */
export const since = (start: number) => (Date.now() - start) / 1000;
