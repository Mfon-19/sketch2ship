import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractedIdea } from "@/lib/mock-data";
import type {
  AreaSummary,
  AreaSummaryStatus,
  NotePatch,
  RunRecord,
  RunStatus,
  ShipJobRecord,
} from "@/lib/notebook-types";
import type {
  NotebookArea,
  NotebookBlock,
  NotebookEntry,
  Project,
  ShipJobStatus,
  Workspace,
} from "@/lib/workspace-store";
import {
  createDefaultCanvas,
  createDefaultViewport,
  normalizeNotebookEntry,
} from "@/lib/workspace-store";

interface WorkspaceRecord {
  workspace: Workspace;
  runs: RunRecord[];
  shipJobs: ShipJobRecord[];
  githubAuth?: {
    accessToken: string;
    tokenType?: string;
    scope?: string;
    login?: string;
    connectedAt: string;
  };
  githubOAuthState?: {
    value: string;
    redirectTo?: string;
    expiresAt: string;
  };
}

interface DatabaseFile {
  workspaces: Record<string, WorkspaceRecord>;
}

const STORAGE_DIR = path.join(process.cwd(), ".data");
const STORAGE_FILE = path.join(STORAGE_DIR, "guest-workspaces.json");
const STORAGE_LOCK_DIR = path.join(STORAGE_DIR, "guest-workspaces.lock");
const LOCK_STALE_MS = 30_000;
const CLUSTER_DISTANCE = 1000;

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

function createEmptyNote(): NotebookEntry {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    title: "Notebook Entry",
    canvas: createDefaultCanvas(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function touchWorkspace(workspace: Workspace) {
  workspace.lastUpdated = nowIso();
}

function cloneWorkspaceRecord(record: WorkspaceRecord): WorkspaceRecord {
  return {
    workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    runs: JSON.parse(JSON.stringify(record.runs)) as RunRecord[],
    shipJobs: JSON.parse(JSON.stringify(record.shipJobs)) as ShipJobRecord[],
    githubAuth: record.githubAuth
      ? (JSON.parse(JSON.stringify(record.githubAuth)) as WorkspaceRecord["githubAuth"])
      : undefined,
    githubOAuthState: record.githubOAuthState
      ? (JSON.parse(
          JSON.stringify(record.githubOAuthState)
        ) as WorkspaceRecord["githubOAuthState"])
      : undefined,
  };
}

async function loadDb(): Promise<DatabaseFile> {
  try {
    const raw = await readFile(STORAGE_FILE, "utf8");
    return JSON.parse(raw) as DatabaseFile;
  } catch {
    return { workspaces: {} };
  }
}

async function saveDb(db: DatabaseFile) {
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(STORAGE_FILE, JSON.stringify(db, null, 2), "utf8");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function acquireFileLock() {
  await mkdir(STORAGE_DIR, { recursive: true });
  const started = Date.now();

  while (true) {
    try {
      await mkdir(STORAGE_LOCK_DIR);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") {
        throw error;
      }

      try {
        const lockStat = await stat(STORAGE_LOCK_DIR);
        if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
          await rm(STORAGE_LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        // Lock was released before stat/rm; retry acquisition.
      }

      if (Date.now() - started > LOCK_STALE_MS * 2) {
        throw new Error("workspace-file-lock-timeout");
      }
      await sleep(20);
    }
  }
}

async function releaseFileLock() {
  await rm(STORAGE_LOCK_DIR, { recursive: true, force: true });
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = lock;
  let release!: () => void;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    await acquireFileLock();
    return await fn();
  } finally {
    await releaseFileLock();
    release();
  }
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return `${text.length}:${Math.abs(hash)}`;
}

function distance(a: NotebookBlock, b: NotebookBlock): number {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.hypot(ax - bx, ay - by);
}

function normalizeBlocks(blocks: NotebookBlock[]): NotebookBlock[] {
  return blocks.map((block) => ({
    id: block.id || crypto.randomUUID(),
    x: Number.isFinite(block.x) ? block.x : 0,
    y: Number.isFinite(block.y) ? block.y : 0,
    w: Number.isFinite(block.w) ? Math.max(220, block.w) : 420,
    h: Number.isFinite(block.h) ? Math.max(140, block.h) : 220,
    content: String(block.content ?? ""),
    updatedAt: block.updatedAt ?? nowIso(),
    areaId: block.areaId,
  }));
}

function assignAreas(blocksInput: NotebookBlock[]): {
  blocks: NotebookBlock[];
  areas: NotebookArea[];
} {
  const blocks = normalizeBlocks(blocksInput);
  const nonEmpty = blocks.filter((block) => block.content.trim().length > 0);

  if (nonEmpty.length === 0) {
    return {
      blocks: blocks.map((block) => ({ ...block, areaId: undefined })),
      areas: [],
    };
  }

  const visited = new Set<string>();
  const usedAreaIds = new Set<string>();
  const components: NotebookBlock[][] = [];

  for (const block of nonEmpty) {
    if (visited.has(block.id)) continue;

    const queue = [block];
    const component: NotebookBlock[] = [];
    visited.add(block.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      for (const candidate of nonEmpty) {
        if (visited.has(candidate.id)) continue;
        if (distance(current, candidate) <= CLUSTER_DISTANCE) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      }
    }

    components.push(component);
  }

  const nextBlocks = [...blocks];
  const areas: NotebookArea[] = [];

  for (const component of components) {
    const counts = new Map<string, number>();
    for (const block of component) {
      if (!block.areaId) continue;
      counts.set(block.areaId, (counts.get(block.areaId) ?? 0) + 1);
    }

    const preferred = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .find((id) => !usedAreaIds.has(id));

    const areaId = preferred ?? crypto.randomUUID();
    usedAreaIds.add(areaId);

    let sumX = 0;
    let sumY = 0;
    for (const block of component) {
      sumX += block.x + block.w / 2;
      sumY += block.y + block.h / 2;
      const idx = nextBlocks.findIndex((candidate) => candidate.id === block.id);
      if (idx >= 0) {
        nextBlocks[idx] = {
          ...nextBlocks[idx],
          areaId,
        };
      }
    }

    areas.push({
      id: areaId,
      blockIds: component.map((block) => block.id),
      centroid: {
        x: sumX / component.length,
        y: sumY / component.length,
      },
    });
  }

  for (let i = 0; i < nextBlocks.length; i += 1) {
    if (!nextBlocks[i].content.trim()) {
      nextBlocks[i] = {
        ...nextBlocks[i],
        areaId: undefined,
      };
    }
  }

  return { blocks: nextBlocks, areas };
}

function ensureNormalizedWorkspace(workspace: Workspace): Workspace {
  const notebooks = Array.isArray(workspace.notebooks)
    ? workspace.notebooks.map((entry) => {
        const normalized = normalizeNotebookEntry(entry);
        const assigned = assignAreas(normalized.canvas.blocks);
        return {
          ...normalized,
          canvas: {
            viewport: normalized.canvas.viewport ?? createDefaultViewport(),
            blocks: assigned.blocks,
            areas: assigned.areas,
          },
        };
      })
    : [];

  return {
    ...workspace,
    notebooks,
    extractedIdeas: Array.isArray(workspace.extractedIdeas)
      ? workspace.extractedIdeas
      : [],
    projects: Array.isArray(workspace.projects) ? workspace.projects : [],
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
      shipJobs: [],
      githubAuth: undefined,
      githubOAuthState: undefined,
    };
  }

  db.workspaces[workspaceId].workspace = ensureNormalizedWorkspace(
    db.workspaces[workspaceId].workspace
  );
  db.workspaces[workspaceId].runs = Array.isArray(db.workspaces[workspaceId].runs)
    ? db.workspaces[workspaceId].runs
    : [];
  db.workspaces[workspaceId].shipJobs = Array.isArray(
    db.workspaces[workspaceId].shipJobs
  )
    ? db.workspaces[workspaceId].shipJobs
    : [];
  if (
    db.workspaces[workspaceId].githubOAuthState &&
    (!db.workspaces[workspaceId].githubOAuthState.value ||
      !db.workspaces[workspaceId].githubOAuthState.expiresAt)
  ) {
    db.workspaces[workspaceId].githubOAuthState = undefined;
  }
  if (
    db.workspaces[workspaceId].githubAuth &&
    !db.workspaces[workspaceId].githubAuth.accessToken
  ) {
    db.workspaces[workspaceId].githubAuth = undefined;
  }

  return { db, record: db.workspaces[workspaceId] };
}

function getOrCreateNote(record: WorkspaceRecord, noteId?: string): NotebookEntry {
  const targetId = noteId ?? record.workspace.notebooks[0]?.id ?? crypto.randomUUID();
  const existing = record.workspace.notebooks.find((entry) => entry.id === targetId);
  if (existing) return existing;

  const note = {
    ...createEmptyNote(),
    id: targetId,
  };
  record.workspace.notebooks.unshift(note);
  return note;
}

function applyPatches(note: NotebookEntry, patches: NotePatch[]) {
  let viewport = note.canvas.viewport ?? createDefaultViewport();
  let blocks = normalizeBlocks(note.canvas.blocks ?? []);

  for (const patch of patches) {
    if (patch.op === "upsert_block") {
      const incoming = normalizeBlocks([
        { ...patch.block, updatedAt: nowIso() },
      ])[0];
      const idx = blocks.findIndex((block) => block.id === incoming.id);
      if (idx >= 0) blocks[idx] = incoming;
      else blocks.push(incoming);
      continue;
    }

    if (patch.op === "delete_block") {
      blocks = blocks.filter((block) => block.id !== patch.blockId);
      continue;
    }

    if (patch.op === "set_viewport") {
      viewport = {
        x: Number.isFinite(patch.viewport.x) ? patch.viewport.x : 0,
        y: Number.isFinite(patch.viewport.y) ? patch.viewport.y : 0,
        zoom: Number.isFinite(patch.viewport.zoom)
          ? Math.min(2.5, Math.max(0.4, patch.viewport.zoom))
          : 1,
      };
      continue;
    }

    if (patch.op === "replace_blocks") {
      blocks = normalizeBlocks(patch.blocks);
      continue;
    }

    if (patch.op === "set_canvas") {
      viewport = patch.canvas.viewport ?? createDefaultViewport();
      blocks = normalizeBlocks(patch.canvas.blocks ?? []);
    }
  }

  const areas = assignAreas(blocks);
  note.canvas = {
    viewport,
    blocks: areas.blocks,
    areas: areas.areas,
  };
  note.updatedAt = nowIso();
}

function getAreaText(note: NotebookEntry, areaId: string): string {
  return note.canvas.blocks
    .filter((block) => block.areaId === areaId && block.content.trim())
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
    .map((block) => block.content.trim())
    .join("\n\n");
}

function buildAreaSummaries(
  note: NotebookEntry,
  runs: RunRecord[],
  projects: Project[]
): AreaSummary[] {
  return note.canvas.areas.map((area) => {
    const latestRun = runs
      .filter((run) => run.noteId === note.id && run.areaId === area.id)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
    const linkedProject = projects.find(
      (project) => project.noteId === note.id && project.areaId === area.id
    );

    const preview = getAreaText(note, area.id).replace(/\s+/g, " ").slice(0, 90);
    const status: AreaSummaryStatus =
      latestRun?.status ?? (linkedProject ? "ready" : "idle");

    return {
      id: area.id,
      blockIds: area.blockIds,
      centroid: area.centroid,
      preview,
      status,
      runId: latestRun?.id,
      projectId: latestRun?.projectId ?? linkedProject?.id,
    };
  });
}

const ACTIVE_SHIP_STATUSES: ShipJobStatus[] = [
  "queued",
  "planning",
  "scaffolding",
  "implementing",
  "testing",
  "publishing",
];

function isActiveShipStatus(status: ShipJobStatus): boolean {
  return ACTIVE_SHIP_STATUSES.includes(status);
}

function touchProjectShipping(
  project: Project,
  status: ShipJobStatus,
  jobId: string
) {
  project.shipStatus = status;
  project.shipJobId = jobId;
  project.shipUpdatedAt = nowIso();
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

export async function saveNotePatches(
  workspaceId: string,
  patches: NotePatch[],
  noteId?: string
): Promise<{
  note: NotebookEntry;
  workspace: Workspace;
  areaSummaries: AreaSummary[];
}> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const note = getOrCreateNote(record, noteId);
    applyPatches(note, patches);
    touchWorkspace(record.workspace);
    await saveDb(db);

    return {
      note: JSON.parse(JSON.stringify(note)) as NotebookEntry,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
      areaSummaries: buildAreaSummaries(note, record.runs, record.workspace.projects),
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

export async function getLatestNote(workspaceId: string): Promise<NotebookEntry | null> {
  const { workspace } = await getWorkspaceRecord(workspaceId);
  return workspace.notebooks[0] ?? null;
}

export async function getAreaSummaries(workspaceId: string): Promise<AreaSummary[]> {
  const record = await getWorkspaceRecord(workspaceId);
  const note = record.workspace.notebooks[0];
  if (!note) return [];
  return buildAreaSummaries(note, record.runs, record.workspace.projects);
}

export async function createRun(
  workspaceId: string,
  noteId: string,
  areaId: string
): Promise<{
  run: RunRecord;
  alreadyActive: boolean;
  skipped: boolean;
  workspace: Workspace;
}> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const note = record.workspace.notebooks.find((entry) => entry.id === noteId);

    if (!note) {
      throw new Error("note-not-found");
    }

    const areaText = getAreaText(note, areaId);
    const contentHash = hashText(areaText);

    const active = record.runs.find(
      (run) =>
        run.noteId === noteId &&
        run.areaId === areaId &&
        (run.status === "queued" ||
          run.status === "threading" ||
          run.status === "specing" ||
          run.status === "planning")
    );

    if (active) {
      return {
        run: JSON.parse(JSON.stringify(active)) as RunRecord,
        alreadyActive: true,
        skipped: false,
        workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
      };
    }

    const latestReady = record.runs.find(
      (run) =>
        run.noteId === noteId &&
        run.areaId === areaId &&
        run.status === "ready" &&
        run.contentHash === contentHash
    );
    if (latestReady) {
      return {
        run: JSON.parse(JSON.stringify(latestReady)) as RunRecord,
        alreadyActive: false,
        skipped: true,
        workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
      };
    }

    const run: RunRecord = {
      id: crypto.randomUUID(),
      noteId,
      areaId,
      contentHash,
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
      skipped: false,
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
    const existingForArea = record.workspace.projects.find(
      (entry) => entry.noteId === run.noteId && entry.areaId === run.areaId
    );
    const projectWithMeta: Project = {
      ...project,
      id: projectId,
      noteId: run.noteId,
      areaId: run.areaId,
      shipStatus: existingForArea?.shipStatus ?? "idle",
      shipJobId: existingForArea?.shipJobId,
      shipUpdatedAt: existingForArea?.shipUpdatedAt,
      latestPrototypeUrl: existingForArea?.latestPrototypeUrl,
      latestPrototypeSummary: existingForArea?.latestPrototypeSummary,
      latestPullRequestUrl: existingForArea?.latestPullRequestUrl,
    };

    record.workspace.extractedIdeas = ideas;
    record.workspace.projects = [
      projectWithMeta,
      ...record.workspace.projects.filter(
        (existing) =>
          !(
            existing.noteId === projectWithMeta.noteId &&
            existing.areaId === projectWithMeta.areaId
          ) && existing.id !== projectWithMeta.id
      ),
    ];

    run.status = "ready";
    run.projectId = projectWithMeta.id;
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

export async function getAreaTextForRun(
  workspaceId: string,
  runId: string
): Promise<{ run: RunRecord; text: string } | null> {
  const record = await getWorkspaceRecord(workspaceId);
  const run = record.runs.find((item) => item.id === runId);
  if (!run) return null;
  const note = record.workspace.notebooks.find((entry) => entry.id === run.noteId);
  if (!note) return null;
  const text = getAreaText(note, run.areaId);
  return { run, text };
}

export async function setGitHubOAuthState(
  workspaceId: string,
  state: string,
  redirectTo?: string
): Promise<void> {
  await withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    record.githubOAuthState = {
      value: state,
      redirectTo,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    await saveDb(db);
  });
}

export async function consumeGitHubOAuthState(
  workspaceId: string,
  state: string
): Promise<{ redirectTo?: string } | null> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const existing = record.githubOAuthState;
    record.githubOAuthState = undefined;
    await saveDb(db);

    if (!existing) return null;
    if (existing.value !== state) return null;
    if (+new Date(existing.expiresAt) < Date.now()) return null;
    return { redirectTo: existing.redirectTo };
  });
}

export async function saveWorkspaceGitHubAuth(
  workspaceId: string,
  auth: {
    accessToken: string;
    tokenType?: string;
    scope?: string;
    login?: string;
  }
) {
  await withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    record.githubAuth = {
      accessToken: auth.accessToken,
      tokenType: auth.tokenType,
      scope: auth.scope,
      login: auth.login,
      connectedAt: nowIso(),
    };
    await saveDb(db);
  });
}

export async function clearWorkspaceGitHubAuth(workspaceId: string): Promise<void> {
  await withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    record.githubAuth = undefined;
    await saveDb(db);
  });
}

export async function getWorkspaceGitHubAuth(workspaceId: string): Promise<{
  login?: string;
  scope?: string;
  tokenType?: string;
  connectedAt?: string;
  hasToken: boolean;
}> {
  const record = await getWorkspaceRecord(workspaceId);
  const auth = record.githubAuth;
  return {
    login: auth?.login,
    scope: auth?.scope,
    tokenType: auth?.tokenType,
    connectedAt: auth?.connectedAt,
    hasToken: Boolean(auth?.accessToken),
  };
}

export async function getWorkspaceGitHubToken(
  workspaceId: string
): Promise<string | null> {
  const record = await getWorkspaceRecord(workspaceId);
  const workspaceToken = record.githubAuth?.accessToken?.trim();
  if (workspaceToken) return workspaceToken;
  const fallbackToken = process.env.GITHUB_TOKEN?.trim();
  return fallbackToken || null;
}

export async function createShipJob(
  workspaceId: string,
  projectId: string,
  issueIds: string[]
): Promise<{
  job: ShipJobRecord;
  alreadyActive: boolean;
  workspace: Workspace;
}> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const project = record.workspace.projects.find((entry) => entry.id === projectId);
    if (!project) {
      throw new Error("project-not-found");
    }

    const active = record.shipJobs.find(
      (job) => job.projectId === projectId && isActiveShipStatus(job.status)
    );
    if (active) {
      return {
        job: JSON.parse(JSON.stringify(active)) as ShipJobRecord,
        alreadyActive: true,
        workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
      };
    }

    const normalizedIssueIds =
      issueIds.length > 0
        ? issueIds
        : project.generatedIssues.map((issue) => issue.id).slice(0, 6);
    const timestamp = nowIso();
    const job: ShipJobRecord = {
      id: crypto.randomUUID(),
      projectId,
      issueIds: normalizedIssueIds,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      logs: [
        {
          id: crypto.randomUUID(),
          at: timestamp,
          level: "info",
          message: "Ship job queued. Building implementation brief from spec and plan.",
        },
      ],
    };

    record.shipJobs.unshift(job);
    touchProjectShipping(project, "queued", job.id);
    touchWorkspace(record.workspace);
    await saveDb(db);

    return {
      job: JSON.parse(JSON.stringify(job)) as ShipJobRecord,
      alreadyActive: false,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    };
  });
}

export async function getShipJobById(
  workspaceId: string,
  jobId: string
): Promise<{ job: ShipJobRecord | null; workspace: Workspace }> {
  const record = await getWorkspaceRecord(workspaceId);
  return {
    job: record.shipJobs.find((entry) => entry.id === jobId) ?? null,
    workspace: record.workspace,
  };
}

export async function getShipJobContext(
  workspaceId: string,
  jobId: string
): Promise<{ job: ShipJobRecord; project: Project } | null> {
  const record = await getWorkspaceRecord(workspaceId);
  const job = record.shipJobs.find((entry) => entry.id === jobId);
  if (!job) return null;
  const project = record.workspace.projects.find((entry) => entry.id === job.projectId);
  if (!project) return null;
  return { job, project };
}

export async function updateShipJob(
  workspaceId: string,
  jobId: string,
  status: ShipJobStatus,
  extras?: {
    level?: "info" | "warn" | "error";
    message?: string;
    error?: string;
    branchName?: string;
    pullRequestUrl?: string;
    prototypeUrl?: string;
    summary?: string;
  }
): Promise<ShipJobRecord | null> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const job = record.shipJobs.find((entry) => entry.id === jobId);
    if (!job) return null;

    const project = record.workspace.projects.find(
      (entry) => entry.id === job.projectId
    );
    if (!project) return null;

    const timestamp = nowIso();
    job.status = status;
    job.updatedAt = timestamp;
    if (!job.startedAt && status !== "queued") {
      job.startedAt = timestamp;
    }
    if (status === "ready" || status === "failed" || status === "canceled") {
      job.completedAt = timestamp;
    }
    if (extras?.error) {
      job.error = extras.error.slice(0, 500);
    }
    if (extras?.branchName) {
      job.branchName = extras.branchName;
    }
    if (extras?.pullRequestUrl) {
      job.pullRequestUrl = extras.pullRequestUrl;
      project.latestPullRequestUrl = extras.pullRequestUrl;
    }
    if (extras?.prototypeUrl) {
      job.prototypeUrl = extras.prototypeUrl;
      project.latestPrototypeUrl = extras.prototypeUrl;
    }
    if (extras?.summary) {
      job.summary = extras.summary;
      project.latestPrototypeSummary = extras.summary;
    }
    if (extras?.message) {
      job.logs.unshift({
        id: crypto.randomUUID(),
        at: timestamp,
        level: extras.level ?? "info",
        message: extras.message,
      });
      job.logs = job.logs.slice(0, 80);
    }

    touchProjectShipping(project, status, job.id);
    touchWorkspace(record.workspace);
    await saveDb(db);

    return JSON.parse(JSON.stringify(job)) as ShipJobRecord;
  });
}

export async function failShipJob(
  workspaceId: string,
  jobId: string,
  errorMessage: string
): Promise<ShipJobRecord | null> {
  return updateShipJob(workspaceId, jobId, "failed", {
    level: "error",
    message: `Ship job failed: ${errorMessage.slice(0, 180)}`,
    error: errorMessage,
  });
}

export async function updateProjectRepository(
  workspaceId: string,
  projectId: string,
  repository: string
): Promise<{ project: Project; workspace: Workspace } | null> {
  return withLock(async () => {
    const { db, record } = await ensureWorkspaceRecordInternal(workspaceId);
    const project = record.workspace.projects.find((entry) => entry.id === projectId);
    if (!project) return null;

    project.repository = repository.trim() || undefined;
    touchWorkspace(record.workspace);
    await saveDb(db);

    return {
      project: JSON.parse(JSON.stringify(project)) as Project,
      workspace: JSON.parse(JSON.stringify(record.workspace)) as Workspace,
    };
  });
}
