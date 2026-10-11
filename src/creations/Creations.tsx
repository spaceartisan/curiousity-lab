import { useEffect, useMemo, useState } from "react";
import type { Creation } from "../storage/contracts";
import { specimens } from "../content/specimens";
import { Icon } from "../ui/Icon";
import { stopAudio, setAudioVolume } from "../games/audio";
import {
  PAGE_SIZE,
  selectCreations,
  type CollectionFilter,
  type CollectionSort,
} from "./collection";
interface Props {
  creations: Creation[];
  filter: CollectionFilter;
  onFilter: (filter: CollectionFilter) => void;
  onRevisit: (creation: Creation) => void;
  onHear: (creation: Creation) => void;
  onRemove: (creation: Creation) => void;
  onMusic: () => void;
  onLab: () => void;
  relativeTime: (utc: string) => string;
  sound: boolean;
  volume: number;
  onSound: (sound: boolean) => void;
  onVolume: (volume: number) => void;
}
export function Creations(props: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CollectionSort>("recent");
  const [page, setPage] = useState(1);
  const matches = useMemo(
    () => selectCreations(props.creations, props.filter, query, sort),
    [props.creations, props.filter, query, sort],
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [props.filter]);
  useEffect(() => {
    setAudioVolume(props.volume);
    if (!props.sound) stopAudio();
  }, [props.volume, props.sound]);
  useEffect(() => () => stopAudio(), []);
  return (
    <section className="collections" aria-label="Saved creations">
      <nav className="tabs" aria-label="Creation type">
        {(
          [
            ["all", "All creations"],
            ["notebook", "Lab Notebook"],
            ["melody", "Melodies"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={props.filter === value}
            onClick={() => {
              stopAudio();
              props.onFilter(value);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="collection-tools">
        <label>
          Find a saved creation
          <input
            type="search"
            maxLength={100}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name, observation, or notebook words"
          />
        </label>
        <label>
          Order by
          <select
            aria-label="Order by"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as CollectionSort);
              setPage(1);
            }}
          >
            <option value="recent">Recently saved</option>
            <option value="earlier">Earlier saved</option>
          </select>
        </label>
        <button
          disabled={!query}
          onClick={() => {
            setQuery("");
            setPage(1);
          }}
        >
          Clear search
        </button>
      </div>
      {props.filter !== "notebook" &&
        props.creations.some((c) => c.kind === "melody") && (
          <fieldset className="collection-sound">
            <legend>Melody playback</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={props.sound}
                onChange={(e) => props.onSound(e.target.checked)}
              />
              Sound
            </label>
            <label>
              Music volume
              <input
                aria-label="Music volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={props.volume}
                onChange={(e) => props.onVolume(Number(e.target.value))}
              />
            </label>
            <button onClick={stopAudio}>Stop playback</button>
          </fieldset>
        )}
      <p role="status">
        {matches.length} {matches.length === 1 ? "creation" : "creations"}
        {query ? " matching your search" : " in this view"}.
      </p>
      {!matches.length ? (
        <div className="empty-family">
          <Icon name="creations" />
          <h2>
            {query
              ? "No matching creations"
              : props.filter === "notebook"
                ? "Your notebook is ready"
                : props.filter === "melody"
                  ? "A place for your melodies"
                  : "A place for your discoveries"}
          </h2>
          <p>
            {query
              ? "Try a different word, clear the search, or choose another collection."
              : "Save a melody or a lab notebook entry, and find it here whenever you like."}
          </p>
          {!query && (
            <div className="actions">
              <button onClick={props.onMusic}>Open Music Studio</button>
              <button onClick={props.onLab}>Open My Laboratory</button>
            </div>
          )}
        </div>
      ) : (
        <div className="creation-grid">
          {visible.map((c) => {
            const asset = specimens.find((s) => s.id === c.specimenId);
            return (
              <article className="creation" aria-label={c.title} key={c.id}>
                <Icon name={c.kind === "melody" ? "music" : "lab"} />
                <p className="eyebrow">
                  {c.kind === "melody" ? "Melody" : "Lab Notebook"}
                </p>
                <h2>{c.title}</h2>
                <p className="muted">Saved {props.relativeTime(c.savedAt)}</p>
                {c.lastViewedAt && c.kind === "notebook" && (
                  <p className="muted">
                    Last reopened {props.relativeTime(c.lastViewedAt)}
                  </p>
                )}
                {c.kind === "melody" ? (
                  <>
                    <p className="muted">{c.notes?.length ?? 0} saved notes</p>
                    <button onClick={() => props.onHear(c)}>
                      Hear it again
                    </button>
                  </>
                ) : (
                  <>
                    {asset ? (
                      <>
                        <img
                          className="notebook-preview"
                          src={import.meta.env.BASE_URL + asset.asset}
                          alt={asset.description}
                          loading="lazy"
                        />
                        <details>
                          <summary>Image source</summary>
                          <p>{asset.credit}</p>
                          <a
                            href={asset.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            CDC source and public-domain record
                          </a>
                        </details>
                      </>
                    ) : (
                      <p className="muted">
                        This image is not in the current collection. Your saved
                        note is kept.
                      </p>
                    )}
                    <p>{c.observations?.join(" · ")}</p>
                    {!!c.views?.length && (
                      <p>
                        {c.views.length} saved microscope{" "}
                        {c.views.length === 1 ? "view" : "views"}:{" "}
                        {c.views.map((v) => v.name).join(" · ")}
                      </p>
                    )}
                    <p className="notebook-text">
                      {c.text || "No notebook note added."}
                    </p>
                    {asset && (
                      <button onClick={() => props.onRevisit(c)}>
                        Revisit specimen
                      </button>
                    )}
                  </>
                )}
                <button
                  className="text-button"
                  onClick={() => props.onRemove(c)}
                >
                  Remove
                </button>
              </article>
            );
          })}
        </div>
      )}
      {pages > 1 && (
        <nav
          className="actions collection-pages"
          aria-label="Saved creation pages"
        >
          <button
            disabled={current <= 1}
            onClick={() => {
              stopAudio();
              setPage(current - 1);
            }}
          >
            Previous page
          </button>
          <span>
            Page {current} of {pages}
          </span>
          <button
            disabled={current >= pages}
            onClick={() => {
              stopAudio();
              setPage(current + 1);
            }}
          >
            Next page
          </button>
        </nav>
      )}
    </section>
  );
}
