export const specimens = [
  {
    id: "phil-26402-r1",
    asset: "media/phil-26402.jpg",
    title: "Fungal forms",
    kind: "real_micrograph",
    domain: "microbiology",
    description:
      "Pale blue fungal filaments cross a light field, with rounded structures grouped at several branch tips. The CDC source describes septate hyphae and clusters of conidia from an unidentified fungus.",
    observations: [
      "Filaments",
      "Branching",
      "Rounded clusters",
      "I want to look again",
    ],
    sourceUrl: "https://wwwn.cdc.gov/phil/Details.aspx?pid=26402",
    sourceImageId: "26402",
    credit:
      "CDC / Dr. Libero Ajello. Free source: CDC Public Health Image Library (PHIL 26402).",
    license:
      "Public domain — per the individual CDC PHIL record; redistribution with attribution.",
    licenseReviewedAtUtc: "2026-10-10",
    scientificReviewStatus:
      "Caption checked against CDC source and image; independent specialist review pending",
    canUseForIdentificationQuestion: false,
  },
  {
    id: "phil-10041-r1",
    asset: "media/phil-10041.jpg",
    title: "Two rounded bacterial cells",
    kind: "real_micrograph",
    domain: "microbiology",
    description:
      "Two green, rounded cells touch on a purple textured background. This is a digitally colorized scanning electron micrograph. Colors were added to the source image and are not natural specimen colors. CDC identifies the source as Staphylococcus epidermidis.",
    observations: [
      "Rounded cells",
      "Two adjacent cells",
      "Textured background",
      "I want to look again",
    ],
    sourceUrl: "https://wwwn.cdc.gov/phil/Details.aspx?pid=10041",
    sourceImageId: "10041",
    credit:
      "CDC / Segrid McAllister; photograph: Janice Haney Carr. Free source: CDC Public Health Image Library (PHIL 10041).",
    license:
      "Public domain — per the individual CDC PHIL record; redistribution with attribution.",
    licenseReviewedAtUtc: "2026-10-10",
    scientificReviewStatus:
      "Caption checked against CDC source and image; independent specialist review pending",
    canUseForIdentificationQuestion: false,
  },
] as const;
