import type { Role } from "../storage/contracts";

export interface WebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}
export interface Membership {
  schemaVersion: 1;
  familyId: string;
  subjectId: string;
  role: Role;
  status: "active" | "revoked";
}
export function resolveWebConfig(
  override: string | undefined,
  deployment: unknown,
): WebConfig | null {
  if (override?.trim() === "local-only") return null;
  return parseWebConfig(override?.trim() || JSON.stringify(deployment));
}
const opaqueId = /^[A-Za-z0-9_-]{16,100}$/;
export function parseWebConfig(text: string | undefined): WebConfig | null {
  if (!text?.trim()) return null;
  const value = JSON.parse(text) as WebConfig;
  if (
    !value ||
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value.projectId) ||
    value.authDomain !== `${value.projectId}.firebaseapp.com` ||
    !/^AIza[\w-]{20,100}$/.test(value.apiKey) ||
    !/^1:\d+:web:[a-f0-9]+$/.test(value.appId)
  )
    throw Error("Invalid Firebase web configuration");
  // No arbitrary domains, credentials, measurement IDs or emulator settings.
  return {
    apiKey: value.apiKey,
    authDomain: value.authDomain,
    projectId: value.projectId,
    appId: value.appId,
  };
}
export function parseMembership(value: unknown): Membership {
  const m = value as Membership;
  if (
    !m ||
    m.schemaVersion !== 1 ||
    !opaqueId.test(m.familyId) ||
    !opaqueId.test(m.subjectId) ||
    !["play", "companion", "insights"].includes(m.role) ||
    !["active", "revoked"].includes(m.status)
  )
    throw Error("Unsupported membership");
  return {
    schemaVersion: 1,
    familyId: m.familyId,
    subjectId: m.subjectId,
    role: m.role,
    status: m.status,
  };
}
export type Connection =
  | { status: "not-configured" | "signed-out" | "checking" | "unavailable" }
  | { status: "unapproved" | "wrong-role" | "revoked"; uid: string }
  | { status: "approved"; uid: string; membership: Membership };
export const hasApproval = (m: Membership, role: Role) =>
  m.status === "active" && m.role === role;
