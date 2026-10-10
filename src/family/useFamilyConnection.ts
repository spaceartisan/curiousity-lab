import { useEffect, useState } from "react";
import type { Role } from "../storage/contracts";
import { resolveWebConfig, type Connection } from "./contracts";
import type { FamilyClient } from "./client";
import deployment from "../../firebase/web-config.json";
export interface FamilyContext {
  connection: Connection;
  client: FamilyClient | null;
  projectId: string;
}
export function useFamilyConnection(role: Role, enabled = true): FamilyContext {
  const [context, setContext] = useState<FamilyContext>({
    connection: { status: "not-configured" },
    client: null,
    projectId: "",
  });
  const [contextRole, setContextRole] = useState(role);
  useEffect(() => {
    setContextRole(role);
    if (!enabled) return;
    let active = true,
      stop = () => {};
    try {
      const config = resolveWebConfig(
        import.meta.env.VITE_FIREBASE_CONFIG,
        deployment,
      );
      if (!config) {
        setContext({
          connection: { status: "not-configured" },
          client: null,
          projectId: "",
        });
        return;
      }
      setContext({
        connection: { status: "checking" },
        client: null,
        projectId: config.projectId,
      });
      import("./client")
        .then(({ familyClient }) => {
          if (!active) return;
          const client = familyClient(config, role);
          stop = client.watch((connection) => {
            if (active)
              setContext({ connection, client, projectId: config.projectId });
          });
        })
        .catch(() => {
          if (active)
            setContext({
              connection: { status: "unavailable" },
              client: null,
              projectId: config.projectId,
            });
        });
    } catch {
      setContext({
        connection: { status: "unavailable" },
        client: null,
        projectId: "",
      });
    }
    return () => {
      active = false;
      stop();
    };
  }, [role, enabled]);
  useEffect(() => {
    if (context.connection.status !== "checking") return;
    const timer = setTimeout(
      () =>
        setContext((value) => ({
          ...value,
          connection: { status: "unavailable" },
        })),
      15000,
    );
    return () => clearTimeout(timer);
  }, [context.connection.status]);
  return contextRole === role
    ? context
    : { connection: { status: "checking" }, client: null, projectId: "" };
}
