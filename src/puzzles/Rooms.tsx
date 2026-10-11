import { useEffect, useState, type ReactNode } from "react";
import { Countdown, type CountdownRound } from "./Countdown";
import { Cryptogram } from "./Cryptogram";
import { KillerSudoku, type KillerPuzzle } from "./KillerSudoku";
import { LetterHive, type Hive } from "./LetterHive";
import { WordLadder, type Ladder } from "./WordLadder";
import { keep, remember } from "./util";

function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: [T, string][];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {tabs.map(([id, text]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function useData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    load().then((d) => live && setData(d));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return data;
}

type NumbersTab = "sudoku" | "killer" | "countdown";
export function NumbersRoom({ sudoku }: { sudoku: ReactNode }) {
  const [tab, setTab] = useState<NumbersTab>(
    () => remember("numbers-room", { tab: "sudoku" as NumbersTab }).tab,
  );
  const killer = useData(() =>
    import("../content/killer.json").then(
      (m) => m.default as unknown as KillerPuzzle[],
    ),
  );
  const rounds = useData(() =>
    import("../content/countdown.json").then(
      (m) => m.default as unknown as CountdownRound[],
    ),
  );
  const change = (t: NumbersTab) => {
    setTab(t);
    keep("numbers-room", { tab: t });
  };
  return (
    <div className="music-room">
      <Tabs
        label="Numbers"
        value={tab}
        onChange={change}
        tabs={[
          ["sudoku", "Sudoku"],
          ["killer", "Killer Sudoku"],
          ["countdown", "Countdown"],
        ]}
      />
      {tab === "sudoku" && sudoku}
      {tab === "killer" &&
        (killer ? (
          <KillerSudoku puzzles={killer} />
        ) : (
          <p className="muted">Opening…</p>
        ))}
      {tab === "countdown" &&
        (rounds ? (
          <Countdown rounds={rounds} />
        ) : (
          <p className="muted">Opening…</p>
        ))}
    </div>
  );
}

type WordsTab = "cryptogram" | "hive" | "ladder" | "connections";
export function WordsRoom({ connections }: { connections: ReactNode }) {
  const [tab, setTab] = useState<WordsTab>(
    () => remember("words-room", { tab: "cryptogram" as WordsTab }).tab,
  );
  const hives = useData(() =>
    import("../content/hives.json").then(
      (m) => (m.default as unknown as { hives: Hive[] }).hives,
    ),
  );
  const ladders = useData(() =>
    import("../content/ladders.json").then(
      (m) =>
        m.default as unknown as {
          ladders: Ladder[];
          dictionary: Record<string, string[]>;
        },
    ),
  );
  const change = (t: WordsTab) => {
    setTab(t);
    keep("words-room", { tab: t });
  };
  return (
    <div className="music-room">
      <Tabs
        label="Words"
        value={tab}
        onChange={change}
        tabs={[
          ["cryptogram", "Cryptogram"],
          ["hive", "Letter Hive"],
          ["ladder", "Word Ladder"],
          ["connections", "Connections"],
        ]}
      />
      {tab === "cryptogram" && <Cryptogram />}
      {tab === "hive" &&
        (hives ? (
          <LetterHive hives={hives} />
        ) : (
          <p className="muted">Opening…</p>
        ))}
      {tab === "ladder" &&
        (ladders ? (
          <WordLadder
            ladders={ladders.ladders}
            dictionary={ladders.dictionary}
          />
        ) : (
          <p className="muted">Opening…</p>
        ))}
      {tab === "connections" && connections}
    </div>
  );
}
