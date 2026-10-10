import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
// Unit tests never initialize a real deployment's Firebase connection.
vi.stubEnv("VITE_FIREBASE_CONFIG", "");
afterEach(() => cleanup());
window.confirm = vi.fn(() => true);
