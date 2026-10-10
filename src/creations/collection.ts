import type { Creation } from "../storage/contracts";
import { specimens } from "../content/specimens";
export type CollectionFilter = "all" | "notebook" | "melody";
export type CollectionSort = "recent" | "earlier";
export const PAGE_SIZE = 12;
const normalize = (text: string) =>
  text.normalize("NFKC").toLocaleLowerCase("en-US");
export function selectCreations(
  creations: Creation[],
  filter: CollectionFilter,
  query = "",
  sort: CollectionSort = "recent",
): Creation[] {
  const needle = normalize(query.trim());
  return creations
    .map((creation, index) => ({ creation, index }))
    .filter(({ creation: c }) => {
      if (filter !== "all" && c.kind !== filter) return false;
      const asset = specimens.find((s) => s.id === c.specimenId);
      return (
        !needle ||
        normalize(
          [
            c.title,
            c.text ?? "",
            ...(c.observations ?? []),
            asset?.title ?? "",
          ].join(" "),
        ).includes(needle)
      );
    })
    .sort((a, b) => {
      const delta =
        Date.parse(a.creation.savedAt) - Date.parse(b.creation.savedAt) ||
        a.index - b.index;
      return sort === "earlier" ? delta : -delta;
    })
    .map(({ creation }) => creation);
}
export function latestNotebookVisit(
  creations: Creation[],
  specimenId: string,
  now = Date.now(),
): string | undefined {
  return creations
    .filter(
      (c) =>
        c.kind === "notebook" &&
        c.specimenId === specimenId &&
        c.lastViewedAt &&
        Number.isFinite(Date.parse(c.lastViewedAt)) &&
        Date.parse(c.lastViewedAt) <= now,
    )
    .sort(
      (a, b) => Date.parse(b.lastViewedAt!) - Date.parse(a.lastViewedAt!),
    )[0]?.lastViewedAt;
}
