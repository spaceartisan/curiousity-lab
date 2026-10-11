// Reproduce the original frozen collection. Prints JSON; does not modify game content.
import {
  generateSudoku,
  solutionCount,
  solveAdvanced,
  solveLogically,
} from "../src/games/sudoku-engine.ts";
const boards = [];
for (let seed = 1; seed <= 80 && boards.length < 3; seed++) {
  let randomState = Math.imul(seed, 104729) >>> 0;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const solution = generateSudoku(9, seed).solution;
  const givens = [...solution];
  const indices = Array.from({ length: 81 }, (_, i) => i);
  for (let i = 80; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (const index of indices) {
    const keep = givens[index];
    givens[index] = 0;
    if (solutionCount(givens, 9) !== 1 || !solveAdvanced(givens, 9).solved)
      givens[index] = keep;
  }

  const singles = solveLogically(givens, 9).solved;
  const lockedOnly = solveAdvanced(givens, 9, false).solved;

  if (!singles && !lockedOnly) {
    boards.push({
      id: `challenging-${boards.length + 1}`,
      generationSeed: seed,
      givens,
      solution,
    });
  }
}
if (boards.length !== 3) throw Error("Insufficient verified boards");

console.log(JSON.stringify(boards, null, 2));
