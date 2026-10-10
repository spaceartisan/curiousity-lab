import { useEffect, useRef, useState } from "react";
import type { LocalState, Role } from "./contracts";
import { download, sessionsCsv } from "./local";
import {
  recoveryCopies,
  parseBackup,
  replaceWithRecovery,
  saveCounts,
  type RecoveryCopy,
} from "./recovery";

export function RecoveryPanel({
  role,
  state,
  onRestore,
  onRestoreBusy,
}: {
  role: Role;
  state: LocalState;
  onRestore: (next: LocalState) => void;
  onRestoreBusy?: (busy: boolean) => void;
}) {
  const [candidate, setCandidate] = useState<LocalState | null>(null);
  const [source, setSource] = useState("");
  const [copies, setCopies] = useState<RecoveryCopy[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const revision = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setCandidate(null);
    setCopies([]);
    setBusy(false);
    recoveryCopies(role)
      .then((value) => {
        if (active) setCopies(value);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Recovery copies could not be opened. Your current save remains available.",
          );
      });
    return () => {
      active = false;
      revision.current++;
    };
  }, [role, state]);
  async function select(file: File) {
    const request = ++revision.current;
    setCandidate(null);
    setBusy(true);
    setMessage("");
    try {
      const next = await parseBackup(file, role);
      if (alive.current && request === revision.current) {
        setCandidate(next);
        setSource(file.name);
      }
    } catch {
      if (alive.current && request === revision.current)
        setMessage(
          "This file is not a supported backup for this app. Your existing data is unchanged.",
        );
    } finally {
      if (alive.current && request === revision.current) setBusy(false);
    }
  }
  async function restore() {
    if (!candidate) return;
    onRestoreBusy?.(true);
    setBusy(true);
    setMessage("");
    try {
      await replaceWithRecovery(candidate, state);
      onRestore(candidate);
      if (alive.current) {
        setCandidate(null);
        setMessage(
          "Backup restored on this device. Your previous save is kept below. Nothing was uploaded.",
        );
        setCopies(await recoveryCopies(role));
      }
    } catch {
      if (alive.current)
        setMessage(
          "Restore could not finish. Your previous save and any recovery copy remain available. Please try again.",
        );
    } finally {
      onRestoreBusy?.(false);
      if (alive.current) setBusy(false);
    }
  }
  const current = saveCounts(state),
    incoming = candidate ? saveCounts(candidate) : null;
  return (
    <section className="recovery-panel" aria-label="Backup and recovery">
      <h2>Backup & recovery</h2>
      <p>
        Download a backup to keep progress, creations, and recorded activity
        outside this browser. Sharing choices and prepared copies are not
        included.
      </p>
      <div className="actions">
        <button
          onClick={() => download(state, `curiosity-lab-${role}-backup.json`)}
        >
          Download JSON backup
        </button>
        <button
          onClick={() =>
            download(
              sessionsCsv(state),
              `curiosity-lab-${role}-sessions.csv`,
              "text/csv",
            )
          }
        >
          Download session CSV
        </button>
      </div>
      <label className="file-control">
        Restore this app’s JSON backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void select(file);
            event.target.value = "";
          }}
        />
      </label>
      {candidate && incoming && (
        <div
          className="restore-preview"
          role="region"
          aria-label="Restore preview"
        >
          <h3>Review before restoring</h3>
          <p>{source}</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Saved item</th>
                <th scope="col">On this device</th>
                <th scope="col">In this backup</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Activities in progress</th>
                <td>{current.progress}</td>
                <td>{incoming.progress}</td>
              </tr>
              <tr>
                <th scope="row">Creations</th>
                <td>{current.creations}</td>
                <td>{incoming.creations}</td>
              </tr>
              <tr>
                <th scope="row">Recorded activities</th>
                <td>{current.activities}</td>
                <td>{incoming.activities}</td>
              </tr>
            </tbody>
          </table>
          <p>
            This replaces this app’s local save. A recovery copy of your current
            save is kept first. Nothing is merged into your family or uploaded.
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => void restore()}
            >
              Restore this backup
            </button>
            <button
              disabled={busy}
              onClick={() => {
                revision.current++;
                setCandidate(null);
              }}
            >
              Cancel restore
            </button>
          </div>
        </div>
      )}
      <details className="recovery-copies">
        <summary>Previous saves before restoring ({copies.length})</summary>
        <p>
          The last three saves replaced by a restore stay here for undo. These
          copies are on this device only and cannot recover a lost phone or
          cleared browser.
        </p>
        {copies.length === 0 && <p>No restores yet.</p>}
        {copies.map((copy, index) => (
          <div className="recovery-copy" key={`${copy.savedAt}-${index}`}>
            <p>
              {new Date(copy.savedAt).toLocaleString()} ·{" "}
              {copy.state.creations.length} creations ·{" "}
              {copy.state.sessions.length} recorded activities
            </p>
            <button
              disabled={busy}
              onClick={() => {
                revision.current++;
                setCandidate(copy.state);
                setSource("Previous local save");
                setMessage("");
              }}
            >
              Review previous save {index + 1}
            </button>
          </div>
        ))}
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
