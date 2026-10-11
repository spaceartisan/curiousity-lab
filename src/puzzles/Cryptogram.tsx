import { useEffect, useMemo, useRef, useState } from "react";
import { useRecord } from "../activity/recorder";
import { QUOTATIONS, type Quotation } from "../content/quotations";
import { hashString, keep, remember, seeded } from "./util";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A substitution key where no letter stands for itself. */
export function cipherKey(id: string): Record<string, string> {
  const random = seeded(hashString(id));
  for (;;) {
    const letters = ALPHABET.split("");
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    if (letters.every((l, i) => l !== ALPHABET[i]))
      return Object.fromEntries(
        ALPHABET.split("").map((p, i) => [p, letters[i]]),
      );
  }
}

interface Saved {
  index: number;
  guesses: Record<string, Record<string, string>>;
  solved: string[];
}

export function Cryptogram() {
  const [saved, setSaved] = useState<Saved>(() =>
    remember<Saved>("cryptogram:v1", { index: 0, guesses: {}, solved: [] }),
  );
  const quote: Quotation = QUOTATIONS[saved.index % QUOTATIONS.length];
  const key = useMemo(() => cipherKey(quote.id), [quote.id]);
  const plain = quote.text.toUpperCase();
  const cipher = plain.replace(/[A-Z]/g, (c) => key[c]);
  const guesses = saved.guesses[quote.id] ?? {};
  const [active, setActive] = useState<string | null>(null);
  const [showAuthor, setShowAuthor] = useState(false);
  const record = useRecord();
  const usage = useRef({ id: "", start: Date.now(), reveals: 0, filed: false });
  if (usage.current.id !== quote.id) usage.current = { id: quote.id, start: Date.now(), reveals: 0, filed: saved.solved.includes(quote.id) };
  const cipherToPlain = Object.fromEntries(
    Object.entries(key).map(([p, c]) => [c, p]),
  );
  const used = [...new Set(cipher.replace(/[^A-Z]/g, ""))];
  const solved = used.every((c) => guesses[c] === cipherToPlain[c]);
  const wasSolved = useRef(solved);
  useEffect(() => {
    if (solved && !wasSolved.current && !usage.current.filed) {
      usage.current.filed = true;
      record({
        activity: "cryptogram",
        item: quote.id,
        title: `${quote.author}: “${quote.text.slice(0, 60)}${quote.text.length > 60 ? "…" : ""}”`,
        outcome: "solved",
        seconds: (Date.now() - usage.current.start) / 1000,
        detail: { theme: quote.theme, revealed: usage.current.reveals, letters: used.length, authorShown: showAuthor },
      });
    }
    wasSolved.current = solved;
  });
  const counts = Object.fromEntries(
    used.map((c) => [c, cipher.split(c).length - 1]),
  );

  function persist(next: Saved) {
    setSaved(next);
    keep("cryptogram:v1", next);
  }
  function guess(letter: string) {
    if (!active || solved) return;
    const next = { ...guesses };
    for (const [c, g] of Object.entries(next)) if (g === letter) delete next[c];
    if (letter) next[active] = letter;
    else delete next[active];
    const nowSolved = used.every((c) => next[c] === cipherToPlain[c]);
    persist({
      ...saved,
      guesses: { ...saved.guesses, [quote.id]: next },
      solved:
        nowSolved && !saved.solved.includes(quote.id)
          ? [...saved.solved, quote.id]
          : saved.solved,
    });
    const nextBlank = used.find((c) => !next[c] && c !== active);
    if (letter && nextBlank) setActive(nextBlank);
  }

  const words = cipher.split(" ");
  return (
    <div className="crypto">
      <p className="muted">
        Each letter stands for a different one. Choose a letter in the puzzle,
        then the letter you think it hides; it fills in everywhere.
      </p>
      <p className="crypto-theme">
        {quote.theme} ·{" "}
        {showAuthor || solved
          ? `${quote.author}, ${quote.source}`
          : "author hidden"}
      </p>
      <div className="crypto-text" aria-live="polite">
        {words.map((word, w) => (
          <span key={w} className="crypto-word">
            {word.split("").map((ch, i) =>
              /[A-Z]/.test(ch) ? (
                <button
                  key={i}
                  className={[
                    "crypto-cell",
                    active === ch ? "active" : "",
                    guesses[ch] ? "filled" : "",
                  ].join(" ")}
                  onClick={() => setActive(ch)}
                  aria-label={`Cipher ${ch}${guesses[ch] ? `, guessed ${guesses[ch]}` : ""}`}
                >
                  <span className="crypto-guess">{guesses[ch] ?? ""}</span>
                  <span className="crypto-cipher">{ch}</span>
                </button>
              ) : (
                <span key={i} className="crypto-punct">
                  {ch}
                </span>
              ),
            )}
          </span>
        ))}
      </div>
      {!solved && (
        <div className="crypto-keys" role="group" aria-label="Letters">
          {ALPHABET.split("").map((l) => (
            <button
              key={l}
              disabled={!active}
              className={Object.values(guesses).includes(l) ? "used" : ""}
              onClick={() => guess(l)}
            >
              {l}
            </button>
          ))}
          <button disabled={!active} onClick={() => guess("")}>
            Clear
          </button>
        </div>
      )}
      <p className="piy-status" aria-live="polite">
        {solved
          ? `Solved. “${quote.text}” — ${quote.author}`
          : active
            ? `${active} appears ${counts[active]} time${counts[active] === 1 ? "" : "s"}.`
            : "Choose a letter in the puzzle to begin."}
      </p>
      <div className="actions">
        {!solved && (
          <>
            <button
              onClick={() => {
                usage.current.reveals++;
                const target =
                  active && guesses[active] !== cipherToPlain[active]
                    ? active
                    : used.find((c) => guesses[c] !== cipherToPlain[c]);
                if (!target) return;
                setActive(target);
                const next = { ...guesses };
                for (const [c, g] of Object.entries(next))
                  if (g === cipherToPlain[target]) delete next[c];
                next[target] = cipherToPlain[target];
                const nowSolved = used.every(
                  (c) => next[c] === cipherToPlain[c],
                );
                persist({
                  ...saved,
                  guesses: { ...saved.guesses, [quote.id]: next },
                  solved: nowSolved
                    ? [...new Set([...saved.solved, quote.id])]
                    : saved.solved,
                });
              }}
            >
              Reveal a letter
            </button>
            <button
              onClick={() => setShowAuthor(true)}
              disabled={showAuthor}
            >
              Show the author
            </button>
          </>
        )}
        <button
          className={solved ? "primary" : ""}
          onClick={() => {
            setActive(null);
            setShowAuthor(false);
            persist({ ...saved, index: saved.index + 1 });
          }}
        >
          Another quotation
        </button>
      </div>
    </div>
  );
}
