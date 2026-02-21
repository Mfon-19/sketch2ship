import type {
  NotebookBlock,
  NotebookViewport,
  Project,
  ShipJobStatus,
  Workspace,
} from "@/lib/workspace-store";

export type RunStatus =
  | "queued"
  | "threading"
  | "specing"
  | "planning"
  | "ready"
  | "failed";

export type AreaSummaryStatus = RunStatus | "idle";

export interface RunRecord {
  id: string;
  noteId: string;
  areaId: string;
  contentHash: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  projectId?: string;
}

export interface AreaSummary {
  id: string;
  blockIds: string[];
  centroid: { x: number; y: number };
  preview: string;
  status: AreaSummaryStatus;
  runId?: string;
  projectId?: string;
}

export type NotePatch =
  | {
      op: "upsert_block";
      block: NotebookBlock;
    }
  | {
      op: "delete_block";
      blockId: string;
    }
  | {
      op: "set_viewport";
      viewport: NotebookViewport;
    }
  | {
      op: "replace_blocks";
      blocks: NotebookBlock[];
    }
  | {
      op: "set_canvas";
      canvas: {
        viewport: NotebookViewport;
        blocks: NotebookBlock[];
      };
    };

export interface WorkspaceLatestResponse {
  workspaceId: string;
  workspace: Workspace;
  activeRun: RunRecord | null;
  latestNoteId: string | null;
  areaSummaries: AreaSummary[];
}

export interface NoteSaveResponse {
  workspaceId: string;
  note: {
    id: string;
    canvas: {
      viewport: NotebookViewport;
      blocks: NotebookBlock[];
    };
  };
  workspace: Workspace;
  areaSummaries: AreaSummary[];
}

export interface RunResponse {
  workspaceId: string;
  run: RunRecord;
  alreadyActive: boolean;
  skipped?: boolean;
  workspace: Workspace;
}

export interface AreaProjectLink {
  areaId: string;
  project: Project;
}

export interface ShipJobLog {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface ShipJobRecord {
  id: string;
  projectId: string;
  issueIds: string[];
  status: ShipJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  branchName?: string;
  pullRequestUrl?: string;
  prototypeUrl?: string;
  summary?: string;
  logs: ShipJobLog[];
}

export interface ShipStartResponse {
  workspaceId: string;
  job: ShipJobRecord;
  alreadyActive: boolean;
  workspace: Workspace;
}

export interface ShipJobResponse {
  workspaceId: string;
  job: ShipJobRecord;
  workspace: Workspace;
}
