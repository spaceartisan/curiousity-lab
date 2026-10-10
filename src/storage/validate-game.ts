import { generateSudoku, validSudoku, type Size } from "../games/sudoku-engine";
import { searchBoard, searchPacks } from "../content/words";
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
      !Number.isInteger(value.seed) ||
      value.seed < 0 ||
      value.seed > 0xffffffff ||
      !["Relaxed", "Classic"].includes(value.tier)
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
  if (kind === "connections")
    return (
      Number.isInteger(value.pack) &&
      Number(value.pack) >= 0 &&
      Number(value.pack) < 2 &&
      strings(value.solved, 4) &&
      strings(value.selected, 4)
    );
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
      typeof value.solved === "boolean"
    );
  if (kind === "lab")
    return (
      Number.isInteger(value.specimen) &&
      Number(value.specimen) >= 0 &&
      Number(value.specimen) < 2 &&
      ["desk", "microscope", "observations"].includes(String(value.stage)) &&
      typeof value.zoom === "number" &&
      value.zoom >= 1 &&
      value.zoom <= 3 &&
      Array.isArray(value.pan) &&
      value.pan.length === 2 &&
      value.pan.every((x) => typeof x === "number" && Math.abs(x) <= 35) &&
      strings(value.observations, 12) &&
      typeof value.text === "string" &&
      value.text.length <= 1000
    );
  return false;
}
