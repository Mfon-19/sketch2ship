"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import type { Workspace } from "@/lib/workspace-store";
import { getWorkspace, updateWorkspace as updateStore } from "@/lib/workspace-store";

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

  const updateWorkspace = useCallback((updater: (w: Workspace) => Workspace) => {
    setWorkspace((prev) => {
      if (!prev) return prev;
      const next = updateStore(updater);
      return next;
    });
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{ workspace, isLoading: false, updateWorkspace }}
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
