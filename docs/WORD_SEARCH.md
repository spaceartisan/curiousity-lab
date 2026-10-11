# Word Search

Four fixed, versioned offline boards offer row, column and diagonal words. Select the first and last letters in either direction. Keyboard arrows move between letters; Home/End move within the row, Enter/Space select, and Escape clears the pending selection. Small screens keep scrolling inside the board.

## Assistance and undo

Hints outline an actual first letter and describe its row and column. Undo last word removes the last entry from the ordered found-word list while the puzzle is unfinished. It clears a pending selection and hint outline. Remaining found words keep all their highlights, including shared letters. The returned word can be found again with no limit or penalty. Empty and completed boards disable undo; replay starts a separate fresh attempt on the same board.

Found-word order is necessary progress, already retained by original saves. Undo adds no new action log, timestamps, save schema, puzzle IDs or content revisions. It survives offline reload and works with history disabled. With optional history enabled, a successful undo increments the existing undo count once; disabled controls and clearing a selection do not count. Completed source records remain unchanged.

Another puzzle cycles boards. Back to games retains progress. The shared Pause control remains available. Independent content/ambiguity review and real-device accessibility review remain pending.
