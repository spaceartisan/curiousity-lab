import { useEffect, useRef, useState } from "react";
import type { Role } from "../storage/contracts";
import type { Connection } from "./contracts";
import { useFamilyConnection, type FamilyContext } from "./useFamilyConnection";
import {
  incomingInvitation,
  type Invitation,
  type FamilyDevice,
  type ParentRole,
} from "./invitations";
import type { FamilyClient } from "./client";

export function FamilySetup({
  role,
  context,
}: {
  role: Role;
  context?: FamilyContext;
}) {
  const ownContext = useFamilyConnection(role, !context);
  const { connection, client: adapter } = context || ownContext;
  const [trusted, setTrusted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [code, setCode] = useState(incomingInvitation);
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [devices, setDevices] = useState<FamilyDevice[]>([]);
  const client = useRef<FamilyClient | null>(null);
  const owner = role === "insights";
  client.current = adapter;
  const accountKey = "uid" in connection ? connection.uid : connection.status;
  const activeAccount = useRef(accountKey);
  activeAccount.current = accountKey;
  const familyId =
    connection.status === "approved" ? connection.membership.familyId : "";
  useEffect(() => {
    setBusy(false);
    setMessage("");
    setDevices([]);
    setInvite(null);
    if (!owner || !familyId || !client.current) return;
    return client.current.watchDevices(familyId, setDevices, () =>
      setMessage(
        "Device connections could not be checked. Try again when online.",
      ),
    );
  }, [owner, familyId, accountKey]);
  async function action(task: () => Promise<void>, fallback: string) {
    const captured = accountKey;
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (error) {
      if (activeAccount.current !== captured) return;
      const reason = error instanceof Error ? error.message : "";
      setMessage(
        /^(Paste the complete|This code is for|Disconnect this account)/.test(
          reason,
        )
          ? reason
          : fallback,
      );
    } finally {
      if (activeAccount.current === captured) setBusy(false);
    }
  }
  async function issue(parentRole: ParentRole) {
    if (!client.current) return;
    const captured = accountKey;
    await action(async () => {
      const issued = await client.current!.createInvitation(parentRole);
      if (activeAccount.current === captured) setInvite(issued);
    }, "The invitation could not be created. Check your connection and the administrator setup guide.");
  }
  const descriptions: Record<Connection["status"], string> = {
    "not-configured":
      "Family connection is being prepared. Nothing is uploaded, and local games remain available.",
    "signed-out": owner
      ? "Sign in to connect your family."
      : "Paste the connection code you received. You only need to do this once on this device.",
    checking: "Checking your connection…",
    unapproved: owner
      ? "Sign in to finish setting up your family."
      : "Paste your connection code to finish setup.",
    "wrong-role":
      "This device is connected to a different app. Disconnect it below, then use the correct invitation.",
    revoked:
      "This device’s connection was removed. Disconnect it below, then ask for a new code to reconnect.",
    unavailable:
      "The connection could not be checked. Please try again when online.",
    approved: owner
      ? "Your family is ready for invitations."
      : "Connected. This app will remember your connection on this device.",
  };
  const canConnect =
    !owner &&
    ["signed-out", "unapproved", "unavailable"].includes(connection.status);
  return (
    <section className="family-setup" aria-label="Family connection">
      <p className="eyebrow">One-time setup</p>
      <h2>Family connection</h2>
      <p role="status">{descriptions[connection.status]}</p>
      {canConnect && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (client.current)
              void action(async () => {
                await client.current!.connect(code);
                setCode("");
              }, "Couldn’t connect. Check your internet connection or ask for a new code.");
          }}
        >
          <label htmlFor="connection-code">Connection code</label>
          <input
            id="connection-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Paste the code you received"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={busy}
          />
          <button
            className="primary"
            type="submit"
            disabled={busy || !code.trim() || !client.current}
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        </form>
      )}
      {owner &&
        ["signed-out", "unapproved", "unavailable"].includes(
          connection.status,
        ) && (
          <>
            <label className="check-label">
              <input
                type="checkbox"
                checked={trusted}
                onChange={(event) => setTrusted(event.target.checked)}
              />
              Keep me signed in on this personal device
            </label>
            <button
              className="primary"
              disabled={busy || !client.current}
              onClick={() =>
                void action(
                  () => client.current!.signIn(trusted),
                  "Sign-in or family setup did not finish. Allow the sign-in window and check the administrator setup guide.",
                )
              }
            >
              Sign in with Google
            </button>
          </>
        )}
      {owner && connection.status === "approved" && (
        <>
          <div className="actions">
            <button disabled={busy} onClick={() => void issue("play")}>
              Create Mom’s code
            </button>
            <button disabled={busy} onClick={() => void issue("companion")}>
              Create Dad’s code
            </button>
          </div>
          {invite && (
            <div className="family-invitation">
              <h3>
                {invite.role === "play"
                  ? "Mom’s invitation · Play"
                  : "Dad’s invitation · Companion"}
              </h3>
              <p>
                Text this invitation. Opening its link fills in the code; they
                just tap Connect. It can be used once and expires{" "}
                {new Date(invite.expiresAt).toLocaleString()}.
              </p>
              <label htmlFor="invitation-text">Invitation to text</label>
              <textarea
                id="invitation-text"
                readOnly
                rows={5}
                value={`Open Curiosity Lab and tap Connect:\n${invite.link}\n\nConnection code: ${invite.code}`}
              />
              <div className="actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await navigator.clipboard.writeText(
                        `Open Curiosity Lab and tap Connect:\n${invite.link}\n\nConnection code: ${invite.code}`,
                      );
                      setMessage(
                        "Invitation copied. Paste it into your text message.",
                      );
                    }, "Select the invitation above and copy it to your text message.")
                  }
                >
                  Copy invitation
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await client.current!.cancelInvitation(invite.hash);
                      setInvite(null);
                    }, "This invitation may already have been used. Check the connected devices below.")
                  }
                >
                  Cancel invitation
                </button>
              </div>
            </div>
          )}
          <h3>Connected devices</h3>
          {devices.filter((device) => device.role !== "insights").length ===
            0 && <p>No parent devices connected yet.</p>}
          <ul className="family-devices">
            {devices
              .filter((device) => device.role !== "insights")
              .map((device, index) => (
                <li key={device.uid}>
                  <span>
                    {device.role === "play" ? "Mom · Play" : "Dad · Companion"}{" "}
                    · Device {index + 1} ·{" "}
                    {device.status === "active" ? "Connected" : "Removed"}
                  </span>
                  {device.status === "active" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void action(
                          () =>
                            client.current!.revokeDevice(familyId, device.uid),
                          "The device could not be removed. Please try again when online.",
                        )
                      }
                    >
                      Remove connection
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </>
      )}
      {"uid" in connection && (
        <button
          disabled={busy}
          onClick={() =>
            void action(async () => {
              setInvite(null);
              await client.current!.signOut();
            }, "Disconnect did not finish. Please try again.")
          }
        >
          {owner ? "Sign out" : "Disconnect this device"}
        </button>
      )}
      {connection.status === "unavailable" && (
        <button onClick={() => location.reload()}>Check again</button>
      )}
      <p className="muted">
        Activity sharing is coming next. For now, puzzles, notes, melodies, and
        activity history stay on this device.
      </p>
      {owner && (
        <p>
          <a
            href="https://github.com/spaceartisan/curiousity-lab/blob/main/docs/FIREBASE_SETUP.md"
            target="_blank"
            rel="noreferrer"
          >
            Administrator setup guide
          </a>
        </p>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
