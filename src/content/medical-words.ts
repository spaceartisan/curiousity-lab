// Authored language puzzles. Reference meanings are documented in MEDICAL_WORDS.md.
// These are contemporary medical terms with Latin/Greek parts, not Latin translations.
export const medicalConnections = [
  {
    id: "medical-shared-roots-v1",
    title: "Two languages, one meaning",
    groups: [
      {
        title: "Kidney",
        words: ["RENAL", "PERIRENAL", "NEPHRITIS", "NEPHRECTOMY"],
      },
      {
        title: "Skin",
        words: ["CUTANEOUS", "SUBCUTANEOUS", "DERMATITIS", "DERMATOLOGY"],
      },
      {
        title: "Eye",
        words: ["OCULAR", "INTRAOCULAR", "OPHTHALMIC", "OPHTHALMOLOGY"],
      },
      {
        title: "Vein",
        words: ["VENOUS", "INTRAVENOUS", "PHLEBITIS", "PHLEBOTOMY"],
      },
    ],
  },
  {
    id: "medical-latin-positions-v1",
    title: "Position in the word",
    groups: [
      {
        title: "Within — INTRA",
        words: ["INTRACELLULAR", "INTRAMUSCULAR", "INTRAVENOUS", "INTRADERMAL"],
      },
      {
        title: "Between — INTER",
        words: [
          "INTERCOSTAL",
          "INTERCELLULAR",
          "INTERVERTEBRAL",
          "INTERDENTAL",
        ],
      },
      {
        title: "Under — SUB",
        words: ["SUBCUTANEOUS", "SUBLINGUAL", "SUBCOSTAL", "SUBDURAL"],
      },
      {
        title: "Above — SUPRA",
        words: ["SUPRARENAL", "SUPRAPUBIC", "SUPRACLAVICULAR", "SUPRAORBITAL"],
      },
    ],
  },
];
const explanations: Record<string, Record<string, string>> = {
  "medical-shared-roots-v1": {
    Kidney:
      "Latin ren- and Greek nephr- both refer to the kidney. Renal concerns the kidney; perirenal means around it. Nephritis names kidney inflammation; nephrectomy names surgical removal of all or part of a kidney.",
    Skin: "Latin cutane- and Greek derm-/dermat- refer to skin. Cutaneous concerns skin; subcutaneous means beneath it. Dermatitis names skin inflammation; dermatology is the field concerned with skin.",
    Eye: "Latin ocul- and Greek ophthalm- refer to the eye. Ocular and ophthalmic concern the eye; intraocular means within it. Ophthalmology is the medical field concerned with the eyes.",
    Vein: "Latin ven- and Greek phleb- refer to veins. Venous concerns veins; intravenous means within a vein. Phlebitis names vein inflammation; phlebotomy commonly means drawing blood from a vein.",
  },
  "medical-latin-positions-v1": {
    "Within — INTRA":
      "The Latin prefix intra- places something inside: a cell, muscle, vein or skin in these four terms. Intradermal contains the Greek skin root derm-; one medical word can mix languages.",
    "Between — INTER":
      "The Latin prefix inter- places something between: ribs, cells, vertebrae or teeth in these four terms. Inter- and intra- differ by one letter but describe different positions.",
    "Under — SUB":
      "The Latin prefix sub- places something beneath: skin, tongue, rib or dura in these four terms. The dura is the tough outer covering of the brain and spinal cord.",
    "Above — SUPRA":
      "The Latin prefix supra- places something above: kidney, pubic region, clavicle or eye socket in these four terms. Suprarenal is also used for the adrenal gland above a kidney.",
  },
};
export function medicalExplanation(
  id: string,
  group: string,
): string | undefined {
  return explanations[id]?.[group];
}
