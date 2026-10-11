import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { BENCH_CASES, ORGANISMS, TESTS } from "../src/lab/bench-cases";
import { CELL_POOL, HEME_CASES, buildSlide } from "../src/lab/heme-cases";
import { BenchUnknowns } from "../src/lab/BenchUnknowns";
import { Differential } from "../src/lab/Differential";
import { freshLab, type LabProgress } from "../src/lab/lab-progress";

const lab = JSON.parse(
  readFileSync("public/media/lab/manifest.json", "utf8"),
) as {
  file: string;
  license: string;
}[];
const labFiles = new Set(lab.map((m) => m.file));

describe("bench unknowns", () => {
  it("every case is complete, uses known tests and organisms, and only credited public-domain images", () => {
    const testIds = new Set(TESTS.map((t) => t.id));
    const organisms = new Set(ORGANISMS.map((o) => o.id));
    expect(BENCH_CASES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(BENCH_CASES.map((c) => c.id)).size).toBe(BENCH_CASES.length);
    for (const c of BENCH_CASES) {
      expect(organisms.has(c.answer), c.id).toBe(true);
      expect(c.keyFindings.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(c.tests).length, c.id).toBeGreaterThanOrEqual(3);
      for (const t of Object.keys(c.tests))
        expect(testIds.has(t as never), `${c.id}:${t}`).toBe(true);
      const images = [
        c.scene,
        c.gram.image,
        ...c.plates.map((p) => p.finding.image),
        ...Object.values(c.tests).map((t) => t?.image),
      ].filter(Boolean) as string[];
      for (const f of images) {
        expect(labFiles.has(f), f).toBe(true);
        expect(existsSync(`public/media/lab/${f}`), f).toBe(true);
      }
    }
    for (const m of lab) expect(m.license).toMatch(/Public domain/);
  });

  it("a workup records ordered tests, then signs out with the reference answer and its reasoning", () => {
    let progress: LabProgress = freshLab();
    const view = render(
      <BenchUnknowns progress={progress} onProgress={(p) => (progress = p)} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Ewes walking in circles/ }),
    );
    view.rerender(
      <BenchUnknowns progress={progress} onProgress={(p) => (progress = p)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Read the slide" }));
    view.rerender(
      <BenchUnknowns progress={progress} onProgress={(p) => (progress = p)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Esculin hydrolysis" }));
    view.rerender(
      <BenchUnknowns progress={progress} onProgress={(p) => (progress = p)} />,
    );
    expect(
      screen.getByText("Positive: black within hours."),
    ).toBeInTheDocument();
    expect(progress.benchDraft?.ordered).toEqual(["esculin"]);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "erysipelothrix" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Sign out the report" }),
    );
    expect(
      screen.getByText(/reference identification differs/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Listeria monocytogenes", { selector: "h3" }),
    ).toBeInTheDocument();
    expect(progress.bench[0]).toMatchObject({
      caseId: "circling-sheep",
      answer: "erysipelothrix",
      correct: false,
    });
    expect(progress.benchDraft).toBeUndefined();
  });
});

describe("hematology differentials", () => {
  it("each smear has 100 white cells and enough distinct images for every type", () => {
    for (const c of HEME_CASES) {
      const counts = c.counts;
      const wbc = Object.entries(counts)
        .filter(([t]) => t !== "nrbc")
        .reduce((a, [, n]) => a + (n ?? 0), 0);
      expect(wbc, c.id).toBe(100);
      for (const [t, n] of Object.entries(counts))
        expect(n!, `${c.id}:${t}`).toBeLessThanOrEqual(
          CELL_POOL[t as keyof typeof CELL_POOL],
        );
      const slide = buildSlide(c, 1);
      expect(slide.length).toBe(100 + (counts.nrbc ?? 0));
      for (const cell of slide)
        expect(existsSync(`public/media/cells/${cell.file}`), cell.file).toBe(
          true,
        );
      expect(buildSlide(c, 1)).toEqual(slide);
    }
  });

  it("counting 100 cells shows the differential against the reference and the interpretation", () => {
    let progress: LabProgress = freshLab();
    render(
      <Differential
        progress={progress}
        onProgress={(p) => (progress = p)}
        sound={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Routine pre-op CBC/ }));
    for (let i = 0; i < 100; i++)
      fireEvent.click(screen.getByRole("button", { name: /^Seg/ }));
    expect(screen.getByText("Your differential")).toBeInTheDocument();
    expect(screen.getByText(/A normal adult differential/)).toBeInTheDocument();
    expect(progress.diffs[0]).toMatchObject({ caseId: "preop", agreement: 56 });
  });
});
