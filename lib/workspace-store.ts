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

export interface NotebookEntry {
  id: string;
  title: string;
  content: string;
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

    return JSON.parse(raw) as Workspace;
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
