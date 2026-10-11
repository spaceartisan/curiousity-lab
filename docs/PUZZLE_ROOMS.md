# Numbers and Words

The Numbers and Words cards on the home screen each open a room of puzzles. The room remembers the last tab used on this device.

## Numbers

- **Sudoku:** the existing game, unchanged.
- **Killer Sudoku:** 34 puzzles in three tiers (Gentle, Classic, Challenging).
  - There are no given digits. Dashed cages show sums, and digits don't repeat within a cage.
  - Every puzzle was generated from a solved grid and checked by a solver to have exactly one solution (`scripts/puzzles/killer.py`).
  - Tools: pencil notes, undo, _Check entries_, _Fill this square_, and an optional cage-combination list that crosses out combinations ruled out by digits already placed.
- **Countdown:** 150 rounds in the style of the British television numbers game.
  - Six numbers (from 25, 50, 75, 100 and two each of 1–10) and a target from 101 to 999. Each step uses + − × ÷ and must give a whole, positive number.
  - Every round has a verified solution, available on request (`scripts/puzzles/countdown.py`).
  - The 30-second clock is optional and off by default.

## Words

- **Cryptogram:** 50 public-domain quotations from novels, poetry, the King James Bible, science and speeches.
  - Each has its own substitution cipher in which no letter stands for itself.
  - Choose a cipher letter, then a plain letter, and it fills in everywhere.
  - Helps: reveal a letter, show the author, and a count of how often the chosen letter appears.
  - The author and source appear when it's solved.
- **Letter Hive:** 60 seven-letter hives. Words of four or more letters must use the center letter, and every hive has a pangram.
  - Expected answers are common words (SCOWL size 35 and below). Less common real words (up to size 50) are accepted as bonus words.
  - There are no plurals, because no hive includes S.
- **Word Ladder:** change one letter at a time through real words.
  - It opens with four of Lewis Carroll's own _Doublets_ (1879), with his published answers: HEAD→TAIL, PIG→STY, APE→MAN, FOUR→FIVE.
  - Then come 40 generated ladders whose endpoints are everyday words. The shortest length is computed and an example ladder is offered.
- **Connections:** the existing Classic, Challenging and medical Latin/Greek boards.

Word Search is still reached from the home screen.

## Sources and regeneration

```sh
python3 scripts/puzzles/killer.py src/content/killer.json        # slow: uniqueness is proven by search
python3 scripts/puzzles/countdown.py src/content/countdown.json 150
python3 scripts/puzzles/words.py <node_modules/wordlist-english> src/content
```

Word lists: SCOWL (Spell Checker Oriented Word Lists) by Kevin Atkinson, via the `wordlist-english` package. Its copyright notice permits use and redistribution. A short blocklist removes offensive words.

## Not done yet

- Progress in these new puzzles is stored only in this browser. It is not in the JSON backup or activity history.
