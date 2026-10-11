import { useState } from "react";
import { MicroscopeViewport } from "./MicroscopeViewport";
import { specimens } from "../content/specimens";
import type { LabView } from "../content/lab-views";
import {
  labWorkflows,
  labMode,
  selectLabSlide,
  type LabData,
  type LabStage,
  type LabExperience,
} from "../content/laboratory";
import type { GameProps } from "./types";
export type { LabData } from "../content/laboratory";
function ImageSource({ index }: { index: number }) {
  const s = specimens[index];
  return (
    <details>
      <summary>Image description & source</summary>
      <p>{s.description}</p>
      <p className="muted">
        Digital zoom enlarges this image; it adds no new detail. No calibrated
        scale is displayed.
      </p>
      <p>{s.credit}</p>
      <p className="muted">{s.scientificReviewStatus}</p>
      <a href={s.sourceUrl} target="_blank" rel="noreferrer">
        CDC source and public-domain record
      </a>
    </details>
  );
}
export function Laboratory({
  draft,
  update,
  create,
  finish,
  repeat,
  onNotebook,
  lastNotebookVisit,
}: GameProps & { onNotebook?: () => void; lastNotebookVisit?: string }) {
  const d = draft.data as LabData;
  const [message, setMessage] = useState("");
  const [viewName, setViewName] = useState("");
  const [removedView, setRemovedView] = useState<{
    view: LabView;
    index: number;
  } | null>(null);
  const s = specimens[d.specimen];
  const workflow = labWorkflows[d.specimen];
  const other = (d.specimen + 1) % specimens.length;
  const [comparison, setComparison] = useState<number | null>(null);
  const compared =
    comparison !== null && comparison !== d.specimen ? comparison : other;
  function set(p: Partial<LabData>, view = false) {
    update({ ...d, ...p }, { view });
  }
  function stage(value: LabStage) {
    set({ stage: value }, true);
    setMessage("");
  }
  function open(
    index: number,
    experience: LabExperience = d.experience ?? "workbench",
    target: LabStage = "microscope",
  ) {
    const data = selectLabSlide(d, index, experience, target);
    update(data, {
      mode: labMode(data),
      view: index === d.specimen && labMode(data) === draft.mode,
    });
    setMessage("");
  }
  const pan = (dx: number, dy: number) =>
    set(
      {
        pan: [
          Math.max(-35, Math.min(35, d.pan[0] + dx)),
          Math.max(-35, Math.min(35, d.pan[1] + dy)),
        ],
      },
      true,
    );
  function save() {
    if (draft.finalized) return;
    create({
      kind: "notebook",
      title: s.title,
      specimenId: s.id,
      observations: d.observations,
      text: d.text,
      zoom: d.zoom,
      pan: d.pan,
      ...(d.views !== undefined
        ? { views: d.views.map((v) => ({ ...v, pan: [...v.pan] })) }
        : {}),
      ...(d.workflowRevision === 1
        ? {
            labExperience: d.experience ?? "workbench",
            labWorkflowVersion: 1,
            labDomain: "microbiology" as const,
          }
        : {}),
    });
    setMessage("Saved to your Lab Notebook in My Creations.");
    finish("explored");
  }
  return (
    <div className="lab-workspace">
      {onNotebook && <button onClick={onNotebook}>Open Lab Notebook</button>}
      {lastNotebookVisit && (
        <p className="muted">
          You reopened a notebook page for this slide {lastNotebookVisit}.
        </p>
      )}
      <p>
        Choose a teaching specimen, look around, and record whatever interests
        you. Every step is optional.
      </p>
      <nav className="tabs" aria-label="Workbench stages">
        <button aria-pressed={d.stage === "desk"} onClick={() => stage("desk")}>
          Specimen desk
        </button>
        <button
          aria-pressed={d.stage === "case"}
          onClick={() => open(d.specimen, "workbench", "case")}
        >
          Specimen card
        </button>
        <button
          aria-pressed={d.stage === "microscope"}
          onClick={() => stage("microscope")}
        >
          Microscope
        </button>
        <button
          aria-pressed={d.stage === "observations"}
          onClick={() => stage("observations")}
        >
          Observations
        </button>
        <button
          aria-pressed={d.stage === "compare"}
          onClick={() => stage("compare")}
        >
          Compare views
        </button>
      </nav>
      {d.stage === "desk" ? (
        <>
          <div className="lab-shortcuts subtle-panel">
            <div>
              <h2>Your workbench</h2>
              <p>Follow a specimen card, or go straight to a familiar image.</p>
            </div>
            <div className="actions">
              <button
                className="primary"
                onClick={() => open(d.specimen, "explorer")}
              >
                Explore Microscope
              </button>
              <button onClick={() => open(d.specimen, "workbench", "case")}>
                Start a Lab Session
              </button>
            </div>
          </div>
          <p className="eyebrow">
            Microbiology desk · {specimens.length} slides
          </p>
          <div className="specimen-grid">
            {specimens.map((asset, i) => (
              <article className="lab-slide-card" key={asset.id}>
                <button
                  className="specimen-card"
                  onClick={() => open(i, "explorer")}
                >
                  <img src={import.meta.env.BASE_URL + asset.asset} alt="" />
                  <strong>{asset.title}</strong>
                  <span>Explore specimen →</span>
                </button>
                <button onClick={() => open(i, "workbench", "case")}>
                  Open specimen card: {labWorkflows[i].title}
                </button>
              </article>
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
                Real microscopy ·{" "}
                {d.experience === "explorer"
                  ? "Free exploration"
                  : "Fictional teaching specimen"}
              </p>
              <h2>{s.title}</h2>
            </div>
            <button onClick={() => open(other)}>Next specimen</button>
          </div>
          {d.stage === "case" && (
            <section
              className="lab-case subtle-panel"
              aria-label="Fictional specimen card"
            >
              <p className="eyebrow">
                Fictional specimen card · All steps optional
              </p>
              <h3>{workflow.title}</h3>
              <p>{workflow.fictionalCaseStatement}</p>
              <p className="muted">
                This story is imagined. The CDC image is a separate teaching
                example, not an image of this fictional specimen.
              </p>
              <p>{workflow.prompt}</p>
              <div className="actions">
                <button className="primary" onClick={() => stage("microscope")}>
                  Examine prepared view
                </button>
                <button onClick={() => stage("observations")}>
                  Skip to observations
                </button>
                <button onClick={() => stage("desk")}>
                  Choose another specimen
                </button>
              </div>
            </section>
          )}
          {d.stage === "microscope" && (
            <>
              <MicroscopeViewport
                key={s.id}
                src={import.meta.env.BASE_URL + s.asset}
                description={s.description}
                view={{ zoom: d.zoom, pan: d.pan }}
                onView={(value) => set(value, true)}
              />
              <div className="actions">
                <button
                  aria-label="Zoom out"
                  disabled={d.zoom <= 1}
                  onClick={() =>
                    set({ zoom: Math.max(1, d.zoom - 0.25) }, true)
                  }
                >
                  − Zoom
                </button>
                <span>Digital zoom {d.zoom.toFixed(2)}×</span>
                <button
                  aria-label="Zoom in"
                  disabled={d.zoom >= 3}
                  onClick={() =>
                    set({ zoom: Math.min(3, d.zoom + 0.25) }, true)
                  }
                >
                  + Zoom
                </button>
                <button onClick={() => set({ zoom: 1, pan: [0, 0] }, true)}>
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
                <summary>Microscope controls</summary>
                <p>
                  Drag the image to pan, or pinch with two fingers for digital
                  zoom. The buttons below the image offer the same controls.
                  With the image focused, use arrow keys to move and plus/minus
                  to zoom. Escape cancels an unfinished gesture. Scroll outside
                  the image to move the page.
                </p>
              </details>
              <details>
                <summary>
                  Saved microscope views
                  {d.views?.length ? ` (${d.views.length})` : ""}
                </summary>
                <p>
                  Save digital view settings for this slide. Digital zoom adds
                  no detail; framing can vary with screen shape. These are view
                  presets, not calibrated magnifications or specimen
                  measurements.
                </p>
                <label>
                  View name{" "}
                  <input
                    maxLength={80}
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                  />
                </label>
                <div className="actions">
                  <button
                    disabled={!viewName.trim() || (d.views?.length ?? 0) >= 6}
                    onClick={() => {
                      const view = {
                        id: crypto.randomUUID(),
                        name: viewName.trim(),
                        zoom: d.zoom,
                        pan: [...d.pan],
                      };
                      set({ views: [...(d.views ?? []), view] }, true);
                      setViewName("");
                      setRemovedView(null);
                      setMessage("Microscope view saved for this slide.");
                    }}
                  >
                    Save current view
                  </button>
                  {removedView && (
                    <button
                      onClick={() => {
                        const views = [...(d.views ?? [])];
                        views.splice(removedView.index, 0, removedView.view);
                        set({ views }, true);
                        setRemovedView(null);
                        setMessage("Saved view restored.");
                      }}
                    >
                      Undo view removal
                    </button>
                  )}
                </div>
                {(d.views?.length ?? 0) >= 6 && (
                  <p>
                    Six views saved for this slide. Remove a view to save
                    another.
                  </p>
                )}
                <ol className="lab-saved-views">
                  {(d.views ?? []).map((view, i) => (
                    <li key={view.id}>
                      <strong>{view.name}</strong>
                      <span>Digital zoom {view.zoom.toFixed(2)}×</span>
                      <div className="actions">
                        <button
                          aria-label={`Open saved view ${i + 1}: ${view.name}`}
                          onClick={() => {
                            set({ zoom: view.zoom, pan: [...view.pan] }, true);
                            setMessage(`Opened saved view: ${view.name}.`);
                          }}
                        >
                          Open view
                        </button>
                        <button
                          aria-label={`Remove saved view ${i + 1}: ${view.name}`}
                          onClick={() => {
                            setRemovedView({ view, index: i });
                            set(
                              {
                                views: d.views!.filter((v) => v.id !== view.id),
                              },
                              true,
                            );
                            setMessage("Saved view removed.");
                          }}
                        >
                          Remove view
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
              <ImageSource index={d.specimen} />
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => stage("observations")}
                >
                  Record an observation
                </button>
                <button onClick={() => stage("compare")}>
                  Compare with another image
                </button>
              </div>
            </>
          )}
          {d.stage === "compare" && (
            <section aria-label="Optional image comparison">
              <p>
                Two separate source images, shown at their full view. They are
                not fields from the same specimen or the same magnification.
                Compare whatever interests you; there is no required answer.
              </p>
              <label>
                Comparison image{" "}
                <select
                  value={compared}
                  onChange={(e) => setComparison(Number(e.target.value))}
                >
                  {specimens.map(
                    (asset, index) =>
                      index !== d.specimen && (
                        <option key={asset.id} value={index}>
                          {asset.title}
                        </option>
                      ),
                  )}
                </select>
              </label>
              <div className="lab-comparison">
                {[d.specimen, compared].map((index) => (
                  <article key={specimens[index].id}>
                    <h3>
                      {specimens[index].title}
                      {index === d.specimen
                        ? " · Your current slide"
                        : " · Another image"}
                    </h3>
                    <img
                      src={import.meta.env.BASE_URL + specimens[index].asset}
                      alt={specimens[index].description}
                    />
                    <ImageSource index={index} />
                  </article>
                ))}
              </div>
              <div className="actions">
                <button onClick={() => stage("microscope")}>
                  Back to microscope
                </button>
                <button onClick={() => stage("observations")}>
                  Skip comparison
                </button>
              </div>
            </section>
          )}
          {(d.stage === "microscope" || d.stage === "observations") && (
            <fieldset>
              <legend>
                What catches your eye? <span className="muted">Optional</span>
              </legend>
              <div className="actions">
                {[...s.observations, "Not sure"].map((o) => (
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
          )}
          <div className="actions">
            <button
              className="primary"
              disabled={!!draft.finalized}
              onClick={save}
            >
              Save to Lab Notebook
            </button>
            {draft.finalized && repeat && (
              <button onClick={repeat}>Explore this slide again</button>
            )}
            {d.stage !== "microscope" && (
              <button onClick={() => stage("microscope")}>
                Jump to microscope
              </button>
            )}
            <button onClick={() => stage("desk")}>Back to specimen desk</button>
          </div>
          {draft.finalized && (
            <p className="muted">
              This exploration is finished. You can keep looking, change a note,
              or explore again.
            </p>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
