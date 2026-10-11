import { generateSudoku, validSudoku, type Size } from "../games/sudoku-engine";
import { connections, searchBoard, searchPacks } from "../content/words";
import { specimens } from "../content/specimens";
import { validLabViews } from "../content/lab-views";
import {
  exerciseCount,
  rhythmBeatCount,
  type MusicMode,
} from "../content/music";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown, max = 32) =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((x) => typeof x === "string" && x.length <= 100);
const values = (v: unknown, min: number, max: number, length?: number) =>
  Array.isArray(v) &&
  (length === undefined || v.length === length) &&
  v.every((x) => Number.isInteger(x) && x >= min && x <= max);
export function validateGame(kind: string, value: unknown): boolean {
  if (!record(value)) return false;
  if (kind === "sudoku") {
    if (
      !validSudoku(value) ||
      (value.largeCells !== undefined &&
        typeof value.largeCells !== "boolean") ||
      !Number.isInteger(value.seed) ||
      value.seed < 0 ||
      value.seed > 0xffffffff ||
      !["Relaxed", "Classic", "Hidden singles", "Challenging"].includes(
        value.tier,
      ) ||
      ((value.tier === "Hidden singles" || value.tier === "Challenging") &&
        value.size !== 9)
    )
      return false;
    const count = value.size * value.size;
    const canonical = generateSudoku(
      value.size as Size,
      value.seed,
      value.tier,
    );
    if (
      JSON.stringify(value.givens) !== JSON.stringify(canonical.givens) ||
      JSON.stringify(value.solution) !== JSON.stringify(canonical.solution)
    )
      return false;
    if (
      !values(value.cells, 0, value.size, count) ||
      value.notes.length !== count ||
      !value.notes.every((v) => values(v, 1, value.size)) ||
      value.history.length > 200
    )
      return false;
    if (!value.givens.every((n, i) => !n || n === value.cells[i])) return false;
    return value.history.every(
      (h) =>
        record(h) &&
        values(h.cells, 0, value.size, count) &&
        Array.isArray(h.notes) &&
        h.notes.length === count &&
        h.notes.every((v) => values(v, 1, value.size)),
    );
  }
  if (kind === "connections") {
    if (
      !Number.isInteger(value.pack) ||
      Number(value.pack) < 0 ||
      Number(value.pack) >= connections.length ||
      !strings(value.solved, 4) ||
      !strings(value.selected, 4)
    )
      return false;
    const pack = connections[Number(value.pack)];
    const solved = value.solved as string[],
      selected = value.selected as string[];
    const remaining = pack.groups
      .filter((g) => !solved.includes(g.title))
      .flatMap((g) => g.words);
    return (
      new Set(solved).size === solved.length &&
      new Set(selected).size === selected.length &&
      solved.every((title) => pack.groups.some((g) => g.title === title)) &&
      selected.every((w) => remaining.includes(w)) &&
      (value.order === undefined ||
        (Number.isInteger(value.order) &&
          Number(value.order) >= 0 &&
          Number(value.order) <= 31))
    );
  }
  if (kind === "search") {
    const pack = value.pack === undefined ? 0 : value.pack;
    return (
      Number.isInteger(pack) &&
      Number(pack) >= 0 &&
      Number(pack) < searchPacks.length &&
      strings(value.found, 8) &&
      new Set(value.found as string[]).size ===
        (value.found as string[]).length &&
      (value.found as string[]).every((w) =>
        searchBoard(Number(pack)).words.includes(w),
      )
    );
  }
  if (kind === "music")
    return (
      ["piano", "phrase", "match", "rhythm"].includes(String(value.mode)) &&
      values(value.notes, 0, 7) &&
      Array.isArray(value.notes) &&
      value.notes.length <= 64 &&
      typeof value.title === "string" &&
      value.title.length <= 80 &&
      typeof value.solved === "boolean" &&
      (value.exercise === undefined ||
        (Number.isInteger(value.exercise) &&
          Number(value.exercise) >= 0 &&
          Number(value.exercise) < exerciseCount(value.mode as MusicMode))) &&
      (value.presentation === undefined ||
        ["staff", "pattern", "ear"].includes(String(value.presentation))) &&
      (value.tempo === undefined ||
        ["comfortable", "slow"].includes(String(value.tempo))) &&
      (value.taps === undefined ||
        (Number.isInteger(value.taps) &&
          Number(value.taps) >= 0 &&
          Number(value.taps) <=
            (value.mode === "rhythm"
              ? rhythmBeatCount(Number(value.exercise ?? 0))
              : 4))) &&
      (value.flexibility === undefined ||
        ["gentle", "extra"].includes(String(value.flexibility))) &&
      (value.mode !== "rhythm" ||
        value.taps === undefined ||
        value.solved ===
          (value.taps === rhythmBeatCount(Number(value.exercise ?? 0))))
    );
  if (kind === "lab") {
    const page = (v: unknown): boolean =>
      record(v) &&
      Number.isInteger(v.specimen) &&
      Number(v.specimen) >= 0 &&
      Number(v.specimen) < specimens.length &&
      typeof v.zoom === "number" &&
      Number.isFinite(v.zoom) &&
      v.zoom >= 1 &&
      v.zoom <= 3 &&
      Array.isArray(v.pan) &&
      v.pan.length === 2 &&
      v.pan.every(
        (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= 35,
      ) &&
      strings(v.observations, 12) &&
      typeof v.text === "string" &&
      v.text.length <= 1000 &&
      (v.views === undefined || validLabViews(v.views));
    return (
      page(value) &&
      ["desk", "case", "microscope", "observations", "compare"].includes(
        String(value.stage),
      ) &&
      (value.experience === undefined ||
        ["workbench", "explorer"].includes(String(value.experience))) &&
      (value.workflowRevision === undefined || value.workflowRevision === 1) &&
      (value.pages === undefined ||
        (Array.isArray(value.pages) &&
          value.pages.length <= specimens.length &&
          value.pages.every(page) &&
          new Set(value.pages.map((p) => p.specimen)).size ===
            value.pages.length))
    );
  }
  return false;
}
