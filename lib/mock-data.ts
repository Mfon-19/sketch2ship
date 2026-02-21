export interface ExtractedIdea {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  taskCount?: number;
  needsInput?: boolean;
}

export interface SpecItem {
  id: string;
  title: string;
  description: string;
  status: "verified" | "pending";
  linkedNote?: number;
  inferred?: boolean;
  notExplicitlyMentioned?: boolean;
}

export interface SpecSection {
  id: string;
  title: string;
  icon: "blue" | "orange" | "red";
  items: SpecItem[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge: "AI" | "AG";
  time?: string;
  status?: "ready";
  priority?: "high";
  dependencyLabel?: string;
}

export interface Milestone {
  id: string;
  title: string;
  time: string;
  tasks: Task[];
  priority?: string;
}

export interface GeneratedIssue {
  id: string;
  number?: number;
  title: string;
  description: string;
  tags: string[];
  selected?: boolean;
}

export interface PRLatestChange {
  path: string;
  additions: number;
  deletions: number;
  lines: string[];
}

export interface PRItem {
  id: string;
  number: number;
  title: string;
  status: "in_progress" | "review" | "merged";
  agent: string;
  updatedAt: string;
  progress?: number;
  summary?: string;
  eventCode?: string;
  latestChange?: PRLatestChange;
}

export interface AcceptanceCriterion {
  id: string;
  title: string;
  description: string;
  status: "pass" | "working" | "pending";
  checked: boolean;
}

export interface AgentLog {
  time: string;
  source: string;
  message: string;
  tone?: "normal" | "muted" | "highlight" | "thinking";
}
