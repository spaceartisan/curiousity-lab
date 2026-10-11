// Peripheral blood differentials built from real, expert-labeled cell images
// (PBC dataset, Acevedo et al. 2020, CC BY 4.0). Patients are fictional.

export type CellType =
  | "seg"
  | "band"
  | "meta"
  | "myelo"
  | "pro"
  | "lymph"
  | "mono"
  | "eos"
  | "baso"
  | "nrbc";

export const CELL_KEYS: { id: CellType; label: string; key: string }[] = [
  { id: "seg", label: "Seg", key: "1" },
  { id: "band", label: "Band", key: "2" },
  { id: "lymph", label: "Lymph", key: "3" },
  { id: "mono", label: "Mono", key: "4" },
  { id: "eos", label: "Eos", key: "5" },
  { id: "baso", label: "Baso", key: "6" },
  { id: "meta", label: "Meta", key: "7" },
  { id: "myelo", label: "Myelo", key: "8" },
  { id: "pro", label: "Pro", key: "9" },
  { id: "nrbc", label: "NRBC", key: "0" },
];

export const CELL_NAMES: Record<CellType, string> = {
  seg: "Segmented neutrophil",
  band: "Band neutrophil",
  meta: "Metamyelocyte",
  myelo: "Myelocyte",
  pro: "Promyelocyte",
  lymph: "Lymphocyte",
  mono: "Monocyte",
  eos: "Eosinophil",
  baso: "Basophil",
  nrbc: "Nucleated red cell",
};

/** Images available per type: public/media/cells/<type>-NN.jpg */
export const CELL_POOL: Record<CellType, number> = {
  seg: 80,
  band: 30,
  lymph: 70,
  mono: 30,
  eos: 30,
  baso: 14,
  meta: 14,
  myelo: 14,
  pro: 8,
  nrbc: 14,
};

export interface HemeCase {
  id: string;
  title: string;
  patient: string;
  history: string;
  wbc: number;
  /** White cells per 100 counted; NRBCs are extra, reported per 100 WBC. */
  counts: Partial<Record<CellType, number>>;
  interpretation: string;
}

export const HEME_CASES: HemeCase[] = [
  {
    id: "preop",
    title: "Routine pre-op CBC",
    patient: "Woman, 58, before knee replacement",
    history:
      "Feels well. The analyzer flagged nothing; the smear is a routine manual check.",
    wbc: 7.2,
    counts: { seg: 56, band: 3, lymph: 30, mono: 7, eos: 3, baso: 1 },
    interpretation:
      "A normal adult differential: neutrophils about 55–70%, lymphocytes 20–40%, monocytes up to about 10%, eosinophils and basophils a few percent.",
  },
  {
    id: "pneumonia",
    title: "Fever and a productive cough",
    patient: "Man, 66, admitted from the emergency department",
    history:
      "Three days of fever, chills and green sputum. Crackles at the right base.",
    wbc: 18.6,
    counts: { seg: 68, band: 14, meta: 4, myelo: 2, lymph: 7, mono: 5 },
    interpretation:
      "Neutrophilia with a left shift: more bands, plus metamyelocytes and myelocytes released early from the marrow. This pattern fits an acute bacterial infection. On a real smear you would also look for toxic granulation and Döhle bodies.",
  },
  {
    id: "eosinophilia",
    title: "Itching after a long trip",
    patient: "Man, 34, returned from six months abroad",
    history: "Itchy rash and cough on and off. Some loose stools. No fever.",
    wbc: 9.8,
    counts: { seg: 46, band: 2, lymph: 26, mono: 6, eos: 18, baso: 2 },
    interpretation:
      "Marked eosinophilia, an absolute count of about 1.8 × 10⁹/L. After travel, a helminth infection (strongyloides, hookworm, schistosomiasis) heads the list. Allergy and drug reactions are the common causes at home.",
  },
  {
    id: "pertussis",
    title: "A baby with coughing fits",
    patient: "Infant, 3 months",
    history:
      "Two weeks of paroxysmal coughing, with whoops and vomiting after the spells. Not yet vaccinated.",
    wbc: 32.0,
    counts: { seg: 24, band: 2, lymph: 64, mono: 7, eos: 2, baso: 1 },
    interpretation:
      "Striking lymphocytosis made of small, mature-looking lymphocytes rather than reactive ones. That is typical of pertussis, whose toxin keeps lymphocytes from leaving the blood. Very high counts in infants are a warning sign.",
  },
  {
    id: "recovery",
    title: "Counts coming back",
    patient: "Woman, 49, two weeks after chemotherapy",
    history:
      "The white count was very low last week. It is rising today, and she is afebrile.",
    wbc: 3.9,
    counts: { seg: 50, band: 3, lymph: 23, mono: 18, eos: 5, baso: 1 },
    interpretation:
      "Relative monocytosis. Monocytes are usually the first cells back after chemotherapy, a reassuring sign of marrow recovery that comes just ahead of the neutrophils.",
  },
  {
    id: "leukoerythroblastic",
    title: "Something crowding the marrow",
    patient: "Woman, 71, with a history of breast cancer",
    history: "Bone pain and fatigue. The red cells include teardrop forms.",
    wbc: 11.4,
    counts: {
      seg: 48,
      band: 8,
      meta: 6,
      myelo: 5,
      pro: 1,
      lymph: 22,
      mono: 6,
      eos: 2,
      baso: 2,
      nrbc: 9,
    },
    interpretation:
      "A leukoerythroblastic picture: immature granulocytes together with nucleated red cells, plus teardrops. It suggests the marrow is infiltrated (here, possibly metastatic cancer) or fibrosed. A bone marrow examination would come next.",
  },
  {
    id: "cml",
    title: "A very high white count",
    patient: "Man, 52, sent from his doctor’s office",
    history:
      "Tired, with early fullness after meals. His spleen is felt well below the ribs.",
    wbc: 124,
    counts: {
      seg: 42,
      band: 9,
      meta: 9,
      myelo: 14,
      pro: 2,
      lymph: 7,
      mono: 3,
      eos: 6,
      baso: 8,
    },
    interpretation:
      "Granulocytes at every stage of maturation, with a peak of myelocytes over metamyelocytes (the “myelocyte bulge”) and basophilia. Classic for chronic myeloid leukemia. The next step is BCR::ABL1 testing for the Philadelphia chromosome.",
  },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SlideCell {
  type: CellType;
  file: string;
}

/** The cells you meet scanning this smear, in order; seeded so a repeat of the same slide matches. */
export function buildSlide(c: HemeCase, seed: number): SlideCell[] {
  const random = rng(seed);
  const cells: SlideCell[] = [];
  for (const [type, n] of Object.entries(c.counts) as [CellType, number][]) {
    const pool = Array.from({ length: CELL_POOL[type] }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let k = 0; k < n; k++)
      cells.push({
        type,
        file: `${type}-${String(pool[k % pool.length]).padStart(2, "0")}.jpg`,
      });
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
