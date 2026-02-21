"use client";

import { Upload, MoreHorizontal } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NotebookEditor } from "@/components/notebook/NotebookEditor";
import { ExtractedIdeasPanel } from "@/components/ideas/ExtractedIdeasPanel";
import { RefineNotesButton } from "@/components/notebook/RefineNotesButton";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

function formatLongDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${d.toLocaleDateString("en-US", {
    month: "long",
  })} ${day}${suffix}, ${d.getFullYear()}`;
}

export function NotebookPageContent() {
  const { workspace, isLoading, updateWorkspace } = useWorkspace();

  const currentEntry = workspace?.notebooks[0] ?? null;
  const currentDate = useMemo(
    () => (currentEntry ? formatLongDate(currentEntry.createdAt) : ""),
    [currentEntry]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentEntry) return;

      updateWorkspace((w) => ({
        ...w,
        notebooks: w.notebooks.map((n) =>
          n.id === currentEntry.id
            ? { ...n, content, updatedAt: new Date().toISOString() }
            : n
        ),
      }));
    },
    [currentEntry, updateWorkspace]
  );

  if (isLoading || !currentEntry) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fcf9f2] text-[#33312d]">
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-20 items-center justify-between border-b border-[#e5dfd3] bg-[#fcf9f2] px-10">
          <div className="flex items-end gap-4">
            <h1 className="font-serif text-5xl font-bold leading-none tracking-tight">
              Daily Log
            </h1>
            <span className="pb-1 font-editor text-xl italic text-[#a49f97]">
              {currentDate}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-2 text-xs italic text-[#9f998f]">Saved</span>
            <button
              type="button"
              className="rounded-full p-2 text-[#9f998f] transition hover:bg-[#f1ece2] hover:text-[#393734]"
              aria-label="Share"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full p-2 text-[#9f998f] transition hover:bg-[#f1ece2] hover:text-[#393734]"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto px-10 pb-28 pt-6">
            <div className="mx-auto max-w-4xl">
              <NotebookEditor
                content={currentEntry.content}
                onChange={handleContentChange}
              />
            </div>
          </div>
        </div>

        <RefineNotesButton
          className="left-auto right-[22rem] translate-x-0"
          content={currentEntry.content}
          onRefineComplete={(ideas, project) => {
            updateWorkspace((w) => {
              const projects = w.projects.filter((p) => p.id !== "refined");
              return {
                ...w,
                extractedIdeas: ideas,
                projects: [{ ...project, id: "refined", prItems: [] }, ...projects],
              };
            });
          }}
        />
      </section>

      <aside className="hidden w-[380px] shrink-0 border-l border-[#e3ddd2] bg-white lg:flex">
        <ExtractedIdeasPanel />
      </aside>
    </div>
  );
}
