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

function generateId(): string {
  return (
    crypto.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function createSeededWorkspace(): Workspace {
  const notebookContent = `
<p>Start thinking about the new mobile auth flow... needs to be passwordless. Maybe magic links or biometrics first?</p>
<ul>
  <li>Need to email Sarah about the <mark>Stripe API keys</mark> for the dev environment.</li>
  <li>Check the analytics for drop-off rates on the current login screen. It feels clunky.</li>
  <li>Competitor research: Look at how Linear does their magic link auth. It's super fast.</li>
</ul>
<p><strong>INSIGHT:</strong> We could use a QR code on desktop to log in via mobile app instantly. "Scan to Login".</p>
<p>Also, regarding the dashboard redesign:</p>
<ul>
  <li>The sidebar needs better contrast.</li>
  <li>Add a dark mode toggle visible on the main screen? Or keep it in settings?</li>
</ul>
<p><em>Typing...</em></p>`.trim();

  const sourceNote: SourceNote = {
    title: "Meeting Notes: Backend Architecture",
    date: "Oct 12, 2023",
    recordedBy: "Alex",
    highlights: [
      "We need the engine to support at least 500 concurrent users without degradation.",
      "It needs to run on AWS Lambda for cost savings and automatic scaling.",
      "Oh, and make sure we encrypt data at rest using AES-256 standards.",
      "The primary database should be Postgres, managed via RDS.",
    ],
    blocks: [
      {
        id: 1,
        before:
          "Initial thoughts on the new backend system. We really need to focus on scalability from day one.",
        highlight:
          "We need the engine to support at least 500 concurrent users without degradation.",
      },
      {
        id: 2,
        before:
          "Regarding infrastructure, we want to avoid managing servers directly.",
        highlight:
          "It needs to run on AWS Lambda for cost savings and automatic scaling.",
        after: "The devops team is already set up for this workflow.",
      },
      {
        id: 3,
        before: "Security is obviously paramount given the client list.",
        highlight:
          "Oh, and make sure we encrypt data at rest using AES-256 standards.",
      },
      {
        id: 4,
        before: "Database choice:",
        highlight: "The primary database should be Postgres, managed via RDS.",
        after:
          "We might need Redis for caching later, but let's stick to the basics for MVP.",
      },
    ],
    aiNote:
      "Mentioned potential need for Redis, but marked as non-requirement for MVP phase.",
  };

  const specSections: SpecSection[] = [
    {
      id: "functional",
      title: "FUNCTIONAL REQUIREMENTS",
      icon: "blue",
      items: [
        {
          id: "REQ-101",
          title: "System Scalability",
          description:
            "The system must maintain performance stability with a minimum load of 500 concurrent users. Response time should remain under 200ms at p95.",
          status: "verified",
          linkedNote: 1,
        },
        {
          id: "REQ-102",
          title: "Data Storage",
          description:
            "Primary persistence layer must utilize PostgreSQL managed via AWS RDS.",
          status: "pending",
          linkedNote: 4,
        },
      ],
    },
    {
      id: "constraints",
      title: "TECHNICAL CONSTRAINTS",
      icon: "orange",
      items: [
        {
          id: "CON-201",
          title: "Deployment Environment",
          description:
            "Deployment target is restricted to AWS Lambda serverless environment to optimize for variable costs.",
          status: "verified",
          linkedNote: 2,
        },
        {
          id: "CON-202",
          title: "Security Compliance",
          description:
            "All data at rest must be encrypted using AES-256 standard.",
          status: "verified",
          linkedNote: 3,
        },
      ],
    },
    {
      id: "risks",
      title: "RISKS & ASSUMPTIONS",
      icon: "red",
      items: [
        {
          id: "RSK-301",
          title: "Cold Start Latency",
          description:
            "Assumption: Lambda cold starts will be mitigated via Provisioned Concurrency, impacting cost estimates.",
          status: "pending",
          inferred: true,
          notExplicitlyMentioned: true,
        },
      ],
    },
  ];

  const milestones: Milestone[] = [
    {
      id: "milestone-1",
      title: "Milestone 1: Core MVP",
      time: "Saturday • 4h est.",
      priority: "HIGH PRIORITY",
      tasks: [
        {
          id: "FE-101",
          title: "Setup Next.js Repo",
          description:
            "Initialize project with TypeScript, ESLint, and Tailwind CSS configuration.",
          icon: "terminal",
          badge: "AI",
          time: "1h",
          priority: "high",
        },
        {
          id: "BE-201",
          title: "Configure Supabase",
          description:
            "Set up project, enable Row Level Security (RLS), and generate types.",
          icon: "database",
          badge: "AI",
          time: "1.5h",
        },
        {
          id: "BE-202",
          title: "Auth Schema",
          description:
            "Design user profiles table and trigger functions for new signups.",
          icon: "shield",
          badge: "AG",
          status: "ready",
          dependencyLabel: "dependency_graph_v1.svg",
        },
      ],
    },
    {
      id: "milestone-2",
      title: "Milestone 2: User Flows",
      time: "Sunday • 3h est.",
      tasks: [
        {
          id: "FE-102",
          title: "Build Login Form",
          description:
            "Implement ShadCN UI form components with Zod validation.",
          icon: "login",
          badge: "AI",
          time: "2h",
        },
        {
          id: "BE-203",
          title: "Dashboard API",
          description: "Create endpoints for fetching user specific data.",
          icon: "api",
          badge: "AI",
          time: "1h",
        },
      ],
    },
  ];

  const generatedIssues: GeneratedIssue[] = [
    {
      id: "issue-1",
      number: 1,
      title: "Setup project structure",
      description: "Initialize Next.js 14 app directory...",
      tags: ["enhancement", "P1"],
      selected: true,
    },
    {
      id: "issue-2",
      number: 2,
      title: "Database Schema: Auth",
      description: "Create 'profiles' table extending auth.users...",
      tags: ["database"],
    },
    {
      id: "issue-3",
      number: 3,
      title: "Component: Login Form",
      description: "React Hook Form + Zod + ShadCN UI...",
      tags: [],
    },
    {
      id: "issue-4",
      number: 4,
      title: "Magic Link Token Service",
      description: "Issue and rotate one-time sign-in tokens...",
      tags: ["backend"],
    },
    {
      id: "issue-5",
      number: 5,
      title: "Analytics Event Instrumentation",
      description: "Track auth drop-off and conversion events...",
      tags: ["product"],
    },
  ];

  const prItems: Project["prItems"] = [
    {
      id: "pr-405",
      number: 405,
      title: "Implement Stripe Webhooks",
      status: "in_progress",
      agent: "Agent-Beta",
      updatedAt: "2m ago",
      progress: 66,
      summary:
        "Agent-Beta is currently implementing webhook signature verification and event handling for",
      eventCode: "checkout.session.completed",
      latestChange: {
        path: "src/api/webhooks.ts",
        additions: 12,
        deletions: 2,
        lines: [
          "  import { stripe } from '../lib/stripe';",
          "  import { buffer } from 'micro';",
          "",
          "+ export const config = {",
          "+   api: {",
          "+     bodyParser: false,",
          "+   },",
          "+ };",
          "",
          "  export default async function handler(req, res) {",
        ],
      },
      acceptanceCriteria: [
        {
          id: "acc-1",
          title: "Verify Stripe Signature",
          description:
            "Ensure middleware validates `Stripe-Signature` header against the webhook secret.",
          status: "pass",
          checked: true,
        },
        {
          id: "acc-2",
          title: "Handle checkout.session.completed",
          description:
            "Update user subscription status in database upon successful payment.",
          status: "working",
          checked: false,
        },
        {
          id: "acc-3",
          title: "Idempotency Checks",
          description:
            "Ensure duplicate webhook events do not trigger double provisioning.",
          status: "pending",
          checked: false,
        },
      ],
      agentLogs: [
        {
          time: "10:42:01",
          source: "Agent-Beta",
          message:
            "Found existing user model. Proceeding to create subscription schema...",
          tone: "muted",
        },
        {
          time: "10:42:05",
          source: "Agent-Beta",
          message: "Running `npm install stripe @types/stripe` in background.",
          tone: "muted",
        },
        {
          time: "10:42:12",
          source: "Agent-Beta",
          message: "Generating webhook handler boilerplate...",
        },
        {
          time: "10:42:15",
          source: "System",
          message: "Checking for linting errors...",
          tone: "muted",
        },
        {
          time: "10:42:18",
          source: "Agent-Beta",
          message:
            "Detected raw body requirement for Stripe signature verification.",
        },
        {
          time: "10:42:19",
          source: "Agent-Beta",
          message: "> Modifying API config to disable default body parser.",
          tone: "highlight",
        },
        {
          time: "10:42:21",
          source: "Thinking",
          message:
            "Validating next step: Should I implement the failure handler now or after happy path?",
          tone: "thinking",
        },
      ],
    },
    {
      id: "pr-402",
      number: 402,
      title: "Refactor Auth Middleware",
      status: "review",
      agent: "Agent-Alpha",
      updatedAt: "45m ago",
    },
    {
      id: "pr-406",
      number: 406,
      title: "Fix Login Race Condition",
      status: "merged",
      agent: "Agent-Gamma",
      updatedAt: "2h ago",
    },
  ];

  const project: Project = {
    id: "saas-mvp",
    name: "SaaS MVP",
    sourceNote,
    specSections,
    milestones,
    generatedIssues,
    prItems,
    repository: "johndoe/sketch-mvp",
    milestoneConfig: {
      title: '"v1.0 MVP Launch"',
      dueOn: "2023-11-20T00:00:00Z",
      state: '"open"',
    },
    tokenEstimate: "4.2k",
    eta: "~2 mins",
  };

  return {
    id: generateId(),
    version: 1,
    lastUpdated: new Date().toISOString(),
    notebooks: [
      {
        id: "daily-log-2023-10-24",
        title: "Daily Log",
        content: notebookContent,
        createdAt: "2023-10-24T09:00:00.000Z",
        updatedAt: "2023-10-24T09:08:00.000Z",
      },
    ],
    extractedIdeas: [
      {
        id: "idea-auth",
        category: "ENGINEERING",
        title: "Mobile Auth Flow",
        description:
          "Revamp the login process to include passwordless options and magic links.",
        status: "3 tasks",
        taskCount: 3,
      },
      {
        id: "idea-ops",
        category: "OPS",
        title: "API Key Management",
        description:
          "Coordination with Sarah regarding Stripe keys for dev environment setup.",
        status: "Needs Input",
        needsInput: true,
      },
      {
        id: "idea-design",
        category: "DESIGN",
        title: "Dashboard Redesign",
        description:
          "Improving sidebar contrast and exploring dark mode toggles.",
        status: "2 tasks",
        taskCount: 2,
      },
    ],
    projects: [project],
  };
}

export function getWorkspace(): Workspace {
  if (typeof window === "undefined") {
    return createSeededWorkspace();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const seeded = createSeededWorkspace();
      saveWorkspace(seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw) as Workspace;
    return parsed;
  } catch {
    const seeded = createSeededWorkspace();
    saveWorkspace(seeded);
    return seeded;
  }
}

export function saveWorkspace(workspace: Workspace): void {
  if (typeof window === "undefined") return;

  const updated = {
    ...workspace,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateWorkspace(
  updater: (workspace: Workspace) => Workspace
): Workspace {
  const current = getWorkspace();
  const next = updater(current);
  saveWorkspace(next);
  return next;
}
