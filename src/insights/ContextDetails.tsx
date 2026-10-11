import type { Session } from "../storage/contracts";
import { activityNames } from "./review";
import { presentationLabel } from "../storage/presentation";
import { timingLabel } from "../storage/timing";
import { clockLabel } from "../storage/clock-context";

export function contextTitle(s: Session) {
  return `${activityNames[s.game]} · ${s.mode}`;
}
export function exposureLabel(s: Session) {
  return s.attempt === 1 ? "First attempt" : "Repeat attempts";
}
export function ContextDetails({ session: s }: { session: Session }) {
  const fields = [
    ["Puzzle", s.puzzleId],
    ["Content version", s.contentVersion],
    ["App version", s.appVersion],
    ["Source", s.source],
    ["Exposure", exposureLabel(s)],
    [
      "Presentation",
      presentationLabel(s.presentation) +
        (s.game === "sudoku" && s.presentation && !s.presentation.sudoku
          ? "; Sudoku square sizes unrecorded"
          : ""),
    ],
    ["Timing", timingLabel(s.timing)],
    ["Clock observations", clockLabel(s.clock)],
  ];
  return (
    <details className="context-details">
      <summary>Context details</summary>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
