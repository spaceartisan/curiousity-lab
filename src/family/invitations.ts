import type { Role } from "../storage/contracts";
export type ParentRole = Exclude<Role, "insights">;
export interface Invitation {
  code: string;
  link: string;
  role: ParentRole;
  expiresAt: number;
  hash: string;
}
export interface FamilyDevice {
  uid: string;
  role: Role;
  status: "active" | "revoked";
}
export function normalizeCode(code: string): string {
  const normalized = code.trim().replace(/[-\s]/g, "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized))
    throw Error("Paste the complete connection code you received.");
  return normalized;
}
export function createCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .match(/.{4}/g)!
    .join("-");
}
export async function hashCode(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizeCode(code)),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
// Read once, in memory only, and remove the bearer code before Firebase or other requests.
export const incomingInvitation = (() => {
  if (
    typeof window === "undefined" ||
    !window.location.hash.startsWith("#connect=")
  )
    return "";
  const code = window.location.hash.slice(9);
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  try {
    return normalizeCode(code);
  } catch {
    return "";
  }
})();
export function invitationLink(role: ParentRole, code: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}${role}/#connect=${normalizeCode(code)}`;
}
