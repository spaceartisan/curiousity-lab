import { createRoot } from "react-dom/client";
import { App, Boundary, InstallPage } from "./App";
import type { Role } from "./storage/contracts";
const entry = location.pathname.split("/").filter(Boolean).at(-1);
const role: Role | null =
  entry === "play" || entry === "companion" || entry === "insights"
    ? entry
    : null;
createRoot(document.getElementById("root")!).render(
  <Boundary>{role ? <App appRole={role} /> : <InstallPage />}</Boundary>,
);
