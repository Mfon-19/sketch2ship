"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Workspace } from "@/lib/workspace-store";
import {
  getWorkspace,
  saveWorkspace,
  updateWorkspace as updateStore,
} from "@/lib/workspace-store";

interface WorkspaceContextValue {
  workspace: Workspace | null;
  isLoading: boolean;
  updateWorkspace: (updater: (w: Workspace) => Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(() =>
    getWorkspace()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/workspace/latest", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { workspace?: Workspace };
        if (!data.workspace || cancelled) return;

        saveWorkspace(data.workspace);
        setWorkspace(data.workspace);
      } catch {
        // Keep local fallback when server sync fails.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateWorkspace = useCallback((updater: (w: Workspace) => Workspace) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const next = updateStore(updater);
      return next;
    });
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{ workspace, isLoading, updateWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
