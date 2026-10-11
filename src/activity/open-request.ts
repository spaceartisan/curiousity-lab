// A one-shot hand-off so a gift on the home screen can open the right piece or case.
export type OpenRequest =
  { kind: "piece"; item: string } | { kind: "bench"; item: string };

let pending: OpenRequest | null = null;
export function requestOpen(r: OpenRequest) {
  pending = r;
}
export function takeOpen(kind: OpenRequest["kind"]): string | null {
  if (pending?.kind !== kind) return null;
  const item = pending.item;
  pending = null;
  return item;
}
