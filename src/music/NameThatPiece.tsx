import { useEffect, useMemo, useState } from "react";
import { Score } from "./Score";
import {
  FAMILIES,
  choicesFor,
  melodyOf,
  shuffled,
  type Excerpt,
} from "./repertoire";
import type { MusicRoomProgress } from "./progress";
import type { usePlayer } from "./usePlayer";

type Player = ReturnType<typeof usePlayer>;

export function NameThatPiece({
  pieces,
  progress,
  onProgress,
  player,
  onPlayYourself,
}: {
  pieces: Excerpt[];
  progress: MusicRoomProgress;
  onProgress: (p: MusicRoomProgress) => void;
  player: Player;
  onPlayYourself: (piece: Excerpt) => void;
}) {
  const pool = useMemo(
    () =>
      pieces.filter(
        (p) => progress.family === "all" || p.family === progress.family,
      ),
    [pieces, progress.family],
  );
  const nextId = () => {
    const queue = progress.queue.filter((id) => pool.some((p) => p.id === id));
    return queue[0] ?? shuffled(pool.map((p) => p.id))[0];
  };
  const [pieceId, setPieceId] = useState<string>(nextId);
  const piece = pool.find((p) => p.id === pieceId) ?? pool[0];
  const [choices, setChoices] = useState<Excerpt[]>(() =>
    choicesFor(piece, pool),
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState(0);
  const [slower, setSlower] = useState(false);
  const [melodyOnly, setMelodyOnly] = useState(false);

  // Start a fresh round whenever the collection changes.
  useEffect(() => {
    if (!pool.some((p) => p.id === pieceId)) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  function advance() {
    player.stop();
    const remaining = progress.queue.filter(
      (id) => id !== piece?.id && pool.some((p) => p.id === id),
    );
    const queue = remaining.length
      ? remaining
      : shuffled(pool.map((p) => p.id)).filter((id) => id !== piece?.id);
    const next = pool.find((p) => p.id === queue[0]) ?? pool[0];
    onProgress({ ...progress, queue });
    setPieceId(next.id);
    setChoices(choicesFor(next, pool));
    setPicked(null);
    setRevealed(false);
    setHint(0);
  }

  function listen() {
    if (!piece) return;
    onProgress({
      ...progress,
      heard: {
        ...progress.heard,
        [piece.id]: (progress.heard[piece.id] ?? 0) + 1,
      },
    });
    void player.play(piece, {
      rate: slower ? 0.75 : 1,
      notes: melodyOnly ? melodyOf(piece) : undefined,
      key: "round",
    });
  }

  function choose(choice: Excerpt) {
    if (revealed) return;
    setPicked(choice.id);
    setRevealed(true);
    if (choice.id === piece.id)
      onProgress({
        ...progress,
        named: {
          ...progress.named,
          [piece.id]: (progress.named[piece.id] ?? 0) + 1,
        },
      });
  }

  if (!piece) return <p>No pieces in this collection yet.</p>;
  const right = picked === piece.id;
  const favorite = progress.favorites.includes(piece.id);
  const playing = player.playingId === "round";

  return (
    <div className="ntp">
      <details
        className="ntp-settings"
        open={typeof window !== "undefined" && window.innerWidth > 700}
      >
        <summary>
          {FAMILIES.find((f) => f.id === progress.family)?.label} ·{" "}
          {progress.mode === "ear" ? "by ear" : "from the score"} ·{" "}
          {progress.answer === "choices" ? "four choices" : "name it yourself"}
        </summary>
        <div className="segmented" role="group" aria-label="Collection">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              aria-pressed={progress.family === f.id}
              onClick={() => onProgress({ ...progress, family: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="How to meet the piece"
        >
          <button
            aria-pressed={progress.mode === "ear"}
            onClick={() => onProgress({ ...progress, mode: "ear" })}
          >
            By ear
          </button>
          <button
            aria-pressed={progress.mode === "score"}
            onClick={() => onProgress({ ...progress, mode: "score" })}
          >
            From the score
          </button>
        </div>
        <div className="segmented" role="group" aria-label="Answer style">
          <button
            aria-pressed={progress.answer === "choices"}
            onClick={() => onProgress({ ...progress, answer: "choices" })}
          >
            Four choices
          </button>
          <button
            aria-pressed={progress.answer === "reveal"}
            onClick={() => onProgress({ ...progress, answer: "reveal" })}
          >
            Name it yourself
          </button>
        </div>
      </details>

      <section className="ntp-round" aria-live="polite">
        {!revealed && (
          <>
            <h2>Name this piece</h2>
            {progress.mode === "score" && (
              <Score
                abc={piece.abc}
                tempo={piece.tempo}
                beat={playing ? player.beat : -1}
                label="The opening bars of an unnamed piece"
              />
            )}
            <div className="actions">
              <button
                className="primary big"
                onClick={playing ? player.stop : listen}
              >
                {playing
                  ? "Stop"
                  : progress.mode === "score"
                    ? "Hear it"
                    : "Play the excerpt"}
              </button>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={slower}
                  onChange={(e) => setSlower(e.target.checked)}
                />
                Slower
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={melodyOnly}
                  onChange={(e) => setMelodyOnly(e.target.checked)}
                />
                Tune only
              </label>
            </div>
            {player.ready === "loading" && (
              <p className="muted">Tuning the piano…</p>
            )}
            {hint > 0 && (
              <p className="ntp-hint">
                {hint === 1
                  ? `Era and style: ${piece.family === "hymn" ? "a hymn or carol" : piece.family === "ragtime" ? "ragtime" : "classical"}, ${piece.year}.`
                  : `Composer: ${piece.composer}.`}
              </p>
            )}
            {progress.answer === "choices" ? (
              <div className="ntp-choices">
                {choices.map((c) => (
                  <button key={c.id} onClick={() => choose(c)}>
                    <strong>{c.title}</strong>
                    <small>{c.composer}</small>
                  </button>
                ))}
              </div>
            ) : (
              <button className="big" onClick={() => setRevealed(true)}>
                Reveal the piece
              </button>
            )}
            <div className="actions">
              {hint < 2 && (
                <button
                  className="text-button"
                  onClick={() => setHint(hint + 1)}
                >
                  {hint === 0 ? "A clue, please" : "Another clue"}
                </button>
              )}
              <button className="text-button" onClick={advance}>
                Skip to another piece
              </button>
            </div>
          </>
        )}

        {revealed && (
          <div className="ntp-reveal">
            {picked && (
              <p className={right ? "ntp-verdict right" : "ntp-verdict"}>
                {right ? "Yes — that’s it." : "Not that one this time. It’s:"}
              </p>
            )}
            <h2>{piece.title}</h2>
            <p className="ntp-composer">
              {piece.composer} · {piece.year}
            </p>
            <p className="muted">{piece.work}</p>
            <p>{piece.note}</p>
            <Score
              abc={piece.abc}
              tempo={piece.tempo}
              beat={playing ? player.beat : -1}
              label={`Opening of ${piece.title}`}
            />
            <div className="actions">
              <button
                className="primary"
                onClick={playing ? player.stop : listen}
              >
                {playing ? "Stop" : "Play it again"}
              </button>
              <button onClick={() => onPlayYourself(piece)}>
                Play it yourself
              </button>
              <button
                aria-pressed={favorite}
                onClick={() =>
                  onProgress({
                    ...progress,
                    favorites: favorite
                      ? progress.favorites.filter((id) => id !== piece.id)
                      : [...progress.favorites, piece.id],
                  })
                }
              >
                {favorite ? "★ A favorite" : "☆ Add to favorites"}
              </button>
              <button className="primary" onClick={advance}>
                Next piece →
              </button>
            </div>
            <p className="ntp-source">
              Score from the{" "}
              <a href={piece.source.url} target="_blank" rel="noreferrer">
                {piece.source.name}
              </a>{" "}
              · {piece.source.license}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
