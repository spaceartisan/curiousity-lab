import { useEffect, useState } from "react";
import type { Preferences } from "../storage/contracts";

const QUERY = "(prefers-color-scheme: dark)";
const deviceDark = () =>
  typeof matchMedia === "function" && matchMedia(QUERY).matches;

/** The theme actually shown: the chosen one, or the device's when set to follow it. */
export function useEffectiveTheme(choice: Preferences["theme"]) {
  const [dark, setDark] = useState(deviceDark);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia(QUERY);
    const change = () => setDark(m.matches);
    m.addEventListener?.("change", change);
    return () => m.removeEventListener?.("change", change);
  }, []);
  const theme: "light" | "dark" =
    choice === "system" ? (dark ? "dark" : "light") : choice;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#14171a" : "#f6f1e7");
  }, [theme]);
  return theme;
}
