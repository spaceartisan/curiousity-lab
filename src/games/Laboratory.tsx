import { useState } from "react";
import { specimens } from "../content/specimens";
import type { GameProps } from "./types";
export interface LabData {
  specimen: number;
  stage: "desk" | "microscope" | "observations";
  zoom: number;
  pan: number[];
  observations: string[];
  text: string;
}
export function Laboratory({ draft, update, create, finish }: GameProps) {
  const d = draft.data as LabData;
  const [message, setMessage] = useState("");
  const s = specimens[d.specimen % specimens.length];
  function set(p: Partial<LabData>) {
    update({ ...d, ...p });
  }
  function open(index: number) {
    set({
      specimen: index,
      stage: "microscope",
      zoom: 1,
      pan: [0, 0],
      observations: [],
      text: "",
    });
    setMessage("");
  }
  const pan = (dx: number, dy: number) =>
    set({
      pan: [
        Math.max(-35, Math.min(35, d.pan[0] + dx)),
        Math.max(-35, Math.min(35, d.pan[1] + dy)),
      ],
    });
  return (
    <>
      <p>
        Choose a teaching specimen, look around, and record whatever interests
        you. Every step is optional.
      </p>
      <nav className="tabs" aria-label="Workbench stages">
        <button
          aria-pressed={d.stage === "desk"}
          onClick={() => set({ stage: "desk" })}
        >
          Specimen desk
        </button>
        <button
          aria-pressed={d.stage === "microscope"}
          onClick={() => set({ stage: "microscope" })}
        >
          Microscope
        </button>
        <button
          aria-pressed={d.stage === "observations"}
          onClick={() => set({ stage: "observations" })}
        >
          Observations
        </button>
      </nav>
      {d.stage === "desk" ? (
        <>
          <p className="eyebrow">Microbiology desk · Starter collection</p>
          <div className="specimen-grid">
            {specimens.map((s, i) => (
              <button
                className="specimen-card"
                key={s.id}
                onClick={() => open(i)}
              >
                <img src={import.meta.env.BASE_URL + s.asset} alt="" />
                <strong>{s.title}</strong>
                <span>Explore specimen →</span>
              </button>
            ))}
          </div>
          <div className="subtle-panel">
            <h3>Hematology desk</h3>
            <p>
              A blood-smear collection is planned. Reviewed images will be added
              before this desk opens.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Real microscopy · Fictional teaching specimen
              </p>
              <h2>{s.title}</h2>
            </div>
            <button onClick={() => open((d.specimen + 1) % specimens.length)}>
              Next specimen
            </button>
          </div>
          {d.stage === "microscope" && (
            <>
              <div
                className="microscope"
                tabIndex={0}
                role="region"
                aria-label="Microscope image. Arrow keys move the image; plus and minus adjust digital zoom."
                onKeyDown={(e) => {
                  if (
                    [
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "+",
                      "-",
                    ].includes(e.key)
                  )
                    e.preventDefault();
                  if (e.key === "ArrowLeft") pan(-5, 0);
                  if (e.key === "ArrowRight") pan(5, 0);
                  if (e.key === "ArrowUp") pan(0, -5);
                  if (e.key === "ArrowDown") pan(0, 5);
                  if (e.key === "+") set({ zoom: Math.min(3, d.zoom + 0.25) });
                  if (e.key === "-") set({ zoom: Math.max(1, d.zoom - 0.25) });
                }}
              >
                <img
                  src={import.meta.env.BASE_URL + s.asset}
                  alt={s.description}
                  draggable={false}
                  style={{
                    transform: `translate(${d.pan[0]}%,${d.pan[1]}%) scale(${d.zoom})`,
                  }}
                />
              </div>
              <div className="actions">
                <button
                  aria-label="Zoom out"
                  disabled={d.zoom <= 1}
                  onClick={() => set({ zoom: Math.max(1, d.zoom - 0.25) })}
                >
                  − Zoom
                </button>
                <span>Digital zoom {d.zoom.toFixed(2)}×</span>
                <button
                  aria-label="Zoom in"
                  disabled={d.zoom >= 3}
                  onClick={() => set({ zoom: Math.min(3, d.zoom + 0.25) })}
                >
                  + Zoom
                </button>
                <button onClick={() => set({ zoom: 1, pan: [0, 0] })}>
                  Reset view
                </button>
              </div>
              <div className="actions">
                <button onClick={() => pan(-5, 0)}>Move left</button>
                <button onClick={() => pan(5, 0)}>Move right</button>
                <button onClick={() => pan(0, -5)}>Move up</button>
                <button onClick={() => pan(0, 5)}>Move down</button>
              </div>
              <details>
                <summary>Image description & source</summary>
                <p>{s.description}</p>
                <p className="muted">
                  Digital zoom enlarges this image; it adds no new detail. No
                  calibrated scale is displayed.
                </p>
                <p>{s.credit}</p>
                <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                  CDC source and public-domain record
                </a>
              </details>
              <button
                className="primary"
                onClick={() => set({ stage: "observations" })}
              >
                Record an observation
              </button>
            </>
          )}
          <fieldset>
            <legend>
              What catches your eye? <span className="muted">Optional</span>
            </legend>
            <div className="actions">
              {s.observations.map((o) => (
                <button
                  key={o}
                  aria-pressed={d.observations.includes(o)}
                  onClick={() =>
                    set({
                      observations: d.observations.includes(o)
                        ? d.observations.filter((x) => x !== o)
                        : [...d.observations, o],
                    })
                  }
                >
                  {o}
                </button>
              ))}
            </div>
            <label>
              Your notebook note{" "}
              <textarea
                maxLength={1000}
                rows={3}
                value={d.text}
                onChange={(e) => set({ text: e.target.value })}
                placeholder="Add a thought, or leave this blank."
              />
            </label>
          </fieldset>
          <button
            className="primary"
            onClick={() => {
              create({
                kind: "notebook",
                title: s.title,
                specimenId: s.id,
                observations: d.observations,
                text: d.text,
                zoom: d.zoom,
                pan: d.pan,
              });
              setMessage("Saved to your Lab Notebook in My Creations.");
              finish("explored");
            }}
          >
            Save to Lab Notebook
          </button>
        </>
      )}
      <p role="status">{message}</p>
    </>
  );
}
