import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilySetup } from "../src/family/FamilySetup";
import {
  parseWebConfig,
  parseMembership,
  hasApproval,
} from "../src/family/contracts";
const config = {
  apiKey: "AIza" + "a".repeat(35),
  projectId: "curiosity-test",
  authDomain: "curiosity-test.firebaseapp.com",
  appId: "1:123456:web:abcdef",
};
describe("family setup boundaries", () => {
  it("unconfigured builds stay local-only with no sign-in button", () => {
    render(<FamilySetup role="play" />);
    expect(screen.getByText(/nothing is uploaded/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Sign in/ }),
    ).not.toBeInTheDocument();
  });
  it("accepts only expected public web config and strips unrelated keys", () => {
    expect(parseWebConfig(undefined)).toBeNull();
    expect(
      parseWebConfig(JSON.stringify({ ...config, privateKey: "discard" })),
    ).toEqual(config);
    expect(() =>
      parseWebConfig(JSON.stringify({ ...config, authDomain: "evil.example" })),
    ).toThrow();
    expect(() => parseWebConfig("{")).toThrow();
  });
  it("rejects short family IDs, revoked grants and wrong installed roles", () => {
    const grant = parseMembership({
      schemaVersion: 1,
      familyId: "family_synthetic_001",
      subjectId: "subject_synthetic_001",
      role: "play",
      status: "active",
    });
    expect(hasApproval(grant, "play")).toBe(true);
    expect(hasApproval(grant, "insights")).toBe(false);
    expect(hasApproval({ ...grant, status: "revoked" }, "play")).toBe(false);
    expect(() => parseMembership({ ...grant, familyId: "123456" })).toThrow();
    expect(() => parseMembership({ ...grant, role: "admin" })).toThrow();
  });
});
