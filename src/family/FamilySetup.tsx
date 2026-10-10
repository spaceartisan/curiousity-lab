import { useEffect, useRef, useState } from "react";
import type { Role } from "../storage/contracts";
import { parseWebConfig, type Connection } from "./contracts";
import type { FamilyClient } from "./client";

export function FamilySetup({ role }: { role: Role }) {
  const [connection, setConnection] = useState<Connection>({
    status: "not-configured",
  });
  const [trusted, setTrusted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const client = useRef<FamilyClient | null>(null);
  useEffect(() => {
    if (connection.status !== "checking") return;
    const timeout = setTimeout(
      () => setConnection({ status: "unavailable" }),
      15000,
    );
    return () => clearTimeout(timeout);
  }, [connection.status]);
  useEffect(() => {
    let active = true,
      stop = () => {};
    try {
      const config = parseWebConfig(import.meta.env.VITE_FIREBASE_CONFIG);
      if (!config) return;
      setConnection({ status: "checking" });
      // Unconfigured builds never load or initialize Firebase.
      import("./client")
        .then(({ familyClient }) => {
          if (!active) return;
          client.current = familyClient(config, role);
          stop = client.current.watch((value) => {
            if (active) setConnection(value);
          });
        })
        .catch(() => {
          if (active) setConnection({ status: "unavailable" });
        });
    } catch {
      setConnection({ status: "unavailable" });
    }
    return () => {
      active = false;
      stop();
      client.current = null;
    };
  }, [role]);
  async function action(kind: "signIn" | "signOut") {
    if (!client.current) return;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "signIn") await client.current.signIn(trusted);
      else {
        setConnection({ status: "checking" });
        await client.current.signOut();
      }
    } catch {
      setMessage(
        kind === "signIn"
          ? "Sign-in did not finish. Try again with an internet connection and allow the sign-in window. Your local games still work."
          : "Sign-out did not finish. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const descriptions: Record<Connection["status"], string> = {
    "not-configured":
      "Family connection is being prepared. No account is needed to play, and nothing is uploaded.",
    "signed-out":
      "You can sign in for one-time family setup. Your administrator must approve this account for this app.",
    checking: "Checking the account’s approval. Local games remain available.",
    unapproved:
      "This account has not been approved. Give the account ID below to your family administrator.",
    "wrong-role":
      "This app is not connected to your account. Contact your family administrator.",
    revoked:
      "This account’s connection has been removed. Local games remain available.",
    unavailable:
      "Approval could not be checked. Check your connection, or ask your family administrator to review setup.",
    approved:
      "Your account is approved for this app. Activity sharing is still being prepared; your progress stays on this device.",
  };
  return (
    <section className="family-setup" aria-label="Family connection">
      <p className="eyebrow">Optional · One-time setup</p>
      <h2>Family connection</h2>
      <p role="status">{descriptions[connection.status]}</p>
      <p className="muted">
        Signing in does not upload puzzles, notes, melodies, or activity
        history. Sharing will need a separate choice when it is available.
      </p>
      {connection.status === "signed-out" && (
        <>
          <label className="check-label">
            <input
              type="checkbox"
              checked={trusted}
              onChange={(e) => setTrusted(e.target.checked)}
            />
            Keep me signed in on this personal device
          </label>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void action("signIn")}
          >
            Sign in with Google
          </button>
        </>
      )}
      {"uid" in connection && (
        <>
          <details>
            <summary>Account ID for administrator setup</summary>
            <code className="account-id">{connection.uid}</code>
          </details>
          <button disabled={busy} onClick={() => void action("signOut")}>
            Sign out of this app
          </button>
        </>
      )}
      {connection.status === "unavailable" && (
        <div className="actions">
          <button onClick={() => location.reload()}>Check again</button>
          {client.current && (
            <button disabled={busy} onClick={() => void action("signOut")}>
              Sign out of this app
            </button>
          )}
        </div>
      )}
      {role === "insights" && (
        <p>
          <a
            href="https://github.com/spaceartisan/curiousity-lab/blob/main/docs/FIREBASE_SETUP.md"
            target="_blank"
            rel="noreferrer"
          >
            Open administrator setup guide
          </a>
        </p>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
