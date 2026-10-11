import { connections, classicConnections } from "../content/words";
export type ConnectionsTier = "Classic" | "Challenging";
export function connectionsTier(pack: number): ConnectionsTier {
  return pack < classicConnections.length ? "Classic" : "Challenging";
}
export function connectionsPool(tier: ConnectionsTier) {
  return Array.from({ length: connections.length }, (_, i) => i).filter(
    (i) => connectionsTier(i) === tier,
  );
}
export function nextConnectionsPack(pack: number, samePuzzle = false) {
  if (samePuzzle) return pack;
  const pool = connectionsPool(connectionsTier(pack));
  return pool[(pool.indexOf(pack) + 1) % pool.length];
}
export function connectionsMode(pack: number) {
  return connectionsTier(pack) === "Challenging" ? "wordplay" : "explore";
}
export function connectionsContentVersion(pack: number) {
  return connectionsTier(pack) === "Challenging"
    ? "connections-wordplay-1"
    : pack < 2
      ? "starter-1"
      : "connections-2";
}
export interface ConnectionsData {
  pack: number;
  solved: string[];
  selected: string[];
  order?: number;
}
export function connectionsPuzzle(pack: number): string {
  return pack < 2
    ? `connections-${pack}`
    : `connections-${connections[pack].id}`;
}
export function matchingConnection(data: ConnectionsData) {
  if (data.selected.length !== 4 || new Set(data.selected).size !== 4)
    return undefined;
  return connections[data.pack].groups.find(
    (g) =>
      !data.solved.includes(g.title) &&
      g.words.every((w) => data.selected.includes(w)),
  );
}
export function connectionWords(data: ConnectionsData): string[] {
  const words = connections[data.pack].groups
    .filter((g) => !data.solved.includes(g.title))
    .flatMap((g) => g.words)
    .sort();
  if (!data.order) return words;
  // Stable, local presentation ordering. Not a puzzle seed or difficulty measure.
  let seed = data.pack * 997 + data.order;
  for (let i = words.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words;
}
