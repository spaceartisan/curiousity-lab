import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { Connection } from "../src/family/contracts";
import {
  createCode,
  normalizeCode,
  hashCode,
  invitationLink,
} from "../src/family/invitations";
import { FamilySetup } from "../src/family/FamilySetup";
const harness = vi.hoisted(() => ({
  connection: { status: "signed-out" } as Connection,
  connect: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  issue: vi.fn(),
  revoke: vi.fn(),
  cancel: vi.fn(),
  notify: null as null | ((value: Connection) => void),
}));
vi.mock("../src/family/client", () => ({
  familyClient: () => ({
    watch: (notify: (value: Connection) => void) => {
      harness.notify = notify;
      notify(harness.connection);
      return vi.fn();
    },
    connect: harness.connect,
    signIn: harness.signIn,
    signOut: harness.signOut,
    createInvitation: harness.issue,
    revokeDevice: harness.revoke,
    cancelInvitation: harness.cancel,
    watchDevices: (_family: string, notify: (value: unknown) => void) => {
      notify([{ uid: "private_parent_uid", role: "play", status: "active" }]);
      return vi.fn();
    },
  }),
}));
const config = JSON.stringify({
  apiKey: "AIza" + "a".repeat(35),
  projectId: "curiosity-test",
  authDomain: "curiosity-test.firebaseapp.com",
  appId: "1:123456:web:abcdef",
});
beforeEach(() => {
  vi.clearAllMocks();
  harness.connection = { status: "signed-out" };
  vi.stubEnv("VITE_FIREBASE_CONFIG", config);
  vi.stubEnv("BASE_URL", "/curiousity-lab/");
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => {
  vi.stubEnv("VITE_FIREBASE_CONFIG", "local-only");
  vi.unstubAllGlobals();
});
describe("code-only family setup", () => {
  it("generates 128-bit codes, accepts pasted formatting and hashes without storing the bearer", async () => {
    const first = createCode(),
      second = createCode();
    expect(first).toMatch(/^([A-F0-9]{4}-){7}[A-F0-9]{4}$/);
    expect(first).not.toBe(second);
    expect(normalizeCode(` ${first.toLowerCase()} `)).toBe(
      first.replaceAll("-", "").toLowerCase(),
    );
    expect(await hashCode(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashCode(first.toLowerCase())).toBe(await hashCode(first));
    expect(() => normalizeCode("123456")).toThrow();
    const url = new URL(invitationLink("play", first));
    expect(url.pathname).toBe("/curiousity-lab/play/");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#connect=${normalizeCode(first)}`);
  });
  it("parents see only a code and connect once with no email, Google or account ID", async () => {
    render(<FamilySetup role="play" />);
    const input = await screen.findByLabelText("Connection code");
    expect(
      screen.queryByRole("button", { name: /Google/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Account ID/)).not.toBeInTheDocument();
    fireEvent.change(input, {
      target: { value: "ABCD-EF01-2345-6789-ABCD-EF01-2345-6789" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Connect$/ }));
    await waitFor(() => expect(harness.connect).toHaveBeenCalledOnce());
    expect(harness.connect).toHaveBeenCalledWith(
      "ABCD-EF01-2345-6789-ABCD-EF01-2345-6789",
    );
  });
  it("a connection error keeps the entered code for retry and shows no raw backend error", async () => {
    harness.connect.mockRejectedValueOnce(
      Error("permission-denied: private internal details"),
    );
    render(<FamilySetup role="companion" />);
    const input = await screen.findByLabelText("Connection code");
    fireEvent.change(input, { target: { value: "pasted code" } });
    fireEvent.click(screen.getByRole("button", { name: /^Connect$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t connect",
    );
    expect(input).toHaveValue("pasted code");
    expect(screen.queryByText(/private internal/)).not.toBeInTheDocument();
  });
  it("owner creates role-specific invitations and removes a device without exposing identity IDs", async () => {
    harness.connection = {
      status: "approved",
      uid: "private_owner_uid",
      membership: {
        schemaVersion: 1,
        familyId: "family_synthetic_0001",
        subjectId: "subject_synthetic_001",
        role: "insights",
        status: "active",
      },
    };
    harness.issue.mockResolvedValueOnce({
      code: "TEST-CODE",
      hash: "a".repeat(64),
      role: "play",
      expiresAt: Date.now() + 3600000,
      link: "https://example.test/play/#connect=synthetic",
    });
    render(<FamilySetup role="insights" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Create Mom’s code" }),
    );
    expect(
      (
        (await screen.findByLabelText(
          "Invitation to text",
        )) as HTMLTextAreaElement
      ).value,
    ).toContain("TEST-CODE");
    expect(harness.issue).toHaveBeenCalledWith("play");
    expect(screen.queryByText("private_parent_uid")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove connection" }));
    await waitFor(() =>
      expect(harness.revoke).toHaveBeenCalledWith(
        "family_synthetic_0001",
        "private_parent_uid",
      ),
    );
  });
});
