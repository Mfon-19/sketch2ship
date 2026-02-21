import type {
  ExtractedIdea,
  SpecSection,
  Milestone,
  GeneratedIssue,
  PRItem,
  AcceptanceCriterion,
  AgentLog,
} from "./mock-data";

const STORAGE_KEY = "sketch2ship_workspace";

export type ShipJobStatus =
  | "queued"
  | "planning"
  | "scaffolding"
  | "implementing"
  | "testing"
  | "publishing"
  | "ready"
  | "failed"
  | "canceled";

export interface NotebookViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface NotebookBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  updatedAt: string;
  areaId?: string;
}

export interface NotebookArea {
  id: string;
  blockIds: string[];
  centroid: {
    x: number;
    y: number;
  };
}

export interface NotebookCanvas {
  viewport: NotebookViewport;
  blocks: NotebookBlock[];
  areas: NotebookArea[];
}

export interface NotebookEntry {
  id: string;
  title: string;
  content?: string;
  canvas: NotebookCanvas;
  createdAt: string;
  updatedAt: string;
}

export interface SourceNoteBlock {
  id: number;
  before?: string;
  highlight: string;
  after?: string;
}

export interface SourceNote {
  title: string;
  date: string;
  recordedBy: string;
  highlights: string[];
  blocks?: SourceNoteBlock[];
  aiNote?: string;
}

export interface Project {
  id: string;
  name: string;
  ideaSummary?: string;
  shipStatus?: ShipJobStatus | "idle";
  shipJobId?: string;
  shipUpdatedAt?: string;
  latestPrototypeUrl?: string;
  latestPrototypeSummary?: string;
  latestPullRequestUrl?: string;
  noteId?: string;
  areaId?: string;
  specSections: SpecSection[];
  milestones: Milestone[];
  sourceNote?: SourceNote;
  generatedIssues: GeneratedIssue[];
  prItems: (PRItem & {
    acceptanceCriteria?: AcceptanceCriterion[];
    agentLogs?: AgentLog[];
  })[];
  repository?: string;
  milestoneConfig?: {
    title: string;
    dueOn: string;
    state: string;
  };
  tokenEstimate?: string;
  eta?: string;
}

export interface Workspace {
  id: string;
  version: number;
  notebooks: NotebookEntry[];
  extractedIdeas: ExtractedIdea[];
  projects: Project[];
  lastUpdated: string;
}

export function createDefaultViewport(): NotebookViewport {
  return {
    x: 0,
    y: 0,
    zoom: 1,
  };
}

export function createDefaultCanvas(): NotebookCanvas {
  return {
    viewport: createDefaultViewport(),
    blocks: [],
    areas: [],
  };
}

export function createDefaultBlock(
  overrides: Partial<NotebookBlock> = {}
): NotebookBlock {
  return {
    id: crypto.randomUUID?.() ?? `block-${Date.now()}`,
    x: 0,
    y: 0,
    w: 420,
    h: 220,
    content: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function normalizeNotebookEntry(entry: NotebookEntry): NotebookEntry {
  const hasCanvas = typeof entry.canvas === "object" && Array.isArray(entry.canvas?.blocks);
  if (hasCanvas) {
    return {
      ...entry,
      canvas: {
        viewport: {
          x: entry.canvas.viewport?.x ?? 0,
          y: entry.canvas.viewport?.y ?? 0,
          zoom: entry.canvas.viewport?.zoom ?? 1,
        },
        blocks: Array.isArray(entry.canvas.blocks)
          ? entry.canvas.blocks.map((block) => ({
              ...createDefaultBlock(),
              ...block,
            }))
          : [],
        areas: Array.isArray(entry.canvas.areas) ? entry.canvas.areas : [],
      },
    };
  }

  const legacyContent = entry.content ?? "";
  return {
    ...entry,
    canvas: {
      viewport: createDefaultViewport(),
      blocks: legacyContent.trim()
        ? [
            createDefaultBlock({
              x: 80,
              y: 80,
              w: 520,
              h: 300,
              content: legacyContent,
            }),
          ]
        : [],
      areas: [],
    },
  };
}

function createEmptyWorkspace(): Workspace {
  return {
    id: crypto.randomUUID?.() ?? `workspace-${Date.now()}`,
    version: 1,
    notebooks: [],
    extractedIdeas: [],
    projects: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function getWorkspace(): Workspace {
  if (typeof window === "undefined") {
    return createEmptyWorkspace();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const empty = createEmptyWorkspace();
      saveWorkspace(empty);
      return empty;
    }

    const parsed = JSON.parse(raw) as Workspace;
    return {
      ...parsed,
      notebooks: Array.isArray(parsed.notebooks)
        ? parsed.notebooks.map((note) => normalizeNotebookEntry(note))
        : [],
    };
  } catch {
    const empty = createEmptyWorkspace();
    saveWorkspace(empty);
    return empty;
  }
}

export function saveWorkspace(workspace: Workspace): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...workspace,
      lastUpdated: new Date().toISOString(),
    })
  );
}

export function updateWorkspace(
  updater: (workspace: Workspace) => Workspace
): Workspace {
  const current = getWorkspace();
  const next = updater(current);
  saveWorkspace(next);
  return next;
}
