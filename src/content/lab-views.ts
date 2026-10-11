export interface LabView {
  id: string;
  name: string;
  zoom: number;
  pan: number[];
}
export function validLabViews(value: unknown): value is LabView[] {
  if (!Array.isArray(value) || value.length > 6) return false;
  return (
    value.every(
      (v) =>
        v &&
        typeof v === "object" &&
        Object.keys(v).every((k) =>
          ["id", "name", "zoom", "pan"].includes(k),
        ) &&
        typeof v.id === "string" &&
        v.id.length > 0 &&
        v.id.length <= 80 &&
        typeof v.name === "string" &&
        v.name.trim().length > 0 &&
        v.name.length <= 80 &&
        typeof v.zoom === "number" &&
        Number.isFinite(v.zoom) &&
        v.zoom >= 1 &&
        v.zoom <= 3 &&
        Array.isArray(v.pan) &&
        v.pan.length === 2 &&
        v.pan.every(
          (n: unknown) =>
            typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 35,
        ),
    ) && new Set(value.map((v) => v.id)).size === value.length
  );
}
