import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import killer from "../src/content/killer.json";
import countdown from "../src/content/countdown.json";
import hiveData from "../src/content/hives.json";
import ladderData from "../src/content/ladders.json";
import { QUOTATIONS } from "../src/content/quotations";
import { combinations, type KillerPuzzle } from "../src/puzzles/KillerSudoku";
import { cipherKey, Cryptogram } from "../src/puzzles/Cryptogram";
import { WordLadder, type Ladder } from "../src/puzzles/WordLadder";
import type { CountdownRound } from "../src/puzzles/Countdown";
import type { Hive } from "../src/puzzles/LetterHive";

const puzzles = killer as unknown as KillerPuzzle[];
const rounds = countdown as unknown as CountdownRound[];
const hives = (hiveData as unknown as { hives: Hive[] }).hives;
const { ladders, dictionary } = ladderData as unknown as {
  ladders: Ladder[];
  dictionary: Record<string, string[]>;
};

describe("Killer Sudoku", () => {
  it("cage combinations match the classic table", () => {
    expect(combinations(2, 3)).toEqual([[1, 2]]);
    expect(combinations(2, 17)).toEqual([[8, 9]]);
    expect(combinations(3, 7)).toEqual([[1, 2, 4]]);
    expect(combinations(9, 45)).toHaveLength(1);
  });

  it("every puzzle is a valid solved grid cut into cages whose sums add up", () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(30);
    for (const p of puzzles) {
      const g = p.solution;
      for (let k = 0; k < 9; k++) {
        const row = g.slice(k * 9, k * 9 + 9);
        const col = g.filter((_, i) => i % 9 === k);
        const box = g.filter(
          (_, i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3) === k,
        );
        for (const unit of [row, col, box]) expect(new Set(unit).size).toBe(9);
      }
      const cells = p.cages.flatMap((c) => c.cells).sort((a, b) => a - b);
      expect(cells).toEqual([...Array(81).keys()]);
      for (const c of p.cages) {
        const digits = c.cells.map((i) => g[i]);
        expect(new Set(digits).size).toBe(digits.length);
        expect(digits.reduce((a, b) => a + b, 0)).toBe(c.sum);
      }
    }
  });
});

describe("Countdown", () => {
  it("every stored solution uses the given numbers and reaches the target", () => {
    for (const r of rounds) {
      const pool = [...r.numbers];
      for (const [a, op, b, result] of r.solution) {
        for (const n of [a, b]) {
          const at = pool.indexOf(n);
          expect(at, `${r.id} uses ${n}`).toBeGreaterThanOrEqual(0);
          pool.splice(at, 1);
        }
        const value =
          op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
        expect(value).toBe(result);
        expect(Number.isInteger(result) && result > 0).toBe(true);
        pool.push(result);
      }
      expect(r.solution[r.solution.length - 1][3]).toBe(r.target);
    }
  });
});

describe("Letter Hive", () => {
  it("answers use the center letter and only hive letters, with a pangram", () => {
    for (const h of hives) {
      const letters = new Set(h.center + h.letters);
      expect(letters.size).toBe(7);
      expect(h.pangrams.length).toBeGreaterThan(0);
      for (const w of [...h.answers, ...h.bonus]) {
        expect(w.length).toBeGreaterThanOrEqual(4);
        expect(w).toContain(h.center);
        for (const c of w) expect(letters.has(c)).toBe(true);
      }
    }
  });
});

describe("Word ladders", () => {
  it("reference ladders change one letter per rung through real words", () => {
    for (const l of ladders) {
      const path = l.carroll ?? l.example!;
      expect(path[0]).toBe(l.from);
      expect(path[path.length - 1]).toBe(l.to);
      expect(path.length - 1).toBe(l.par);
      const words = new Set(dictionary[String(l.length)]);
      for (let i = 1; i < path.length; i++) {
        expect(
          [...path[i]].filter((c, k) => c !== path[i - 1][k]),
        ).toHaveLength(1);
        expect(words.has(path[i]), path[i]).toBe(true);
      }
    }
  });

  it("accepts a valid rung, refuses a non-word and finishes Carroll’s HEAD to TAIL", () => {
    render(<WordLadder ladders={ladders} dictionary={dictionary} />);
    expect(screen.getByText("Change HEAD into TAIL")).toBeInTheDocument();
    const add = (w: string) => {
      fireEvent.change(screen.getByLabelText("Next word"), {
        target: { value: w },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    };
    add("hxad");
    expect(
      screen.getByText("HXAD isn’t in this word list."),
    ).toBeInTheDocument();
    for (const w of ["heal", "teal", "tell", "tall", "tail"]) add(w);
    expect(screen.getByText(/Done in 5 steps/)).toBeInTheDocument();
  });
});

describe("Cryptograms", () => {
  it("keys are one-to-one and never map a letter to itself", () => {
    for (const q of QUOTATIONS) {
      const key = cipherKey(q.id);
      expect(new Set(Object.values(key)).size).toBe(26);
      for (const [p, c] of Object.entries(key)) expect(c).not.toBe(p);
    }
    expect(new Set(QUOTATIONS.map((q) => q.id)).size).toBe(QUOTATIONS.length);
  });

  it("revealing every letter solves the quotation and shows its source", () => {
    render(<Cryptogram />);
    for (
      let i = 0;
      i < 26 && screen.queryByRole("button", { name: "Reveal a letter" });
      i++
    )
      fireEvent.click(screen.getByRole("button", { name: "Reveal a letter" }));
    expect(screen.getByText(/Solved\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Jane Austen, Pride and Prejudice/),
    ).toBeInTheDocument();
  });
});
