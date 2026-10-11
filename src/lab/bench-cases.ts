// Bench unknowns. Images are CDC PHIL photographs (public domain); see public/media/lab/manifest.json.
// Reactions follow standard reference profiles for each organism; written results stand in where no photo exists.

export type TestId =
  | "catalase"
  | "oxidase"
  | "coagulase"
  | "indole"
  | "urease"
  | "tsi"
  | "motility"
  | "esculin"
  | "camp"
  | "reverse-camp"
  | "hippurate"
  | "optochin"
  | "bile"
  | "bacitracin"
  | "lancefield"
  | "lecithinase"
  | "salt"
  | "string"
  | "germ-tube"
  | "cornmeal"
  | "tease"
  | "temp";

export const TESTS: { id: TestId; name: string; group: string }[] = [
  { id: "catalase", name: "Catalase", group: "Quick tests" },
  { id: "oxidase", name: "Oxidase", group: "Quick tests" },
  { id: "indole", name: "Spot indole", group: "Quick tests" },
  { id: "coagulase", name: "Coagulase (tube)", group: "Quick tests" },
  {
    id: "string",
    name: "String test (0.5% deoxycholate)",
    group: "Quick tests",
  },
  { id: "tsi", name: "Triple sugar iron (TSI)", group: "Tubes" },
  { id: "urease", name: "Urea (Christensen’s)", group: "Tubes" },
  { id: "motility", name: "Motility", group: "Tubes" },
  { id: "esculin", name: "Esculin hydrolysis", group: "Tubes" },
  { id: "hippurate", name: "Hippurate hydrolysis", group: "Tubes" },
  { id: "salt", name: "Growth in NaCl (0% / 6%)", group: "Tubes" },
  { id: "temp", name: "Growth at other temperatures", group: "Tubes" },
  { id: "camp", name: "CAMP test", group: "Plates & disks" },
  {
    id: "reverse-camp",
    name: "Reverse CAMP (with group B strep)",
    group: "Plates & disks",
  },
  { id: "optochin", name: "Optochin disk", group: "Plates & disks" },
  { id: "bile", name: "Bile solubility", group: "Plates & disks" },
  { id: "bacitracin", name: "Bacitracin disk", group: "Plates & disks" },
  { id: "lecithinase", name: "Egg-yolk / Nagler", group: "Plates & disks" },
  {
    id: "lancefield",
    name: "Lancefield grouping (latex)",
    group: "Plates & disks",
  },
  { id: "germ-tube", name: "Germ tube", group: "Yeast & mold" },
  { id: "cornmeal", name: "Cornmeal–Tween agar", group: "Yeast & mold" },
  { id: "tease", name: "Tease mount (LPCB)", group: "Yeast & mold" },
];

export interface Finding {
  text: string;
  /** File in public/media/lab. */
  image?: string;
}

export interface BenchCase {
  id: string;
  title: string;
  from: string;
  specimen: string;
  history: string;
  scene?: string;
  gram: Finding;
  plates: { medium: string; finding: Finding }[];
  tests: Partial<Record<TestId, Finding>>;
  answer: string;
  keyFindings: string[];
  note: string;
}

export const ORGANISMS: { id: string; name: string; group: string }[] = [
  ["staph-aureus", "Staphylococcus aureus", "Gram-positive cocci"],
  [
    "strep-agalactiae",
    "Streptococcus agalactiae (group B)",
    "Gram-positive cocci",
  ],
  ["strep-pyogenes", "Streptococcus pyogenes (group A)", "Gram-positive cocci"],
  ["strep-uberis", "Streptococcus uberis", "Gram-positive cocci"],
  ["strep-pneumoniae", "Streptococcus pneumoniae", "Gram-positive cocci"],
  ["viridans", "Viridans group streptococcus", "Gram-positive cocci"],
  ["enterococcus", "Enterococcus faecalis", "Gram-positive cocci"],
  ["listeria", "Listeria monocytogenes", "Gram-positive rods"],
  ["erysipelothrix", "Erysipelothrix rhusiopathiae", "Gram-positive rods"],
  ["rhodococcus", "Rhodococcus equi", "Gram-positive rods"],
  ["c-pseudotb", "Corynebacterium pseudotuberculosis", "Gram-positive rods"],
  ["trueperella", "Trueperella pyogenes", "Gram-positive rods"],
  ["bacillus-cereus", "Bacillus cereus", "Gram-positive rods"],
  ["bacillus-anthracis", "Bacillus anthracis", "Gram-positive rods"],
  ["c-perfringens", "Clostridium perfringens", "Gram-positive rods"],
  ["c-chauvoei", "Clostridium chauvoei", "Gram-positive rods"],
  ["e-coli", "Escherichia coli", "Gram-negative rods"],
  ["klebsiella", "Klebsiella pneumoniae", "Gram-negative rods"],
  ["salmonella", "Salmonella enterica", "Gram-negative rods"],
  ["shigella", "Shigella species", "Gram-negative rods"],
  ["proteus-mirabilis", "Proteus mirabilis", "Gram-negative rods"],
  ["proteus-vulgaris", "Proteus vulgaris", "Gram-negative rods"],
  ["yersinia-ent", "Yersinia enterocolitica", "Gram-negative rods"],
  ["yersinia-ptb", "Yersinia pseudotuberculosis", "Gram-negative rods"],
  ["pseudomonas", "Pseudomonas aeruginosa", "Gram-negative rods"],
  ["aeromonas", "Aeromonas hydrophila", "Gram-negative rods"],
  ["v-parahaem", "Vibrio parahaemolyticus", "Gram-negative rods"],
  ["v-cholerae", "Vibrio cholerae", "Gram-negative rods"],
  ["campy-jejuni", "Campylobacter jejuni", "Gram-negative rods"],
  ["campy-fetus", "Campylobacter fetus", "Gram-negative rods"],
  ["pasteurella", "Pasteurella multocida", "Gram-negative rods"],
  ["mannheimia", "Mannheimia haemolytica", "Gram-negative rods"],
  ["histophilus", "Histophilus somni", "Gram-negative rods"],
  ["bordetella", "Bordetella bronchiseptica", "Gram-negative rods"],
  ["brucella", "Brucella species", "Gram-negative rods"],
  ["candida-albicans", "Candida albicans", "Yeasts and molds"],
  ["candida-other", "Candida species, not albicans", "Yeasts and molds"],
  ["cryptococcus", "Cryptococcus neoformans", "Yeasts and molds"],
  ["aspergillus-fumigatus", "Aspergillus fumigatus", "Yeasts and molds"],
  ["aspergillus-niger", "Aspergillus niger", "Yeasts and molds"],
].map(([id, name, group]) => ({ id, name, group }));

const NG = "Not performed: not indicated for this isolate.";
export const NOT_DONE = NG;

export const BENCH_CASES: BenchCase[] = [
  {
    id: "mastitis-gbs",
    title: "Bulk-tank trouble",
    from: "Dairy herd, 140 Holsteins",
    specimen: "Composite milk from a cow with chronic, low-grade mastitis",
    history:
      "The herd’s bulk-tank somatic cell count has crept up all season. Several quarters have watery clots. The herd buys in replacement heifers.",
    gram: {
      text: "Gram stain from colonies: Gram-positive cocci in pairs and short chains.",
    },
    plates: [
      {
        medium: "Blood agar (sheep), 24 h",
        finding: {
          text: "Small, grey-white, translucent colonies with a narrow zone of beta hemolysis.",
        },
      },
      {
        medium: "Edwards / esculin blood agar",
        finding: { text: "Colonies remain grey; no blackening of the medium." },
      },
    ],
    tests: {
      catalase: { text: "Negative: no bubbles." },
      camp: {
        text: "Positive: arrowhead of enhanced hemolysis at the β-lysin streak.",
        image: "phil-10853-camp.jpg",
      },
      hippurate: { text: "Positive: deep purple with ninhydrin." },
      esculin: { text: "Negative: no blackening." },
      bacitracin: { text: "Resistant: growth up to the disk." },
      lancefield: { text: "Agglutination with group B latex." },
      optochin: { text: "Resistant." },
    },
    answer: "strep-agalactiae",
    keyFindings: [
      "Catalase-negative cocci in chains",
      "Narrow beta hemolysis",
      "CAMP-positive and hippurate-positive",
      "Esculin-negative, which rules out S. uberis and enterococci",
    ],
    note: "Streptococcus agalactiae is named for the drop in milk it causes in cows (a-galactia, “no milk”). It is a contagious udder pathogen spread at milking, often brought in with purchased animals, and it responds well to treatment and milking hygiene.",
  },
  {
    id: "fowl-cholera",
    title: "Sudden deaths in the flock",
    from: "Backyard flock, 30 laying hens",
    specimen: "Liver and heart blood from a hen found dead",
    history:
      "Four hens died overnight with no warning. Two more are lethargic, with green diarrhea and swollen wattles. Wild birds share the run.",
    gram: {
      text: "Gram stain of heart blood: very small Gram-negative coccobacilli; bipolar staining with Wright’s.",
      image: "phil-3621.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 24 h",
        finding: {
          text: "Small, smooth, grey, non-hemolytic colonies with a faint musty smell.",
        },
      },
      {
        medium: "MacConkey agar, 24 h",
        finding: { text: "No growth." },
      },
    ],
    tests: {
      oxidase: { text: "Positive." },
      catalase: { text: "Positive." },
      indole: { text: "Positive: blue-green with DMACA." },
      urease: { text: "Negative." },
      tsi: { text: "Acid slant, acid butt; no gas, no H₂S." },
      motility: { text: "Non-motile." },
    },
    answer: "pasteurella",
    keyFindings: [
      "Tiny Gram-negative coccobacilli from septicemic tissue",
      "No growth on MacConkey",
      "Oxidase-, catalase- and indole-positive; urease-negative",
      "Non-hemolytic, which separates it from Mannheimia",
    ],
    note: "Fowl cholera is the acute septicemic form of Pasteurella multocida infection in poultry. Louis Pasteur used this organism in 1880 to make one of the first attenuated vaccines.",
  },
  {
    id: "diamond-skin",
    title: "Raised red diamonds",
    from: "Pig farm, grower unit",
    specimen: "Spleen from a 5-month-old pig that died",
    history:
      "Several growers have fever, are off feed, and have raised, square to diamond-shaped red skin lesions. One died this morning. The herd’s vaccination lapsed this year.",
    gram: {
      text: "Gram stain from colonies: slender Gram-positive rods, some in short chains and filaments.",
      image: "phil-20145.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 48 h",
        finding: {
          text: "Tiny, translucent, pinpoint colonies with slight greening (alpha) under them.",
          image: "phil-1603.jpg",
        },
      },
      { medium: "MacConkey agar", finding: { text: "No growth." } },
    ],
    tests: {
      catalase: { text: "Negative." },
      oxidase: { text: "Negative." },
      tsi: {
        text: "Alkaline slant over acid butt with black H₂S along the stab.",
      },
      motility: { text: "Non-motile." },
      esculin: { text: "Negative." },
      camp: { text: "Negative." },
    },
    answer: "erysipelothrix",
    keyFindings: [
      "Slender Gram-positive rods, catalase-negative",
      "H₂S produced in TSI, unusual for a Gram-positive",
      "Non-motile and esculin-negative, which separates it from Listeria",
    ],
    note: "Swine erysipelas, “diamond skin disease.” Erysipelothrix rhusiopathiae also causes erysipeloid, a skin infection of fish handlers, butchers and veterinarians.",
  },
  {
    id: "foal-pneumonia",
    title: "A coughing foal",
    from: "Horse breeding farm",
    specimen: "Transtracheal aspirate from a 2-month-old foal",
    history:
      "Fever, cough and fast breathing. Ultrasound shows round abscesses in the lungs. The farm has had similar cases in previous summers, on dry, dusty paddocks.",
    gram: {
      text: "Gram stain: Gram-positive coccobacilli and short rods, some inside macrophages.",
      image: "phil-15190.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 48 h",
        finding: {
          text: "Moist, glistening, non-hemolytic colonies, turning salmon-pink by day 3–4.",
          image: "phil-1553.jpg",
        },
      },
      { medium: "MacConkey agar", finding: { text: "No growth." } },
    ],
    tests: {
      catalase: { text: "Positive." },
      oxidase: { text: "Negative." },
      urease: { text: "Positive." },
      motility: { text: "Non-motile." },
      camp: {
        text: "Positive: synergistic hemolysis with the Staphylococcus aureus streak.",
      },
      esculin: { text: "Negative." },
    },
    answer: "rhodococcus",
    keyFindings: [
      "Coryneform Gram-positive rods in a foal’s pyogranulomatous pneumonia",
      "Mucoid colonies that turn salmon-pink",
      "Catalase- and urease-positive, CAMP-positive",
    ],
    note: "Rhodococcus equi is a soil organism. It causes abscessing pneumonia in foals between about one and six months old, especially on dusty farms where the organism builds up over the years.",
  },
  {
    id: "circling-sheep",
    title: "Ewes walking in circles",
    from: "Sheep farm, late winter",
    specimen: "Brainstem from a ewe that died",
    history:
      "Several ewes are dull, drooling, have one-sided facial paralysis and walk in circles. The flock moved onto a new clamp of silage two weeks ago; the face of the clamp was spoiled.",
    scene: "phil-28021.jpg",
    gram: {
      text: "Gram stain from colonies: short Gram-positive rods, singly and in short chains.",
      image: "phil-28051.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 24–48 h (after cold enrichment)",
        finding: {
          text: "Small, translucent colonies with a narrow zone of beta hemolysis, often only under the colony.",
        },
      },
      { medium: "MacConkey agar", finding: { text: "No growth." } },
    ],
    tests: {
      catalase: { text: "Positive." },
      oxidase: { text: "Negative." },
      motility: {
        text: "Motile at 25 °C, with an umbrella of growth just below the surface; not motile at 37 °C. Wet mount shows tumbling motility.",
        image: "phil-18990.jpg",
      },
      esculin: { text: "Positive: black within hours." },
      camp: { text: "Positive with Staphylococcus aureus." },
      hippurate: { text: "Positive." },
    },
    answer: "listeria",
    keyFindings: [
      "Short Gram-positive rods, catalase-positive",
      "Tumbling motility at room temperature, not at 37 °C",
      "Esculin-positive and CAMP-positive",
    ],
    note: "“Circling disease.” Listeria monocytogenes multiplies in poorly fermented silage where the pH stays high. Cold enrichment, holding the tissue at 4 °C for weeks, was the old trick for recovering it from brain.",
  },
  {
    id: "pulpy-kidney",
    title: "Best lambs found dead",
    from: "Sheep farm, feedlot lambs",
    specimen: "Intestinal contents and kidney from a lamb",
    history:
      "Three of the best-growing lambs were found dead after the grain ration was raised. Kidneys were soft at necropsy, and there was glucose in the urine.",
    gram: {
      text: "Gram stain of gut contents: large, blunt, boxcar-shaped Gram-positive rods in large numbers; no spores seen.",
      image: "phil-12053.jpg",
    },
    plates: [
      {
        medium: "Blood agar, anaerobic, 24 h",
        finding: {
          text: "Flat, grey colonies with a double zone of hemolysis: complete inside, partial outside.",
        },
      },
      {
        medium: "SPS agar, anaerobic",
        finding: {
          text: "Black colonies.",
          image: "phil-3874.jpg",
        },
      },
      {
        medium: "Blood agar, aerobic",
        finding: { text: "No growth." },
      },
    ],
    tests: {
      lecithinase: {
        text: "Opacity around colonies on the untreated half, suppressed by antitoxin: Nagler-positive.",
        image: "phil-3873.jpg",
      },
      "reverse-camp": { text: "Positive: a bow-tie of enhanced hemolysis." },
      catalase: { text: "Negative." },
      motility: { text: "Non-motile." },
    },
    answer: "c-perfringens",
    keyFindings: [
      "Large boxcar Gram-positive rods without visible spores",
      "Strict anaerobe with double-zone hemolysis",
      "Nagler-positive, reverse CAMP-positive, non-motile",
    ],
    note: "“Pulpy kidney,” or overeating disease: enterotoxemia from Clostridium perfringens type D, whose epsilon toxin is released when grain upsets the gut. Typing the toxin takes PCR or a toxin assay; the culture only names the species.",
  },
  {
    id: "sow-abortions",
    title: "An abortion storm",
    from: "Outdoor pig herd, near woodland",
    specimen: "Aborted fetus (stomach contents) and placenta",
    history:
      "Several sows aborted in late gestation. Boars have swollen testicles. Feral hogs have been seen at the fence line.",
    gram: {
      text: "Gram stain from colonies: very small, faintly staining Gram-negative coccobacilli, “like fine sand.”",
      image: "phil-19255.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 48–72 h in CO₂",
        finding: {
          text: "Tiny, smooth, honey-colored, non-hemolytic colonies, visible only after two days.",
          image: "phil-17135.jpg",
        },
      },
      { medium: "MacConkey agar", finding: { text: "No growth." } },
    ],
    tests: {
      oxidase: { text: "Positive." },
      catalase: { text: "Positive." },
      urease: { text: "Strongly positive within minutes." },
      motility: { text: "Non-motile." },
      indole: { text: "Negative." },
    },
    answer: "brucella",
    keyFindings: [
      "Tiny Gram-negative coccobacilli, slow growing",
      "Oxidase- and catalase-positive",
      "Rapid urease, non-motile, no growth on MacConkey",
      "Abortion and orchitis with feral-hog contact",
    ],
    note: "Brucella suis. In a real lab this is the moment to stop: suspect Brucella goes into the biosafety cabinet and on to the reference laboratory, because it is one of the most common lab-acquired infections. It is a reportable disease.",
  },
  {
    id: "campy-chicken",
    title: "After the barbecue",
    from: "Clinic",
    specimen: "Stool from a 34-year-old with bloody diarrhea and cramps",
    history:
      "Ill three days after a family barbecue where the chicken was “a little pink.” Fever and abdominal pain.",
    gram: {
      text: "Gram stain from colonies (carbol-fuchsin counterstain): slender curved Gram-negative rods — commas, S-shapes and gull wings.",
      image: "phil-29246.jpg",
    },
    plates: [
      {
        medium: "Skirrow selective blood agar, 42 °C, microaerobic, 48 h",
        finding: {
          text: "Small, round, grey, moist colonies.",
          image: "phil-15984-plate.jpg",
        },
      },
      {
        medium: "Same plate incubated aerobically",
        finding: { text: "No growth." },
      },
    ],
    tests: {
      oxidase: { text: "Positive." },
      catalase: { text: "Positive." },
      hippurate: { text: "Positive." },
      motility: { text: "Darting, corkscrew motility on wet mount." },
      temp: { text: "Grows at 42 °C; no growth at 25 °C." },
    },
    answer: "campy-jejuni",
    keyFindings: [
      "Curved Gram-negative rods",
      "Microaerobic growth at 42 °C on selective medium",
      "Oxidase- and catalase-positive; hippurate-positive",
    ],
    note: "Campylobacter jejuni lives harmlessly in poultry guts, and undercooked chicken is the classic source. Hippurate hydrolysis separates it from C. coli. Growth at 42 °C but not 25 °C separates it from C. fetus.",
  },
  {
    id: "dog-uti",
    title: "A dog with a bladder infection",
    from: "Small-animal clinic",
    specimen: "Cystocentesis urine from a 9-year-old spayed Labrador",
    history:
      "Straining and urinating often for a week. The urine pH is high, and struvite crystals are on the sediment.",
    gram: { text: "Gram stain from colonies: Gram-negative rods." },
    plates: [
      {
        medium: "Blood agar, 24 h",
        finding: {
          text: "Waves of swarming growth across the whole plate, with a “burnt chocolate” smell.",
          image: "phil-1046.jpg",
        },
      },
      {
        medium: "MacConkey agar, 24 h",
        finding: {
          text: "Colorless, non-lactose-fermenting colonies; no swarming.",
        },
      },
    ],
    tests: {
      oxidase: { text: "Negative." },
      urease: { text: "Positive: bright pink within 4 hours." },
      tsi: {
        text: "Alkaline slant, acid butt, H₂S-positive.",
        image: "phil-15213-h2s.jpg",
      },
      indole: { text: "Negative." },
      motility: { text: "Motile." },
      catalase: { text: "Positive." },
    },
    answer: "proteus-mirabilis",
    keyFindings: [
      "Swarming Gram-negative rod",
      "Non-lactose-fermenter, H₂S-positive",
      "Rapid urease, which explains the alkaline urine and struvite",
      "Indole-negative, which separates it from P. vulgaris",
    ],
    note: "Proteus urease splits urea to ammonia, raising the urine pH and driving struvite stones. In the Dienes test, swarms of the same strain merge, while different strains stop at a visible line.",
  },
  {
    id: "dog-ear",
    title: "An ear that won’t heal",
    from: "Small-animal clinic",
    specimen: "Swab from the right ear canal of a 6-year-old cocker spaniel",
    history:
      "Chronic otitis externa, treated several times. The discharge is now green and foul, and the canal is ulcerated.",
    gram: {
      text: "Gram stain from colonies: straight, slender Gram-negative rods.",
      image: "phil-17370.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 24 h",
        finding: {
          text: "Spreading, irregular colonies with a metallic sheen and beta hemolysis; a grape-like smell. The agar around them is tinged blue-green.",
          image: "phil-6688.jpg",
        },
      },
      {
        medium: "MacConkey agar, 24 h",
        finding: { text: "Non-lactose-fermenting colonies." },
      },
    ],
    tests: {
      oxidase: { text: "Positive: purple within 10 seconds." },
      catalase: { text: "Positive." },
      tsi: { text: "Alkaline slant, alkaline butt (no fermentation); no H₂S." },
      temp: { text: "Grows at 42 °C." },
      indole: { text: "Negative." },
      motility: { text: "Motile." },
    },
    answer: "pseudomonas",
    keyFindings: [
      "Non-fermenting Gram-negative rod (K/K TSI)",
      "Oxidase-positive",
      "Blue-green pigment, grape odor, growth at 42 °C",
    ],
    note: "Pseudomonas aeruginosa: the blue-green is pyocyanin and the smell is aminoacetophenone. In chronic canine otitis it is often multidrug-resistant, so susceptibility testing matters as much as the ID.",
  },
  {
    id: "pneumonia",
    title: "Rust-colored sputum",
    from: "Hospital, medical ward",
    specimen: "Sputum and blood cultures from a 72-year-old man",
    history:
      "Abrupt fever, a single shaking chill, pleuritic chest pain and rust-colored sputum. Right lower lobe consolidation on X-ray.",
    gram: {
      text: "Gram stain: many neutrophils and lancet-shaped Gram-positive diplococci, some with clear capsules.",
      image: "phil-21340.jpg",
    },
    plates: [
      {
        medium: "Blood agar with gentamicin, CO₂, 24 h",
        finding: {
          text: "Small, alpha-hemolytic colonies, several with collapsed centers.",
          image: "phil-10863.jpg",
        },
      },
      { medium: "MacConkey agar", finding: { text: "No growth." } },
    ],
    tests: {
      catalase: { text: "Negative." },
      optochin: {
        text: "Susceptible: 18 mm zone.",
        image: "phil-19332.jpg",
      },
      bile: { text: "Soluble: colonies dissolve in deoxycholate." },
      bacitracin: { text: "Not relevant for an alpha-hemolytic isolate." },
      lancefield: { text: "No group antigen detected." },
    },
    answer: "strep-pneumoniae",
    keyFindings: [
      "Lancet-shaped Gram-positive diplococci",
      "Alpha-hemolytic “draughtsman” colonies",
      "Catalase-negative, optochin-susceptible, bile-soluble",
    ],
    note: "The pneumococcus. The draughtsman colony comes from autolysis collapsing the colony’s center, the same autolysin that makes it bile-soluble.",
  },
  {
    id: "fried-rice",
    title: "Vomiting after takeout",
    from: "Public health lab",
    specimen: "Leftover fried rice from a restaurant",
    history:
      "Five diners began vomiting one to five hours after eating. All were better by the next day. The rice had been cooked in bulk and kept warm all afternoon.",
    gram: {
      text: "Gram stain from colonies: large Gram-positive rods in chains, with central oval spores that do not swell the cell.",
      image: "phil-1060.jpg",
    },
    plates: [
      {
        medium: "Sheep blood agar, 24 h",
        finding: {
          text: "Large, flat, grey, ground-glass colonies with a wide zone of beta hemolysis.",
          image: "phil-12377.jpg",
        },
      },
    ],
    tests: {
      catalase: { text: "Positive." },
      motility: { text: "Motile." },
      lecithinase: { text: "Positive: wide opaque zone on egg-yolk agar." },
      oxidase: { text: "Negative." },
    },
    answer: "bacillus-cereus",
    keyFindings: [
      "Large spore-forming Gram-positive rods",
      "Strong beta hemolysis",
      "Motile, which rules out B. anthracis (non-hemolytic and non-motile)",
      "Lecithinase-positive",
    ],
    note: "The emetic toxin of Bacillus cereus survives reheating. Spores survive cooking, germinate while rice is kept warm, and the toxin forms in the food, which is why the illness starts so soon after the meal.",
  },
  {
    id: "chitterlings",
    title: "Holiday chitterlings",
    from: "Pediatric hospital",
    specimen: "Stool from a 4-year-old",
    history:
      "Fever, diarrhea and right-lower-quadrant pain mimicking appendicitis. The family prepared chitterlings for the holidays.",
    gram: {
      text: "Gram stain from colonies: small Gram-negative coccobacilli.",
    },
    plates: [
      {
        medium: "Hektoen enteric agar, 48 h",
        finding: {
          text: "Small colonies on a blue-green background.",
          image: "phil-6707.jpg",
        },
      },
      {
        medium: "CIN agar, 25 °C, 48 h",
        finding: {
          text: "Small colonies with a deep red center and a clear edge: “bull’s-eyes.”",
        },
      },
      {
        medium: "MacConkey agar, 48 h",
        finding: { text: "Small, colorless, non-lactose-fermenting colonies." },
      },
    ],
    tests: {
      oxidase: { text: "Negative." },
      urease: { text: "Positive." },
      motility: { text: "Motile at 25 °C; non-motile at 37 °C." },
      tsi: {
        text: "Acid slant, acid butt (sucrose fermented); no gas, no H₂S.",
      },
      indole: { text: "Variable by biotype; this isolate is positive." },
      temp: { text: "Grows well at 25 °C and at 4 °C with cold enrichment." },
    },
    answer: "yersinia-ent",
    keyFindings: [
      "Small Gram-negative coccobacilli with bull’s-eye colonies on CIN",
      "Urease-positive",
      "Motile at 25 °C but not at 37 °C",
      "Sucrose-positive, which helps separate it from Y. pseudotuberculosis",
    ],
    note: "Pigs carry Yersinia enterocolitica in their throats and intestines. Preparing raw chitterlings is a known source in young children. It grows in the refrigerator, which is how cold enrichment works.",
  },
  {
    id: "sour-crop",
    title: "Sour crop",
    from: "Small turkey farm",
    specimen: "Crop lining from a 4-week-old poult",
    history:
      "Poults are listless, with a doughy crop and sour breath. They were on a long course of antibiotics in the water.",
    gram: {
      text: "Gram stain of crop scraping: large Gram-positive budding yeast cells and pseudohyphae.",
    },
    plates: [
      {
        medium: "Sabouraud dextrose agar, 48 h",
        finding: {
          text: "Creamy, white, smooth colonies with a yeasty smell.",
        },
      },
      {
        medium: "Blood agar, 48 h",
        finding: {
          text: "Small white colonies; by 48 hours some show spiky “feet” at their edges.",
        },
      },
    ],
    tests: {
      "germ-tube": {
        text: "Positive: germ tubes with no constriction at their origin after 2–3 hours in serum.",
        image: "phil-26757.jpg",
      },
      cornmeal: {
        text: "Pseudohyphae with round, thick-walled terminal chlamydospores.",
        image: "phil-24997.jpg",
      },
      urease: { text: "Negative." },
      catalase: { text: "Positive." },
    },
    answer: "candida-albicans",
    keyFindings: [
      "Budding yeast with pseudohyphae",
      "Germ tube-positive",
      "Chlamydospores on cornmeal agar",
      "Urease-negative, which rules out Cryptococcus",
    ],
    note: "Crop mycosis (thrush of the crop) usually follows antibiotics or poor hygiene that upset the normal crop flora. The germ tube test is still among the fastest IDs in mycology.",
  },
  {
    id: "cockatoo",
    title: "A cockatoo short of breath",
    from: "Avian veterinary practice",
    specimen:
      "Lung tissue and air-sac swab from a sulphur-crested cockatoo (necropsy)",
    history:
      "A 20-year-old indoor cockatoo with tail-bobbing, voice change and weight loss. It was housed in a damp room with moldy seed.",
    gram: {
      text: "Lung, PAS stain: hyphae and fruiting heads within an air space.",
      image: "phil-24801.jpg",
    },
    plates: [
      {
        medium: "Sabouraud dextrose agar, 3 days",
        finding: {
          text: "Fast-growing colonies, velvety to powdery, grey-green with a white margin.",
          image: "phil-25080.jpg",
        },
      },
    ],
    tests: {
      tease: {
        text: "Conidial heads: a flask-shaped vesicle with a single row of phialides on its upper part only, bearing columns of small conidia.",
        image: "phil-24963.jpg",
      },
      temp: { text: "Grows at 45–50 °C." },
      "germ-tube": { text: "Not applicable to a mold." },
    },
    answer: "aspergillus-fumigatus",
    keyFindings: [
      "Septate hyphae with fruiting heads in tissue",
      "Grey-green, powdery colonies",
      "Uniseriate phialides on the upper vesicle, in columnar heads",
      "Thermotolerant to 50 °C",
    ],
    note: "Aspergillosis is the most common fungal disease of pet birds. Birds lack a diaphragm and have air sacs that trap spores. In poultry the same infection in chicks is called brooder pneumonia.",
  },
  {
    id: "calf-scours",
    title: "Three-day-old calves scouring",
    from: "Beef cow–calf operation",
    specimen: "Feces from a 3-day-old calf",
    history:
      "Profuse watery, yellow diarrhea in several calves under a week old. Dehydrated, with sunken eyes. The calving pen was crowded and muddy.",
    gram: {
      text: "Gram stain from colonies: Gram-negative rods.",
      image: "phil-24572.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 24 h",
        finding: { text: "Grey, smooth colonies, some with beta hemolysis." },
      },
      {
        medium: "MacConkey agar, 24 h",
        finding: {
          text: "Pink, dry, lactose-fermenting colonies with a hazy pink halo of precipitated bile.",
        },
      },
    ],
    tests: {
      oxidase: { text: "Negative." },
      indole: { text: "Positive." },
      tsi: {
        text: "Acid slant, acid butt, gas; no H₂S.",
        image: "phil-15213-gas.jpg",
      },
      urease: { text: "Negative." },
      motility: { text: "Motile." },
    },
    answer: "e-coli",
    keyFindings: [
      "Lactose-fermenting Gram-negative rod",
      "Indole-positive, oxidase-negative",
      "A/A with gas in TSI; no H₂S; urease-negative",
    ],
    note: "In calves under a week old, the usual culprit is enterotoxigenic E. coli carrying the K99 (F5) fimbria, which is confirmed by antigen or PCR testing. Colostrum and clean calving pens prevent most cases.",
  },
  {
    id: "bearded-dragon",
    title: "The family lizard",
    from: "Pediatric clinic",
    specimen: "Stool from a 2-year-old",
    history:
      "Fever and diarrhea for four days. The family recently bought a bearded dragon, and the toddler likes to help clean its tank.",
    gram: { text: "Gram stain from colonies: Gram-negative rods." },
    plates: [
      {
        medium: "MacConkey agar, 24 h",
        finding: { text: "Colorless, non-lactose-fermenting colonies." },
      },
      {
        medium: "Hektoen enteric agar, 24 h",
        finding: { text: "Blue-green colonies with black centers." },
      },
    ],
    tests: {
      oxidase: { text: "Negative." },
      tsi: {
        text: "Alkaline slant, acid butt, H₂S-positive.",
        image: "phil-5158-h2s.jpg",
      },
      urease: { text: "Negative." },
      indole: { text: "Negative." },
      motility: { text: "Motile." },
    },
    answer: "salmonella",
    keyFindings: [
      "Non-lactose-fermenter with black-centered colonies on HE",
      "K/A with H₂S in TSI",
      "Urease-negative, which rules out Proteus",
      "Indole-negative and motile",
    ],
    note: "Reptiles carry Salmonella without being ill. Serotyping would follow, and reptile-associated strains are often unusual serotypes. Hand-washing after handling a reptile or its tank prevents most cases.",
  },
  {
    id: "oysters",
    title: "Raw oysters in August",
    from: "Clinic, coastal town",
    specimen: "Stool from a 51-year-old",
    history:
      "Watery diarrhea, cramps and nausea starting about a day after eating raw oysters during a heat wave.",
    gram: { text: "Gram stain from colonies: curved Gram-negative rods." },
    plates: [
      {
        medium: "TCBS agar, 24 h",
        finding: {
          text: "Green colonies (sucrose not fermented).",
          image: "phil-16674.jpg",
        },
      },
      {
        medium: "Blood agar, 24 h",
        finding: { text: "Smooth, grey colonies." },
      },
    ],
    tests: {
      oxidase: { text: "Positive." },
      string: {
        text: "Positive: a mucoid string forms as the loop is lifted.",
      },
      salt: { text: "No growth in 0% NaCl; good growth in 6% NaCl." },
      tsi: { text: "Alkaline slant, acid butt; no H₂S." },
      motility: { text: "Motile." },
    },
    answer: "v-parahaem",
    keyFindings: [
      "Curved Gram-negative rods from shellfish-associated diarrhea",
      "Oxidase-positive (unlike the enterics)",
      "Green on TCBS (sucrose-negative)",
      "Halophilic: needs salt to grow",
    ],
    note: "Vibrio parahaemolyticus multiplies in warm coastal water, which is why cases climb in late summer. V. cholerae, by contrast, is sucrose-positive (yellow on TCBS) and grows without added salt.",
  },
  {
    id: "shipping-fever",
    title: "Feedlot arrivals",
    from: "Cattle feedlot",
    specimen: "Lung from a weaned calf that died 10 days after arrival",
    history:
      "Newly arrived, commingled calves are febrile, with nasal discharge and a moist cough. Several died, with severe fibrinous pneumonia of the front lung lobes.",
    gram: {
      text: "Gram stain from colonies: small Gram-negative rods and coccobacilli.",
      image: "phil-16101.jpg",
    },
    plates: [
      {
        medium: "Blood agar, 24 h",
        finding: {
          text: "Small, grey colonies with a narrow zone of beta hemolysis.",
        },
      },
      {
        medium: "MacConkey agar, 24–48 h",
        finding: { text: "Small, pale pink colonies (slow, weak growth)." },
      },
    ],
    tests: {
      oxidase: { text: "Positive." },
      catalase: { text: "Positive." },
      indole: { text: "Negative." },
      urease: { text: "Negative." },
      motility: { text: "Non-motile." },
    },
    answer: "mannheimia",
    keyFindings: [
      "Small Gram-negative coccobacilli, oxidase-positive",
      "Beta-hemolytic and grows on MacConkey",
      "Indole-negative, which separates it from Pasteurella multocida",
    ],
    note: "Mannheimia haemolytica, formerly Pasteurella haemolytica, is the main bacterium of “shipping fever.” Stress, commingling and viral infections let it move from the nose into the lungs.",
  },
];
