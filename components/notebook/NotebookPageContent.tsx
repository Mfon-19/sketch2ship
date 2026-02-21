"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import type { Project, Workspace } from "@/lib/workspace-store";

type RunStatus =
  | "queued"
  | "threading"
  | "specing"
  | "planning"
  | "ready"
  | "failed";

interface RunRecord {
  id: string;
  noteId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  projectId?: string;
}

interface WorkspaceLatestResponse {
  workspace: Workspace;
  activeRun: RunRecord | null;
}

interface NoteSaveResponse {
  note: { id: string };
  workspace: Workspace;
}

interface RunResponse {
  run: RunRecord;
  workspace: Workspace;
}

const RUN_PROGRESS_LABEL: Record<RunStatus, string> = {
  queued: "Queued for processing",
  threading: "Separating distinct idea threads",
  specing: "Extracting requirements and constraints",
  planning: "Generating milestones, tasks, and cutline",
  ready: "Project package ready",
  failed: "Generation failed",
};

const ACTIVE_STATUSES: RunStatus[] = [
  "queued",
  "threading",
  "specing",
  "planning",
];

function contentFingerprint(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return `${normalized.length}:${normalized.slice(0, 80)}`;
}

function isActive(status: RunStatus) {
  return ACTIVE_STATUSES.includes(status);
}

export function NotebookPageContent() {
  const { workspace, isLoading, updateWorkspace } = useWorkspace();

  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [latestProject, setLatestProject] = useState<Project | null>(null);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [bootstrapped, setBootstrapped] = useState(false);

  const lastSavedFingerprint = useRef("");
  const lastQueuedFingerprint = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncWorkspace = useCallback(
    (next: Workspace) => {
      updateWorkspace(() => next);
      setLatestProject(next.projects[0] ?? null);
      const firstNote = next.notebooks[0];
      if (firstNote) {
        setNoteId(firstNote.id);
      }
    },
    [updateWorkspace]
  );

  const bootstrap = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/latest", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as WorkspaceLatestResponse;
      syncWorkspace(payload.workspace);

      const firstNote = payload.workspace.notebooks[0];
      if (firstNote) {
        setContent(firstNote.content);
        setNoteId(firstNote.id);
        lastSavedFingerprint.current = contentFingerprint(firstNote.content);
      }

      if (payload.activeRun) {
        setRun(payload.activeRun);
      }
    } catch {
      // keep local state when bootstrap request fails
    } finally {
      setBootstrapped(true);
    }
  }, [syncWorkspace]);

  useEffect(() => {
    if (!isLoading) {
      void bootstrap();
    }
  }, [bootstrap, isLoading]);

  const persistNote = useCallback(async (): Promise<string | null> => {
    const trimmed = content.trim();
    if (!trimmed) return noteId;

    const fingerprint = contentFingerprint(content);
    if (fingerprint === lastSavedFingerprint.current) {
      return noteId;
    }

    setSaveState("saving");
    try {
      const response = await fetch("/api/workspace/note", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          noteId: noteId ?? undefined,
        }),
      });

      if (!response.ok) {
        setSaveState("error");
        return noteId;
      }

      const payload = (await response.json()) as NoteSaveResponse;
      const savedId = payload.note.id;
      setNoteId(savedId);
      syncWorkspace(payload.workspace);
      lastSavedFingerprint.current = fingerprint;
      setSaveState("saved");
      return savedId;
    } catch {
      setSaveState("error");
      return noteId;
    }
  }, [content, noteId, syncWorkspace]);

  const queueRun = useCallback(
    async (reason: "idle" | "blur") => {
      const trimmed = content.trim();
      if (trimmed.length < 20) return;
      if (run && isActive(run.status)) return;

      const fingerprint = contentFingerprint(content);
      if (fingerprint === lastQueuedFingerprint.current) return;

      const currentNoteId = (await persistNote()) ?? noteId;
      if (!currentNoteId) return;

      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: currentNoteId,
            reason,
          }),
        });

        if (!response.ok) return;
        const payload = (await response.json()) as RunResponse;
        setRun(payload.run);
        syncWorkspace(payload.workspace);
        lastQueuedFingerprint.current = fingerprint;
      } catch {
        // non-blocking
      }
    },
    [content, noteId, persistNote, run, syncWorkspace]
  );

  useEffect(() => {
    if (!bootstrapped) return;
    if (!content.trim()) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistNote();
    }, 900);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [bootstrapped, content, persistNote]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!content.trim()) return;

    if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    queueTimerRef.current = setTimeout(() => {
      void queueRun("idle");
    }, 45_000);

    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
        queueTimerRef.current = null;
      }
    };
  }, [bootstrapped, content, queueRun]);

  useEffect(() => {
    const onBlur = () => {
      void queueRun("blur");
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [queueRun]);

  useEffect(() => {
    if (!run || !isActive(run.status)) return;

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/runs/${run.id}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as RunResponse;
        setRun(payload.run);
        syncWorkspace(payload.workspace);

        if (payload.run.status === "ready") {
          lastQueuedFingerprint.current = contentFingerprint(content);
        }
      } catch {
        // keep polling quiet on transient failures
      }
    }, 2_000);

    return () => clearInterval(poll);
  }, [content, run, syncWorkspace]);

  useEffect(() => {
    if (!bootstrapped && workspace?.notebooks?.[0]) {
      setContent(workspace.notebooks[0].content);
      setNoteId(workspace.notebooks[0].id);
      setLatestProject(workspace.projects[0] ?? null);
    }
  }, [bootstrapped, workspace]);

  const runLabel = useMemo(() => {
    if (!run) return "";
    return RUN_PROGRESS_LABEL[run.status];
  }, [run]);

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Idle";

  if (isLoading && !bootstrapped) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffdf8]">
        <Loader2 className="h-5 w-5 animate-spin text-[#6f6a63]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf8] text-[#2d2b28]">
      <div className="mx-auto max-w-4xl px-6 pb-16 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-[2.7rem] font-semibold tracking-tight">
            Notebook
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#7b766e]">
            <span>{saveLabel}</span>
            {run && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e2ddd3] bg-white px-2 py-1">
                {isActive(run.status) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {runLabel}
              </span>
            )}
          </div>
        </div>

        {latestProject && (
          <div className="mb-8 rounded-xl border border-[#e4dfd5] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="mb-2 flex items-center gap-2 text-sm text-[#66615a]">
              <Sparkles className="h-4 w-4" />
              Your latest project package is ready
            </div>
            <h2 className="font-serif text-2xl font-semibold">{latestProject.name}</h2>
            <p className="mt-2 text-sm text-[#6f6a63]">
              Spec, milestones, dependency-aware tasks, and generated issues are
              ready for review.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/projects/${latestProject.id}/spec`}
                className="rounded-md bg-[#1f1f1f] px-3 py-2 text-sm font-medium text-white transition hover:bg-black"
              >
                Open Spec
              </Link>
              <Link
                href={`/projects/${latestProject.id}/roadmap`}
                className="rounded-md border border-[#d9d4ca] bg-white px-3 py-2 text-sm font-medium text-[#2d2b28] transition hover:bg-[#f5f2ea]"
              >
                Open Roadmap
              </Link>
            </div>
          </div>
        )}

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Drop your idea here. Bullets, links, fragments, half-thoughts. Just write and walk away."
          className="min-h-[68vh] w-full resize-none border-0 bg-transparent font-editor text-[1.9rem] leading-[1.75] text-[#2f2d29] placeholder:text-[#a59f95] focus:outline-none"
        />

        <p className="mt-4 text-xs text-[#8b867e]">
          Auto-saves while you type. Auto-generates after inactivity or when you
          leave this tab.
        </p>
      </div>
    </div>
  );
}
