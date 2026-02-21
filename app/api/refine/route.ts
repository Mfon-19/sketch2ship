import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  ExtractedIdea,
  SpecSection,
  Milestone,
  GeneratedIssue,
} from "@/lib/mock-data";
import type { SourceNote } from "@/lib/workspace-store";

interface RefineResponse {
  ideas: ExtractedIdea[];
  project: {
    name: string;
    sourceNote: SourceNote;
    specSections: SpecSection[];
    milestones: Milestone[];
    generatedIssues: GeneratedIssue[];
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
            "icon": "folder | database | shield | form | api",
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

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured. Add it to .env.local" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { content } = body as { content?: string };

    const plainText = content
      ? stripHtml(String(content))
      : "";
    if (!plainText) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(text) as RefineResponse;

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return NextResponse.json(
        { error: "Invalid response: missing ideas array" },
        { status: 500 }
      );
    }
    if (!parsed.project || typeof parsed.project !== "object") {
      return NextResponse.json(
        { error: "Invalid response: missing project" },
        { status: 500 }
      );
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

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message.includes("403") || message.includes("API key")
        ? 403
        : message.includes("429")
          ? 429
          : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
