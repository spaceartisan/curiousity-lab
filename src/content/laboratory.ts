import { specimens } from "./specimens";
export type LabExperience = "workbench" | "explorer";
export type LabStage =
  "desk" | "case" | "microscope" | "observations" | "compare";
export interface LabPage {
  specimen: number;
  zoom: number;
  pan: number[];
  observations: string[];
  text: string;
}
export interface LabData extends LabPage {
  stage: LabStage;
  experience?: LabExperience;
  workflowRevision?: 1;
  pages?: LabPage[];
}
// Original fictional framing; these source images are not from the imagined case.
export const labWorkflows = [
  {
    id: "branching-study-v1",
    revision: 1,
    labDomain: "microbiology",
    specimenId: "phil-26402-r1",
    title: "A branching study",
    fictionalCaseStatement:
      "Imagine a veterinary teaching desk has set aside a prepared slide to explore branching shapes. Look at what interests you and, if you like, leave a notebook note.",
    prompt: "What shapes or branching patterns catch your eye?",
    educationalScope:
      "Optional visual observation; no specimen processing, identification test or diagnosis.",
    orderedOptionalSteps: ["case", "microscope", "observations", "compare"],
  },
  {
    id: "rounded-forms-v1",
    revision: 1,
    labDomain: "microbiology",
    specimenId: "phil-10041-r1",
    title: "A study of rounded forms",
    fictionalCaseStatement:
      "Imagine a teaching colleague has chosen an image of rounded cells for your desk. Explore their shapes and how they sit beside one another; a notebook note is optional.",
    prompt: "What do you notice about the two rounded forms?",
    educationalScope:
      "Optional visual observation; no specimen processing, identification test or diagnosis.",
    orderedOptionalSteps: ["case", "microscope", "observations", "compare"],
  },
] as const;
export function blankLabPage(specimen: number): LabPage {
  return { specimen, zoom: 1, pan: [0, 0], observations: [], text: "" };
}
export function labMode(data: LabData) {
  return data.workflowRevision === undefined
    ? "explore"
    : `${data.experience === "explorer" ? "microscope_explorer" : "lab_workbench"}:microbiology`;
}
export function labPuzzle(data: LabData) {
  const asset = specimens[data.specimen].id;
  return data.workflowRevision === undefined
    ? asset
    : data.experience === "explorer"
      ? `lab-explorer-v1:${asset}`
      : `lab-workbench:${labWorkflows[data.specimen].id}:${asset}`;
}
// Each slide has its own bounded local page. Switching never transfers observations
// from one image to another or discards the previous unfinished note/view.
export function selectLabSlide(
  data: LabData,
  specimen: number,
  experience: LabExperience,
  stage: LabStage,
): LabData {
  const current: LabPage = {
    specimen: data.specimen,
    zoom: data.zoom,
    pan: data.pan,
    observations: data.observations,
    text: data.text,
  };
  const pages = [
    ...(data.pages ?? []).filter((p) => p.specimen !== current.specimen),
    current,
  ];
  const target =
    specimen === data.specimen
      ? current
      : (pages.find((p) => p.specimen === specimen) ?? blankLabPage(specimen));
  return { ...target, pages, experience, workflowRevision: 1, stage };
}
