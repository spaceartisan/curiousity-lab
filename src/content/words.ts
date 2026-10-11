import { medicalConnections } from "./medical-words";
export const classicConnections = [
  {
    id: "garden-and-craft-v1",
    title: "Garden and craft",
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
    title: "Nature and home",
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
  {
    id: "travel-and-reading-v1",
    title: "Travel and reading",
    groups: [
      { title: "Ways to travel", words: ["BICYCLE", "CANOE", "TRAM", "FERRY"] },
      { title: "Small birds", words: ["ROBIN", "SPARROW", "FINCH", "WREN"] },
      {
        title: "Parts of a book",
        words: ["CHAPTER", "INDEX", "PREFACE", "GLOSSARY"],
      },
      { title: "Flat shapes", words: ["CIRCLE", "TRIANGLE", "SQUARE", "OVAL"] },
    ],
  },
  {
    id: "kitchen-and-stitching-v1",
    title: "Kitchen and stitching",
    groups: [
      { title: "Cooking methods", words: ["ROAST", "STEAM", "SIMMER", "BAKE"] },
      {
        title: "Needlework tools",
        words: ["NEEDLE", "THIMBLE", "HOOP", "BOBBIN"],
      },
      {
        title: "Root vegetables",
        words: ["CARROT", "PARSNIP", "TURNIP", "RADISH"],
      },
      { title: "Seasons", words: ["SPRING", "SUMMER", "AUTUMN", "WINTER"] },
    ],
  },
  {
    id: "music-and-sky-v1",
    title: "Music and sky",
    groups: [
      {
        title: "Number of performers",
        words: ["SOLO", "DUET", "TRIO", "QUARTET"],
      },
      {
        title: "Objects in space",
        words: ["COMET", "ASTEROID", "PLANET", "MOON"],
      },
      {
        title: "Punctuation marks",
        words: ["COMMA", "COLON", "DASH", "PERIOD"],
      },
      { title: "Footwear", words: ["BOOT", "SANDAL", "SLIPPER", "LOAFER"] },
    ],
  },
  {
    id: "garden-and-patterns-v1",
    title: "Garden and patterns",
    groups: [
      { title: "Culinary herbs", words: ["BASIL", "THYME", "SAGE", "DILL"] },
      {
        title: "Times of day",
        words: ["DAWN", "MORNING", "AFTERNOON", "DUSK"],
      },
      {
        title: "Fabric patterns",
        words: ["STRIPED", "SPOTTED", "CHECKERED", "PLAIN"],
      },
      { title: "Containers", words: ["BASKET", "JAR", "BOX", "BAG"] },
    ],
  },
  {
    id: "room-and-measures-v1",
    title: "Room and measures",
    groups: [
      {
        title: "Furniture",
        words: ["SOFA", "ARMCHAIR", "DRESSER", "BOOKCASE"],
      },
      {
        title: "Polygons",
        words: ["PENTAGON", "HEXAGON", "OCTAGON", "DECAGON"],
      },
      {
        title: "Citrus fruits",
        words: ["ORANGE", "LEMON", "LIME", "GRAPEFRUIT"],
      },
      { title: "Units of length", words: ["INCH", "FOOT", "YARD", "MILE"] },
    ],
  },
  {
    id: "weather-and-plants-v1",
    title: "Weather and plants",
    groups: [
      { title: "Precipitation", words: ["RAIN", "SNOW", "HAIL", "SLEET"] },
      { title: "Landforms", words: ["VALLEY", "CANYON", "PLATEAU", "HILL"] },
      {
        title: "Keyboard instruments",
        words: ["PIANO", "ORGAN", "ACCORDION", "HARPSICHORD"],
      },
      { title: "Parts of a plant", words: ["ROOT", "STEM", "LEAF", "FLOWER"] },
    ],
  },
];
// Original wordplay arrangements. Preserve Classic indices and frozen IDs.
export const challengingConnections = [
  {
    id: "crossed-meanings-v1",
    title: "Crossed meanings",
    groups: [
      {
        title: "Words after PAPER",
        words: ["CLIP", "TRAIL", "TIGER", "WEIGHT"],
      },
      { title: "Words before LINE", words: ["BASE", "DEAD", "PUNCH", "TAG"] },
      {
        title: "Words before JACKET",
        words: ["DINNER", "DUST", "LIFE", "SPORTS"],
      },
      { title: "Move quickly", words: ["BOLT", "DASH", "RACE", "SPRINT"] },
    ],
  },
  {
    id: "different-angles-v1",
    title: "Different angles",
    groups: [
      { title: "Words after BOOK", words: ["CLUB", "MARK", "WORM", "END"] },
      {
        title: "Words after SEA",
        words: ["HORSE", "LION", "CUCUMBER", "URCHIN"],
      },
      { title: "Poker actions", words: ["CALL", "CHECK", "FOLD", "RAISE"] },
      {
        title: "Words before LIGHT",
        words: ["FLASH", "SPOT", "TRAFFIC", "GREEN"],
      },
    ],
  },
  {
    id: "links-and-layers-v1",
    title: "Links and layers",
    groups: [
      { title: "Secure in place", words: ["FASTEN", "ANCHOR", "LOCK", "TIE"] },
      { title: "Words before ROOM", words: ["ELBOW", "LEG", "CHAT", "DARK"] },
      {
        title: "Words before SHIP",
        words: ["FRIEND", "LEADER", "PARTNER", "SCHOLAR"],
      },
      { title: "Sound like numbers", words: ["ATE", "FOR", "TOO", "WON"] },
    ],
  },
  {
    id: "unusual-company-v1",
    title: "Unusual company",
    groups: [
      {
        title: "Words after COLD",
        words: ["CASE", "SHOULDER", "SNAP", "TURKEY"],
      },
      { title: "Words before BOARD", words: ["CHESS", "CLIP", "DASH", "KEY"] },
      { title: "River features", words: ["BANK", "BED", "CURRENT", "MOUTH"] },
      {
        title: "Words before WORK",
        words: ["FIELD", "FRAME", "GROUND", "NET"],
      },
    ],
  },
];
export const connections = [
  ...classicConnections,
  ...challengingConnections,
  ...medicalConnections,
];
export const searchPack = {
  id: "quiet-garden-v1",
  title: "Quiet garden",
  directions: "Rows",
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
// Fixed, versioned boards. Keep the original first board unchanged for old saves.
export const searchPacks = [
  searchPack,
  {
    id: "kitchen-table-v1",
    title: "Kitchen table",
    directions: "Rows and columns",
    size: 8,
    rows: [
      "BREADVOS",
      "KPLATETQ",
      "TSTVDCAO",
      "IPUQMUWH",
      "BOPOPPQE",
      "BOWLERWR",
      "LNCPAMUB",
      "YIERRTEA",
    ],
    words: ["BREAD", "SPOON", "PLATE", "CUP", "TEA", "PEAR", "BOWL", "HERB"],
  },
  {
    id: "workbench-words-v1",
    title: "At the workbench",
    directions: "Rows, columns and diagonals",
    size: 8,
    rows: [
      "SEMNOTES",
      "YLDEQGPG",
      "MAIEJAVL",
      "QTRDSHLA",
      "GCHTEKES",
      "MIOGIRNS",
      "URJOIBSF",
      "FOCUSLWB",
    ],
    words: [
      "SLIDE",
      "LENS",
      "NOTES",
      "LIGHT",
      "DESK",
      "GLASS",
      "FOCUS",
      "TRAY",
    ],
  },
  {
    id: "waterside-v1",
    title: "By the water",
    directions: "Rows, columns and diagonals",
    size: 8,
    rows: [
      "LZWMIEJU",
      "YGIINBDK",
      "MSMOLLJC",
      "HTTLCLAU",
      "ESUCZROD",
      "RIVEREWW",
      "ODNOPEWF",
      "NBANKDSI",
    ],
    words: [
      "RIVER",
      "REED",
      "DUCK",
      "POND",
      "WILLOW",
      "STONE",
      "BANK",
      "HERON",
    ],
  },
];
export type SearchPack = typeof searchPack;
export function searchBoard(pack = 0): SearchPack {
  return searchPacks[pack] ?? searchPack;
}
export function findWordPaths(pack: SearchPack, word: string): number[][] {
  const cells = pack.rows.join("");
  const result: number[][] = [];
  for (let start = 0; start < cells.length; start++) {
    for (const dr of [-1, 0, 1])
      for (const dc of [-1, 0, 1]) {
        if (!dr && !dc) continue;
        const r = Math.floor(start / pack.size) + dr * (word.length - 1);
        const c = (start % pack.size) + dc * (word.length - 1);
        if (r < 0 || r >= pack.size || c < 0 || c >= pack.size) continue;
        const path = wordPath(start, r * pack.size + c, pack.size);
        if (path.map((i) => cells[i]).join("") === word) result.push(path);
      }
  }
  return result;
}
export function wordPath(start: number, end: number, size: number): number[] {
  if (
    ![start, end, size].every(Number.isInteger) ||
    size < 1 ||
    start < 0 ||
    end < 0 ||
    start >= size * size ||
    end >= size * size
  )
    return [];
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
