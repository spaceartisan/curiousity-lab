import { beforeEach, describe, expect, it } from "vitest";
import {
  renderHook,
  waitFor,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { emptyState, type Session } from "../src/storage/contracts";
import {
  sharingScope,
  scopeKey,
  readPreparation,
  saveChoices,
  prepareSessions,
  stopPreparation,
  clearAllPreparations,
  type SharingScope,
} from "../src/sharing/local";
import { usePreparation } from "../src/sharing/usePreparation";
import { SharingPreparation } from "../src/sharing/SharingPreparation";
import type { FamilyContext } from "../src/family/useFamilyConnection";
const a: SharingScope = {
  projectId: "project",
  uid: "player-a",
  familyId: "family-a",
  subjectId: "subject-a",
  role: "play",
};
const b: SharingScope = {
  ...a,
  uid: "player-b",
  familyId: "family-b",
  subjectId: "subject-b",
};
const choices = {
  trusted: true,
  insights: true,
  companion: true,
  future: true,
};
const context = (s = a): FamilyContext => ({
  projectId: s.projectId,
  client: null,
  connection: {
    status: "approved",
    uid: s.uid,
    membership: {
      schemaVersion: 1,
      familyId: s.familyId,
      subjectId: s.subjectId,
      role: "play",
      status: "active",
    },
  },
});
const session = (
  id: string,
  startedAt = new Date(Date.now() + 1000).toISOString(),
): Session => ({
  id,
  schemaVersion: 1,
  appVersion: "0.4.0",
  contentVersion: "1",
  game: "sudoku",
  puzzleId: "sudoku-test",
  startedAt,
  endedAt: startedAt,
  activeMs: 1500,
  hints: 2,
  undos: 1,
  outcome: "completed",
  mode: "4x4:Relaxed",
  attempt: 1,
  source: "local-guest",
});
beforeEach(async () => {
  await clearAllPreparations();
});
describe("local preparation privacy", () => {
  it("requires an approved active player and binds every identity dimension", () => {
    expect(sharingScope(context())).toEqual(a);
    expect(
      sharingScope({ ...context(), connection: { status: "unavailable" } }),
    ).toBeNull();
    const revoked = context();
    if (revoked.connection.status === "approved")
      revoked.connection.membership.status = "revoked";
    expect(sharingScope(revoked)).toBeNull();
    for (const field of ["projectId", "uid", "familyId", "subjectId"] as const)
      expect(scopeKey({ ...a, [field]: "different" })).not.toBe(scopeKey(a));
  });
  it("defaults to no preparation and refuses untrusted storage", async () => {
    await prepareSessions(a, [session("one")], "explicit-history");
    expect((await readPreparation(a)).records).toHaveLength(0);
    await expect(
      saveChoices(a, { ...choices, trusted: false }),
    ).rejects.toThrow("personal device");
  });
  it("requires explicit selection of old history and excludes unfinished games", async () => {
    await saveChoices(a, choices);
    const old = session("old", "2020-01-01T00:00:00.000Z");
    await prepareSessions(
      a,
      [old, { ...session("unfinished"), outcome: "unfinished" }],
      "future",
    );
    expect((await readPreparation(a)).records).toHaveLength(0);
    await prepareSessions(a, [old], "explicit-history");
    expect((await readPreparation(a)).records).toHaveLength(2);
  });
  it("deduplicates concurrent retries and keeps Companion metrics and arbitrary notes out", async () => {
    await saveChoices(a, choices);
    const value = {
      ...session("one"),
      text: "private",
      observations: ["private"],
    };
    await Promise.all([
      prepareSessions(a, [value], "future"),
      prepareSessions(a, [value], "future"),
    ]);
    const { records } = await readPreparation(a);
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.channel === "companion")?.payload).toEqual({
      game: "sudoku",
      outcome: "completed",
      endedAt: value.endedAt,
    });
    expect(
      records.find((r) => r.channel === "insights")?.payload,
    ).not.toHaveProperty("text");
    expect(records.every((r) => scopeKey(r.scope) === scopeKey(a))).toBe(true);
  });
  it("keeps validated settings in Insights preparations, excludes them from Companion and strips unknown context fields", async () => {
    await saveChoices(a, choices);
    const presentation = {
      version: 1 as const,
      coverage: "from-start" as const,
      themes: ["light" as const],
      textSizes: ["normal" as const],
    };
    await prepareSessions(
      a,
      [{ ...session("context-good"), presentation }],
      "future",
    );
    const original = structuredClone(presentation);
    presentation.themes.push("light");
    const good = (await readPreparation(a)).records;
    expect(good.find((r) => r.channel === "insights")?.payload).toHaveProperty(
      "presentation",
      original,
    );
    expect(
      good.find((r) => r.channel === "companion")?.payload,
    ).not.toHaveProperty("presentation");
    await prepareSessions(
      a,
      [
        {
          ...session("context-bad"),
          presentation: { ...original, privateNote: "private" },
        } as any,
      ],
      "future",
    );
    expect(
      (await readPreparation(a)).records.find(
        (r) =>
          r.channel === "insights" &&
          r.payload &&
          "id" in r.payload &&
          r.payload.id === "context-bad",
      )?.payload,
    ).not.toHaveProperty("presentation");
  });
  it("keeps accounts isolated and purges a disabled recipient immediately", async () => {
    await saveChoices(a, choices);
    await prepareSessions(a, [session("one")], "future");
    expect((await readPreparation(b)).records).toHaveLength(0);
    await saveChoices(a, { ...choices, companion: false });
    expect((await readPreparation(a)).records.map((r) => r.channel)).toEqual([
      "insights",
    ]);
    await stopPreparation(a);
    expect(await readPreparation(a)).toEqual({ plan: null, records: [] });
  });
  it("removes preparations for previous accounts as well as the current account", async () => {
    for (const scope of [a, b]) {
      await saveChoices(scope, choices);
      await prepareSessions(scope, [session("one")], "future");
    }
    await clearAllPreparations();
    for (const scope of [a, b])
      expect(await readPreparation(scope)).toEqual({ plan: null, records: [] });
  });
  it("never enrolls existing history on load, reconnect, or account switch", async () => {
    await saveChoices(a, choices);
    await saveChoices(b, choices);
    const initial = { ...emptyState("play"), sessions: [session("existing")] };
    const hook = renderHook(
      ({ family, state }) => usePreparation(family, state),
      { initialProps: { family: context(), state: initial } },
    );
    expect((await readPreparation(a)).records).toHaveLength(0);
    const next = {
      ...initial,
      sessions: [...initial.sessions, session("new-a")],
    };
    hook.rerender({ family: context(), state: next });
    await waitFor(async () =>
      expect((await readPreparation(a)).records).toHaveLength(2),
    );
    hook.rerender({ family: context(b), state: next });
    expect((await readPreparation(b)).records).toHaveLength(0);
    const third = { ...next, sessions: [...next.sessions, session("new-b")] };
    hook.rerender({ family: context(b), state: third });
    await waitFor(async () =>
      expect((await readPreparation(b)).records).toHaveLength(2),
    );
    hook.rerender({ family: context(), state: third });
    expect((await readPreparation(a)).records).toHaveLength(2);
  });
  it("does not enroll activities recorded while approval is unavailable", async () => {
    await saveChoices(a, choices);
    const initial = emptyState("play");
    const hook = renderHook(
      ({ family, state }) => usePreparation(family, state),
      { initialProps: { family: context(), state: initial } },
    );
    hook.rerender({
      family: { ...context(), connection: { status: "unavailable" } },
      state: initial,
    });
    const next = { ...initial, sessions: [session("offline")] };
    hook.rerender({
      family: { ...context(), connection: { status: "unavailable" } },
      state: next,
    });
    hook.rerender({ family: context(), state: next });
    expect((await readPreparation(a)).records).toHaveLength(0);
  });
  it("hides prepared count and choices immediately on account change", async () => {
    await saveChoices(a, choices);
    await prepareSessions(a, [session("one")], "future");
    const view = render(
      <SharingPreparation context={context()} state={emptyState("play")} />,
    );
    await screen.findByText("2 prepared records on this device · Not uploaded");
    view.rerender(
      <SharingPreparation context={context(b)} state={emptyState("play")} />,
    );
    expect(
      screen.queryByText("2 prepared records on this device · Not uploaded"),
    ).toBeNull();
    await screen.findByText("0 prepared records on this device · Not uploaded");
    expect(
      screen.getByLabelText(/This is my personal device/),
    ).not.toBeChecked();
  });
  it("requires saved recipient choices before explicit preparation and displays clear upload status", async () => {
    render(
      <SharingPreparation
        context={context()}
        state={{ ...emptyState("play"), sessions: [session("one")] }}
      />,
    );
    await screen.findByText("0 prepared records on this device · Not uploaded");
    fireEvent.click(screen.getByLabelText(/sudoku ·/));
    expect(
      screen.getByRole("button", { name: "Prepare selected activity" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/This is my personal device/));
    fireEvent.click(screen.getByLabelText(/Insights: activity/));
    fireEvent.click(
      screen.getByRole("button", { name: "Save preparation choices" }),
    );
    await screen.findByText(
      "Choices saved on this device. Nothing was uploaded.",
    );
    fireEvent.click(screen.getByLabelText(/sudoku ·/));
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare selected activity" }),
    );
    await screen.findByText("1 prepared records on this device · Not uploaded");
  });
  it("never enrolls restored history even when its dates follow future-choice consent", async () => {
    await saveChoices(a, choices);
    const initial = emptyState("play");
    const hook = renderHook(
      ({ state, epoch }) => usePreparation(context(), state, epoch),
      { initialProps: { state: initial, epoch: 0 } },
    );
    hook.rerender({
      state: { ...initial, sessions: [session("restored")] },
      epoch: 1,
    });
    expect((await readPreparation(a)).records).toHaveLength(0);
    hook.rerender({
      state: {
        ...initial,
        sessions: [session("restored"), session("new-after-restore")],
      },
      epoch: 1,
    });
    await waitFor(async () =>
      expect((await readPreparation(a)).records).toHaveLength(2),
    );
  });
});
