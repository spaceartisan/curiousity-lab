# Sudoku content and technique tiers

These are game solving rules, not measures of ability or health. The player chooses the grid and challenge; performance never silently changes either.

| Choice         | Grid sizes | Verified technique ceiling                                                          | Content identity                          |
| -------------- | ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| Relaxed        | 4, 6, 9    | Single-candidate squares; more starting numbers                                     | Existing `starter-1` generator, unchanged |
| Classic        | 4, 6, 9    | Single-candidate squares; more clues removed than Relaxed for the same seed         | Existing `starter-1` generator, unchanged |
| Hidden singles | 9          | Single-candidate squares and hidden singles; at least one hidden single is required | `sudoku-hidden-singles-1`                 |

A single-candidate square has exactly one number remaining after excluding numbers present in its row, column and box. A hidden single is a number with only one possible empty square in a row, column or box even though that square has multiple candidates. The solver repeatedly checks single-candidate squares first, then rows, columns and boxes for hidden singles. Every explanatory hint uses the current board, not an invented reason derived only from the stored solution. Boxes are numbered left-to-right, then top-to-bottom.

The original Relaxed/Classic generators and their seed interpretation are preserved. Frozen seed-23 serialization tests cover all six legacy size/challenge forms, alongside existing multi-seed uniqueness tests. Their distinction still includes clue count within one technique ceiling; it does not imply separate cognitive levels.

The new collection contains three original boards generated from this project's own Latin-grid solutions with source seeds 1, 2 and 3. Clue-removal shuffles use an unsigned 32-bit LCG initialized with `seed * 7919`, multiplier 1664525 and increment 1013904223; Fisher–Yates removal is retained only if the puzzle remains unique and solvable with singles. The boards are frozen in `src/content/sudoku.ts`. Each solves to its stored solution, but exhausts naked singles before completion. No guessing, backtracking placement, pairs, locked candidates or more advanced technique is required for the player. Backtracking is used independently to count solutions up to two.

An unsigned 32-bit player seed chooses one of the three boards modulo three and deterministically permutes symbols, row bands/rows within bands, and column stacks/columns within stacks. These preserve Sudoku rules and the technique ceiling. CI additionally checks 38 varied seeds for uniqueness, deterministic reproduction, logical completion and the necessity of hidden singles. This provides reproducible variations, not a claim of an unlimited independent authored library or matched clinical forms.

Old saved puzzles retain `sudoku-SIZE-SEED` identities. The new tier uses `sudoku-hidden-singles-1-SEED`, with its own content version in archived sessions. Canonical regeneration validates imports; unsupported combinations such as 6×6 Hidden singles are rejected. Choosing a smaller grid from Hidden singles visibly discloses the switch to Classic before the standard replacement confirmation.

“Show a step” explains and selects a square without placing a number. “Hint” places an explained logical step, or truthfully corrects an existing entry that differs from the unique solution. Both are deliberate assistance requests; each increments hints only with activity history enabled. No difficulty or health inference follows. Number placements remove that number from pencil notes in peer squares; undo restores the previous cells and notes together. An explanation creates no undo entry. Erase, notes, explanations and views remain available without collecting activity history.

Replay retains the seed, tier, givens and puzzle identity while creating a separate attempt; new puzzles choose fresh seeds. Completed attempts remain immutable, and replay is unlimited. Row/column selectors and a larger selected-square summary provide an alternative to tiny 9×9 cells. Keyboard focus stays in its row at left/right edges; Home/End select row endpoints and Control+Home/End select board endpoints.

Independent puzzle/usability review and real-device assistive-technology checks remain. Additional advanced solving tiers, preference-based adaptation, fully normalized event context and comparable-task reporting are later work. Automated mathematical verification does not establish human difficulty equivalence.

## Optional larger-square view (v0.17.0)

“Larger Sudoku squares” enlarges the existing grid within a labeled scroll region. Squares are at least 48 CSS pixels in both dimensions; their width uses the game text size so Larger text and 200% root text enlargement increase them. Keyboard arrows/Home/End and row/column selectors reveal the selected square within this region; they do not jump the document back to the board. Manual scrolling remains available. Compact view and the larger selected-square/number-tray controls remain available at any time.

This is a necessary local view preference (`SudokuData.largeCells?`), not a puzzle move. Old saves without it retain compact view. Imports reject non-boolean values. Switching the view changes no givens, seed, solution, entries, notes, undo history, hints, mode or difficulty and creates no attempt. It survives offline reload, a newly chosen grid, another puzzle and same-board replay. Changing the view after completion cannot rewrite the filed session. Undo restores moves while retaining the current display choice.

When optional activity history is enabled, `presentation.sudoku` records a bounded set of `compact`/`large` observations and separate `from-start`/`partial` coverage. Fresh attempts capture the initial displayed choice; legacy or mid-attempt collection starts partial. Missing old context is unrecorded, never inferred from the current view. Filed sessions stay immutable; clear-history removes this optional metadata, including from recovery drafts, while retaining necessary view/progress. JSON/CSV and validated local Insights preparation preserve it. No cloud activity access is enabled.

`local-context-review-5` and `local-session-points-3` use square-size coverage and observations in canonical context grouping. This is a presentation setting, not actual measured viewport size, visual acuity or a difficulty/health score. Actual family-device assistive-technology review remains required.
