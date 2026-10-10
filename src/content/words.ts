export const connections = [
  {
    id: "garden-and-craft-v1",
    groups: [
      { title: "In the garden", words: ["TULIP", "DAHLIA", "IRIS", "ROSE"] },
      {
        title: "Musical instruments",
        words: ["PIANO", "VIOLIN", "FLUTE", "CELLO"],
      },
      { title: "Things to read", words: ["NOVEL", "POEM", "ESSAY", "MEMOIR"] },
      {
        title: "At the laboratory",
        words: ["SLIDE", "LENS", "SPECIMEN", "NOTEBOOK"],
      },
    ],
  },
  {
    id: "nature-and-home-v1",
    groups: [
      { title: "Trees", words: ["MAPLE", "OAK", "BIRCH", "ELM"] },
      {
        title: "Baking ingredients",
        words: ["FLOUR", "BUTTER", "SUGAR", "YEAST"],
      },
      { title: "Fabrics", words: ["LINEN", "COTTON", "SILK", "WOOL"] },
      { title: "Bodies of water", words: ["LAKE", "RIVER", "POND", "OCEAN"] },
    ],
  },
];
export const searchPack = {
  id: "quiet-garden-v1",
  size: 8,
  rows: [
    "GARDENAB",
    "CHORUSCD",
    "MELODYEF",
    "PIANOGHI",
    "TULIPJKL",
    "FERNMNOP",
    "BOOKQRST",
    "TEAUVWXY",
  ],
  words: [
    "GARDEN",
    "CHORUS",
    "MELODY",
    "PIANO",
    "TULIP",
    "FERN",
    "BOOK",
    "TEA",
  ],
};
export function wordPath(start: number, end: number, size: number): number[] {
  const r0 = Math.floor(start / size),
    c0 = start % size,
    r1 = Math.floor(end / size),
    c1 = end % size;
  const dr = r1 - r0,
    dc = c1 - c0;
  if (dr && dc && Math.abs(dr) !== Math.abs(dc)) return [];
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from(
    { length: steps + 1 },
    (_, i) => (r0 + Math.sign(dr) * i) * size + c0 + Math.sign(dc) * i,
  );
}
