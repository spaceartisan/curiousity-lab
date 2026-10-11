// Lab room memory: kept on this device only.
import type { TestId } from "./bench-cases";
import type { CellType } from "./heme-cases";

export interface BenchRecord {
  caseId: string;
  at: string;
  ordered: TestId[];
  answer: string;
  correct: boolean;
  comment: string;
}
export interface DiffRecord {
  caseId: string;
  at: string;
  counts: Partial<Record<CellType, number>>;
  agreement: number;
}
export interface LabProgress {
  version: 1;
  bench: BenchRecord[];
  diffs: DiffRecord[];
  /** Work in progress so a case can be left and resumed. */
  benchDraft?: { caseId: string; seen: string[]; ordered: TestId[] };
}

const KEY = "curiosity-lab:lab-room:v1";
export const freshLab = (): LabProgress => ({
  version: 1,
  bench: [],
  diffs: [],
});

export function readLab(): LabProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.version === 1) return { ...freshLab(), ...raw };
  } catch {
    /* unavailable or damaged */
  }
  return freshLab();
}

export function writeLab(p: LabProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* keep working in memory */
  }
}
