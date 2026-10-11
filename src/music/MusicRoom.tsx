import { takeOpen } from "../activity/open-request";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { strike, unlockPiano } from "../games/piano";
import { Keyboard } from "./Keyboard";
import { NameThatPiece } from "./NameThatPiece";
import { PlayItYourself } from "./PlayItYourself";
import {
  readProgress,
  writeProgress,
  type MusicRoomProgress,
} from "./progress";
import { loadRepertoire, type Excerpt } from "./repertoire";
import { usePlayer } from "./usePlayer";

type Room = "name" | "play" | "piano" | "exercises";

export function MusicRoom({
  sound,
  volume,
  onSoundChange,
  onVolumeChange,
  exercises,
}: {
  sound: boolean;
  volume: number;
  onSoundChange: (on: boolean) => void;
  onVolumeChange: (v: number) => void;
  /** The earlier Music Studio exercises, kept available. */
  exercises: ReactNode;
}) {
  // A gift from the family can ask to open a particular piece.
  const [gifted] = useState(() => takeOpen("piece"));
  const [room, setRoom] = useState<Room>(gifted ? "play" : "name");
  const [pieces, setPieces] = useState<Excerpt[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<MusicRoomProgress>(readProgress);
  const [practice, setPractice] = useState<Excerpt | null>(null);
  const player = usePlayer(volume, sound);

  useEffect(() => {
    loadRepertoire().then(
      (list) => {
        setPieces(list);
        if (gifted) setPractice(list.find((p) => p.id === gifted) ?? null);
      },
      () => setFailed(true),
    );
  }, []);
  const update = (p: MusicRoomProgress) => {
    setProgress(p);
    writeProgress(p);
  };
  const go = (r: Room) => {
    player.stop();
    setRoom(r);
  };

  return (
    <div className="music-room">
      <div className="music-room-bar">
        <div className="segmented" role="tablist" aria-label="Music room">
          {(
            [
              ["name", "Name that piece"],
              ["play", "Play it yourself"],
              ["piano", "Piano"],
              ["exercises", "Earlier exercises"],
            ] as [Room, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={room === id}
              aria-pressed={room === id}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {room !== "exercises" && (
          <div className="music-volume">
            <label className="check-label">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => onSoundChange(e.target.checked)}
              />
              Sound
            </label>
            <label>
              Volume{" "}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
              />
            </label>
          </div>
        )}
      </div>
      {!sound && room !== "exercises" && (
        <p className="notice">
          Sound is off.{" "}
          <button className="text-button" onClick={() => onSoundChange(true)}>
            Turn sound on
          </button>
        </p>
      )}
      {failed && (
        <p className="notice">The music library could not be opened.</p>
      )}
      {!pieces && !failed && room !== "exercises" && room !== "piano" && (
        <p className="muted">Opening the music library…</p>
      )}
      {pieces && room === "name" && (
        <NameThatPiece
          pieces={pieces}
          progress={progress}
          onProgress={update}
          player={player}
          onPlayYourself={(p) => {
            setPractice(p);
            go("play");
          }}
        />
      )}
      {pieces && room === "play" && (
        <PlayItYourself
          key={(practice ?? pieces[0]).id}
          piece={practice ?? pieces[0]}
          pieces={pieces}
          onPiece={setPractice}
          player={player}
        />
      )}
      {room === "piano" && <FreePiano />}
      {room === "exercises" && exercises}
      {room !== "exercises" && (
        <p className="ntp-source">
          Piano sound: Salamander Grand Piano by Alexander Holm (CC BY 3.0).
          Scores: Mutopia Project and Open Hymnal Project, public domain.
        </p>
      )}
    </div>
  );
}

function FreePiano() {
  const [low, setLow] = useState(48);
  const [sustain, setSustain] = useState(false);
  const [pressed, setPressed] = useState<{ midi: number; right: boolean }>();
  const timer = useRef(0);
  return (
    <div className="free-piano">
      <h2>Piano</h2>
      <p className="muted">
        A grand piano, three octaves at a time. Slide sideways on a small
        screen.
      </p>
      <div className="actions">
        <button
          onClick={() => setLow(Math.max(21, low - 12))}
          disabled={low <= 24}
        >
          ← Lower octave
        </button>
        <button
          onClick={() => setLow(Math.min(72, low + 12))}
          disabled={low >= 72}
        >
          Higher octave →
        </button>
        <label className="check-label">
          <input
            type="checkbox"
            checked={sustain}
            onChange={(e) => setSustain(e.target.checked)}
          />
          Sustain pedal
        </label>
      </div>
      <Keyboard
        low={low}
        high={low + 36}
        labels="c-only"
        pressed={pressed}
        onPress={async (m) => {
          const context = await unlockPiano();
          strike(m, context.currentTime, sustain ? 4 : 0.9, 84);
          setPressed({ midi: m, right: false });
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setPressed(undefined), 250);
        }}
      />
    </div>
  );
}
