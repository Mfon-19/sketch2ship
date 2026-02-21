import { GoogleGenAI } from "@google/genai";
import type {
  ExtractedIdea,
  GeneratedIssue,
  Milestone,
  SpecSection,
} from "@/lib/mock-data";
import type { Project, SourceNote } from "@/lib/workspace-store";

export interface RefineResponse {
  ideas: ExtractedIdea[];
  project: {
    name: string;
    sourceNote: SourceNote;
    specSections: SpecSection[];
    milestones: Milestone[];
    generatedIssues: GeneratedIssue[];
  };
}

const REFINE_PROMPT = `You are a project planning assistant. Given raw notes from a daily log, extract distinct project ideas and produce a full project specification for the primary (most important) idea.

Output a single JSON object with this exact structure (no markdown, no code fences):
{
  "ideas": [
    {
      "id": "string (unique)",
      "category": "ENGINEERING | OPS | DESIGN | PRODUCT | OTHER",
      "title": "string",
      "description": "string",
      "status": "string (e.g. 'Needs Input' or 'N tasks')",
      "taskCount": number (optional)
    }
  ],
  "project": {
    "name": "string (project name)",
    "sourceNote": {
      "title": "string",
      "date": "string (ISO date or readable)",
      "recordedBy": "string (or 'User')",
      "highlights": ["string"],
      "aiNote": "string (optional)"
    },
    "specSections": [
      {
        "id": "string",
        "title": "string (e.g. FUNCTIONAL REQUIREMENTS)",
        "icon": "blue | orange | red",
        "items": [
          {
            "id": "string (e.g. REQ-101)",
            "title": "string",
            "description": "string",
            "status": "verified | pending",
            "linkedNote": number (optional),
            "inferred": boolean (optional),
            "notExplicitlyMentioned": boolean (optional)
          }
        ]
      }
    ],
    "milestones": [
      {
        "id": "string",
        "title": "string",
        "time": "string (e.g. 'Saturday • 4h est.')",
        "tasks": [
          {
            "id": "string",
            "title": "string",
            "description": "string",
            "icon": "folder | database | shield | form | api | terminal | login",
            "badge": "AI | AG",
            "time": "string (optional)",
            "status": "ready (optional)",
            "priority": "high (optional)"
          }
        ]
      }
    ],
    "generatedIssues": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "tags": ["string"]
      }
    ]
  }
}

Extract all distinct ideas from the notes. For the project, focus on the primary idea (first or most prominent). Infer categories, create traceable requirements, and produce realistic milestones with tasks.`;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function fallbackRefine(content: string): RefineResponse {
  const plain = stripHtml(content);
  const headline = plain.split(/[.!?]/).find((sentence) => sentence.trim())?.trim();
  const projectName =
    headline?.slice(0, 50).replace(/\s+/g, " ") || "Notebook Project";

  return {
    ideas: [
      {
        id: "idea-primary",
        category: "PRODUCT",
        title: projectName,
        description: "Primary idea extracted from notebook notes.",
        status: "4 tasks",
        taskCount: 4,
      },
      {
        id: "idea-open",
        category: "OPS",
        title: "Unresolved Questions",
        description: "Follow-ups and open decisions extracted from notes.",
        status: "Needs Input",
        needsInput: true,
      },
    ],
    project: {
      name: projectName,
      sourceNote: {
        title: "Notebook Capture",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        recordedBy: "You",
        highlights: [plain.slice(0, 240)],
        aiNote:
          "Fallback mode generated this spec because GEMINI_API_KEY is unavailable.",
      },
      specSections: [
        {
          id: "functional",
          title: "FUNCTIONAL REQUIREMENTS",
          icon: "blue",
          items: [
            {
              id: "REQ-101",
              title: "Core User Flow",
              description:
                "The solution must deliver the primary user flow described in notebook notes from start to finish.",
              status: "verified",
            },
            {
              id: "REQ-102",
              title: "Primary Integration",
              description:
                "Integrations mentioned in notes must be implemented with a minimal happy-path first.",
              status: "pending",
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
              title: "MVP Timebox",
              description:
                "Scope is constrained to a weekend-friendly MVP with no more than two milestones.",
              status: "verified",
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
              title: "Unclear Requirements",
              description:
                "Some requirements are implied and may need confirmation before implementation starts.",
              status: "pending",
              inferred: true,
              notExplicitlyMentioned: true,
            },
          ],
        },
      ],
      milestones: [
        {
          id: "ms-1",
          title: "Milestone 1: Foundation",
          time: "Saturday • 4h est.",
          priority: "HIGH PRIORITY",
          tasks: [
            {
              id: "FE-101",
              title: "Scaffold App",
              description:
                "Set up project structure and base tooling for implementation.",
              icon: "terminal",
              badge: "AI",
              time: "1.5h",
            },
            {
              id: "BE-201",
              title: "Define Data Shape",
              description:
                "Map notebook requirements into data models and API interfaces.",
              icon: "database",
              badge: "AI",
              time: "1.5h",
            },
          ],
        },
        {
          id: "ms-2",
          title: "Milestone 2: User Flow",
          time: "Sunday • 3h est.",
          tasks: [
            {
              id: "FE-102",
              title: "Build Primary Flow UI",
              description:
                "Implement core interaction flow and user-facing screens.",
              icon: "login",
              badge: "AG",
              status: "ready",
            },
          ],
        },
      ],
      generatedIssues: [
        {
          id: "issue-1",
          title: "Initialize MVP workspace",
          description: "Create baseline structure and essential dependencies.",
          tags: ["enhancement", "P1"],
          number: 1,
        },
        {
          id: "issue-2",
          title: "Implement core flow",
          description: "Ship the notebook-defined happy path end to end.",
          tags: ["product"],
          number: 2,
        },
      ],
    },
  };
}

export async function refineNotebook(content: string): Promise<RefineResponse> {
  const plainText = stripHtml(content);
  if (!plainText) {
    throw new Error("Content is required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackRefine(content);
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `${REFINE_PROMPT}\n\n---\n\nNotes:\n${plainText}`,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from model");
  }

  const parsed = JSON.parse(text) as RefineResponse;
  if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
    throw new Error("Invalid response: missing ideas array");
  }
  if (!parsed.project || typeof parsed.project !== "object") {
    throw new Error("Invalid response: missing project");
  }

  if (!parsed.project.specSections) parsed.project.specSections = [];
  if (!parsed.project.milestones) parsed.project.milestones = [];
  if (!parsed.project.generatedIssues) parsed.project.generatedIssues = [];
  if (!parsed.project.sourceNote) {
    parsed.project.sourceNote = {
      title: "Refined from notes",
      date: new Date().toISOString().slice(0, 10),
      recordedBy: "User",
      highlights: [],
    };
  }

  return parsed;
}

export function toProject(result: RefineResponse): Project {
  return {
    id: crypto.randomUUID(),
    name: result.project.name,
    sourceNote: result.project.sourceNote,
    specSections: result.project.specSections,
    milestones: result.project.milestones,
    generatedIssues: result.project.generatedIssues,
    prItems: [],
  };
}
