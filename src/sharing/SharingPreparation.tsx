import { useEffect, useRef, useState } from "react";
import type { LocalState } from "../storage/contracts";
import type { FamilyContext } from "../family/useFamilyConnection";
import {
  sharingScope,
  scopeKey,
  readPreparation,
  saveChoices,
  prepareSessions,
  stopPreparation,
  type SharingChoices,
} from "./local";
const defaults: SharingChoices = {
  insights: false,
  companion: false,
  future: false,
  trusted: false,
};
export function SharingPreparation({
  context,
  state,
}: {
  context: FamilyContext;
  state: LocalState;
}) {
  const scope = sharingScope(context),
    key = scope ? scopeKey(scope) : "";
  const [choices, setChoices] = useState(defaults),
    [count, setCount] = useState(0),
    [ready, setReady] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [savedRecipients, setSavedRecipients] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => {
    let active = true;
    setReady("");
    setBusy(false);
    setSavedRecipients(false);
    setSelected([]);
    setCount(0);
    setChoices(defaults);
    setMessage("");
    if (scope)
      readPreparation(scope)
        .then((result) => {
          if (active) {
            setChoices(result.plan?.choices || defaults);
            setCount(result.records.length);
            setSavedRecipients(
              Boolean(
                result.plan?.choices.trusted &&
                (result.plan.choices.insights || result.plan.choices.companion),
              ),
            );
            setReady(key);
          }
        })
        .catch(() => {
          if (active)
            setMessage(
              "Prepared records could not be opened. Your games remain available.",
            );
        });
    return () => {
      active = false;
    };
  }, [key]);
  useEffect(() => {
    let active = true;
    function refresh() {
      if (!scope || ready !== key) return;
      void readPreparation(scope)
        .then((result) => {
          if (active) {
            setCount(result.records.length);
            setSavedRecipients(
              Boolean(
                result.plan?.choices.trusted &&
                (result.plan.choices.insights || result.plan.choices.companion),
              ),
            );
            if (!result.plan) setChoices(defaults);
          }
        })
        .catch(() => {
          if (active)
            setMessage(
              "Prepared records could not be opened. Your original history remains.",
            );
        });
    }
    window.addEventListener("curiosity-preparation-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("curiosity-preparation-changed", refresh);
    };
  }, [key, ready]);
  if (!scope || ready !== key)
    return (
      <section>
        <h2>Sharing preparation</h2>
        <p>
          {scope
            ? "Opening your sharing choices…"
            : "Connect Play to your family to prepare sharing choices. Nothing is uploaded."}
        </p>
      </section>
    );
  async function action(task: () => Promise<void>, success: string) {
    const captured = key;
    setBusy(true);
    setMessage("");
    try {
      await task();
      const result = await readPreparation(scope!);
      if (currentKey.current === captured) {
        setChoices(result.plan?.choices || defaults);
        setCount(result.records.length);
        setSavedRecipients(
          Boolean(
            result.plan?.choices.trusted &&
            (result.plan.choices.insights || result.plan.choices.companion),
          ),
        );
        setSelected([]);
        setMessage(success);
      }
    } catch {
      if (currentKey.current === captured)
        setMessage(
          "This device could not save the sharing choices. Please try again.",
        );
    } finally {
      if (currentKey.current === captured) setBusy(false);
    }
  }
  const sessions = state.sessions
    .filter((session) => session.outcome !== "unfinished")
    .slice(-50)
    .reverse();
  return (
    <section className="sharing-preparation">
      <p className="eyebrow">Optional · Local preparation</p>
      <h2>Choose what to share</h2>
      <p>
        Prepare your choices here. <strong>Nothing is uploaded yet.</strong>{" "}
        Before sharing starts, you will be asked again. Playing always works
        without sharing.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={choices.trusted}
          disabled={busy}
          onChange={(event) =>
            setChoices({ ...choices, trusted: event.target.checked })
          }
        />
        This is my personal device; keep prepared records here
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={choices.insights}
          disabled={busy || !choices.trusted}
          onChange={(event) =>
            setChoices({ ...choices, insights: event.target.checked })
          }
        />
        Insights: activity, puzzle version, active time, hints, and undo counts
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={choices.companion}
          disabled={busy || !choices.trusted}
          onChange={(event) =>
            setChoices({ ...choices, companion: event.target.checked })
          }
        />
        Companion: activity names and completed or explored moments, without
        time or hint counts
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={choices.future}
          disabled={
            busy ||
            !choices.trusted ||
            (!choices.insights && !choices.companion)
          }
          onChange={(event) =>
            setChoices({ ...choices, future: event.target.checked })
          }
        />
        Prepare new recorded activities after saving these choices
      </label>
      {!state.preferences.history && (
        <p className="muted">
          Activity history is off. Turn it on under “Your data, your choice” to
          record new activities. These choices do not turn it on automatically.
        </p>
      )}
      <p className="muted">
        Melodies, notebook text, observations, unfinished games, and older
        history are excluded from automatic preparation.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void action(
            () => saveChoices(scope, choices.trusted ? choices : defaults),
            "Choices saved on this device. Nothing was uploaded.",
          )
        }
      >
        Save preparation choices
      </button>
      <p role="status">
        {count} prepared records on this device · Not uploaded
      </p>
      <details>
        <summary>Select older activity explicitly</summary>
        <p>
          Select from your 50 most recent completed or explored activities
          below. Save your recipient choices first. Only the selected activities
          are prepared, using your saved recipient choices.
        </p>
        {sessions.length === 0 && <p>No recorded activity yet.</p>}
        <div className="history-selection">
          {sessions.map((session) => (
            <label className="check-label" key={session.id}>
              <input
                type="checkbox"
                checked={selected.includes(session.id)}
                disabled={busy}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, session.id]
                      : selected.filter((id) => id !== session.id),
                  )
                }
              />
              {session.game} · {session.mode} ·{" "}
              {new Date(session.endedAt).toLocaleString()}
            </label>
          ))}
        </div>
        <button
          disabled={busy || !savedRecipients || selected.length === 0}
          onClick={() =>
            void action(
              () =>
                prepareSessions(
                  scope,
                  state.sessions.filter((session) =>
                    selected.includes(session.id),
                  ),
                  "explicit-history",
                ),
              "Selected activities prepared locally. Nothing was uploaded.",
            )
          }
        >
          Prepare selected activity
        </button>
      </details>
      <button
        disabled={busy}
        onClick={() =>
          void action(
            () => stopPreparation(scope),
            "Preparation stopped and prepared copies removed. Your original local history remains.",
          )
        }
      >
        Stop preparation and remove prepared copies
      </button>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
