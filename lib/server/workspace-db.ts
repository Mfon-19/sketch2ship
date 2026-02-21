import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractedIdea } from "@/lib/mock-data";
import type { NotebookEntry, Project, Workspace } from "@/lib/workspace-store";

export type RunStatus =
  | "queued"
  | "threading"
  | "specing"
  | "planning"
  | "ready"
  | "failed";

export interface RunRecord {
  id: string;
  noteId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  projectId?: string;
}

interface WorkspaceRecord {
  workspace: Workspace;
  runs: RunRecord[];
}

interface DatabaseFile {
  workspaces: Record<string, WorkspaceRecord>;
}

const STORAGE_DIR = path.join(process.cwd(), ".data");
const STORAGE_FILE = path.join(STORAGE_DIR, "guest-workspaces.json");

let cache: DatabaseFile | null = null;
let lock: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function createEmptyWorkspace(workspaceId: string): Workspace {
  return {
    id: workspaceId,
    version: 1,
    notebooks: [],
    extractedIdeas: [],
    projects: [],
    lastUpdated: nowIso(),
  };
}

async function loadDb(): Promise<DatabaseFile> {
  if (cache) return cache;

  try {
    const raw = await readFile(STORAGE_FILE, "utf8");
    cache = JSON.parse(raw) as DatabaseFile;
    return cache;
  } catch {
    cache = { workspaces: {} };
    return cache;
  }
}

async function saveDb(db: DatabaseFile) {
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(STORAGE_FILE, JSON.stringify(db, null, 2), "utf8");
  cache = db;
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = lock;
  let release!: () => void;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

function touchWorkspace(workspace: Workspace) {
  workspace.lastUpdated = nowIso();
}

function cloneWorkspaceRecord(record: WorkspaceRecord): WorkspaceRecord {
  return {
    workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    runs: JSON.parse(JSON.stringify(record.runs)) as RunRecord[],
  };
}

async function ensureWorkspaceRecordInternal(
  workspaceId: string
): Promise<{ db: DatabaseFile; record: WorkspaceRecord }> {
  const db = await loadDb();
  if (!db.workspaces[workspaceId]) {
    db.workspaces[workspaceId] = {
      workspace: createEmptyWorkspace(workspaceId),
      runs: [],
    };
  }
  return { db, record: db.workspaces[workspaceId] };
}

export async function getWorkspaceRecord(
  workspaceId: string
): Promise<WorkspaceRecord> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    await saveDb(db);
    return cloneWorkspaceRecord(record);
  });
}

export async function saveNoteContent(
  workspaceId: string,
  content: string,
  noteId?: string
): Promise<{ note: NotebookEntry; workspace: Workspace }> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const notebooks = record.workspace.notebooks;
    const targetId = noteId ?? notebooks[0]?.id ?? crypto.randomUUID();
    const existing = notebooks.find((entry) => entry.id === targetId);
    const timestamp = nowIso();

    if (existing) {
      existing.content = content;
      existing.updatedAt = timestamp;
    } else {
      notebooks.unshift({
        id: targetId,
        title: "Notebook Entry",
        content,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    touchWorkspace(record.workspace);
    await saveDb(db);

    const saved = record.workspace.notebooks.find((n) => n.id === targetId)!;
    return {
      note: JSON.parse(JSON.stringify(saved)) as NotebookEntry,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    };
  });
}

export async function getNoteById(
  workspaceId: string,
  noteId: string
): Promise<NotebookEntry | null> {
  const { workspace } = await getWorkspaceRecord(workspaceId);
  return workspace.notebooks.find((n) => n.id === noteId) ?? null;
}

export async function createRun(
  workspaceId: string,
  noteId: string
): Promise<{ run: RunRecord; alreadyActive: boolean; workspace: Workspace }> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const active = record.runs.find(
      (run) =>
        run.status === "queued" ||
        run.status === "threading" ||
        run.status === "specing" ||
        run.status === "planning"
    );

    if (active) {
      return {
        run: JSON.parse(JSON.stringify(active)) as RunRecord,
        alreadyActive: true,
        workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
      };
    }

    const run: RunRecord = {
      id: crypto.randomUUID(),
      noteId,
      status: "queued",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    record.runs.unshift(run);
    touchWorkspace(record.workspace);
    await saveDb(db);

    return {
      run: JSON.parse(JSON.stringify(run)) as RunRecord,
      alreadyActive: false,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    };
  });
}

export async function updateRunStatus(
  workspaceId: string,
  runId: string,
  status: RunStatus,
  extras?: Partial<Pick<RunRecord, "error" | "projectId">>
): Promise<RunRecord | null> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const run = record.runs.find((item) => item.id === runId);
    if (!run) return null;

    run.status = status;
    run.updatedAt = nowIso();
    if (extras?.error !== undefined) run.error = extras.error;
    if (extras?.projectId !== undefined) run.projectId = extras.projectId;

    touchWorkspace(record.workspace);
    await saveDb(db);

    return JSON.parse(JSON.stringify(run)) as RunRecord;
  });
}

export async function finalizeRun(
  workspaceId: string,
  runId: string,
  ideas: ExtractedIdea[],
  project: Project
): Promise<{ run: RunRecord; workspace: Workspace } | null> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const run = record.runs.find((item) => item.id === runId);
    if (!run) return null;

    const projectId = project.id || crypto.randomUUID();
    const projectWithId: Project = { ...project, id: projectId };

    record.workspace.extractedIdeas = ideas;
    record.workspace.projects = [
      projectWithId,
      ...record.workspace.projects.filter((p) => p.id !== projectWithId.id),
    ];

    run.status = "ready";
    run.projectId = projectWithId.id;
    run.updatedAt = nowIso();

    touchWorkspace(record.workspace);
    await saveDb(db);

    return {
      run: JSON.parse(JSON.stringify(run)) as RunRecord,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    };
  });
}

export async function failRun(
  workspaceId: string,
  runId: string,
  errorMessage: string
) {
  await updateRunStatus(workspaceId, runId, "failed", {
    error: errorMessage.slice(0, 500),
  });
}

export async function getRunById(
  workspaceId: string,
  runId: string
): Promise<{ run: RunRecord | null; workspace: Workspace }> {
  const record = await getWorkspaceRecord(workspaceId);
  return {
    run: record.runs.find((item) => item.id === runId) ?? null,
    workspace: record.workspace,
  };
}

export async function getActiveRun(workspaceId: string): Promise<RunRecord | null> {
  const record = await getWorkspaceRecord(workspaceId);
  return (
    record.runs.find(
      (run) =>
        run.status === "queued" ||
        run.status === "threading" ||
        run.status === "specing" ||
        run.status === "planning"
    ) ?? null
  );
}
