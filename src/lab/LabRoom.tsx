import { takeOpen } from "../activity/open-request";
import { useState, type ReactNode } from "react";
import { BenchUnknowns } from "./BenchUnknowns";
import { Differential } from "./Differential";
import { readLab, writeLab, type LabProgress } from "./lab-progress";

type Room = "bench" | "heme" | "microscope";

export function LabRoom({
  microscope,
  sound,
  atMicroscope = false,
}: {
  microscope: ReactNode;
  sound: boolean;
  /** Open on the microscope when a slide is already in progress. */
  atMicroscope?: boolean;
}) {
  const [gifted] = useState(() => takeOpen("bench"));
  const [room, setRoom] = useState<Room>(
    atMicroscope && !gifted ? "microscope" : "bench",
  );
  const [progress, setProgress] = useState<LabProgress>(readLab);
  const update = (p: LabProgress) => {
    setProgress(p);
    writeLab(p);
  };
  return (
    <div className="music-room lab-room">
      <div className="segmented" role="tablist" aria-label="Laboratory">
        {(
          [
            ["bench", "Microbiology bench"],
            ["heme", "Hematology"],
            ["microscope", "Microscope & notebook"],
          ] as [Room, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={room === id}
            aria-pressed={room === id}
            onClick={() => setRoom(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {room === "bench" && (
        <BenchUnknowns
          progress={progress}
          onProgress={update}
          initialCase={gifted}
        />
      )}
      {room === "heme" && (
        <Differential progress={progress} onProgress={update} sound={sound} />
      )}
      {room === "microscope" && microscope}
    </div>
  );
}
