import type { Creation, Draft } from "../storage/contracts";
export interface GameProps {
  draft: Draft;
  update: (
    data: unknown,
    metrics?: { hint?: boolean; undo?: boolean; mode?: string },
  ) => void;
  finish: (outcome: "completed" | "explored") => void;
  create: (item: Omit<Creation, "id" | "savedAt">) => void;
  replay: () => void;
  repeat?: () => void;
}
