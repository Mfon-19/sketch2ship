"use client";

import Link from "next/link";
import {
  Bell,
  BookMarked,
  CalendarDays,
  Network,
} from "lucide-react";
import { useState } from "react";
import { MilestoneCard } from "@/components/roadmap/MilestoneCard";
import { NotebookInsight } from "@/components/roadmap/NotebookInsight";
import { GitHubSyncSidebar } from "@/components/roadmap/GitHubSyncSidebar";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { cn } from "@/lib/utils";

interface RoadmapPageContentProps {
  projectId: string;
}

export function RoadmapPageContent({ projectId }: RoadmapPageContentProps) {
  const { workspace, isLoading } = useWorkspace();
  const [view, setView] = useState<"roadmap" | "graph">("roadmap");
  const project = workspace?.projects.find((p) => p.id === projectId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Project not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f9f9f7]">
      <header className="flex h-20 items-center justify-between border-b border-[#dcd7ce] px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-[#2f2d2a] bg-white text-[#2f2d2a]">
            <BookMarked className="h-4 w-4" />
          </div>
          <h2 className="font-serif text-[1.65rem] font-bold text-[#2f2d2a]">
            Sketch2Ship
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-end gap-8">
          <nav className="hidden items-center gap-8 font-serif text-sm md:flex">
            <Link className="italic text-[#66615a] transition hover:text-[#2f2d2a]" href="/">
              Dashboard
            </Link>
            <Link
              className="border-b border-[#2f2d2a] pb-1 font-semibold text-[#2f2d2a]"
              href={`/projects/${projectId}/roadmap`}
            >
              Projects
            </Link>
            <Link className="italic text-[#66615a] transition hover:text-[#2f2d2a]" href="/">
              Notebook
            </Link>
          </nav>
          <button className="relative rounded-full p-2 text-[#66615a] transition hover:bg-[#ece8df] hover:text-[#2f2d2a]">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#2f2d2a]" />
          </button>
          <div className="flex items-center gap-2 rounded-md px-1 py-1 transition hover:bg-[#ece8df]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2f2d2a] bg-[#2f2d2a] text-xs font-serif font-bold text-white">
              JD
            </div>
            <span className="hidden font-serif text-sm text-[#2f2d2a] sm:block">
              John Doe
            </span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="paper-grid relative min-h-0 flex-1 overflow-auto bg-[#f9f9f7]">
          <div className="px-10 pb-12 pt-10">
            <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-sm text-[#66615a]">
              <Link className="hover:underline" href="/projects">
                Projects
              </Link>
              <span>/</span>
              <span>{project.name}</span>
              <span>/</span>
              <span className="rounded-sm border border-[#2f2d2a] bg-white px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-[#2f2d2a]">
                Spec Approved
              </span>
            </div>

            <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h1 className="font-serif text-6xl font-bold tracking-tight text-[#2f2d2a]">
                  Spec to Shipping
                </h1>
                <p className="my-2 max-w-3xl border-l-2 border-[#2f2d2a] pl-4 font-editor text-[2rem] italic text-[#57524b]">
                  AI has analyzed your messy notes and generated a weekend-friendly
                  execution plan.
                </p>
              </div>
              <div className="flex self-start rounded border border-[#d5d1c8] bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setView("roadmap")}
                  className={cn(
                    "flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition",
                    view === "roadmap"
                      ? "bg-[#2f2d2a] text-white"
                      : "text-[#67625b] hover:bg-[#f1ede5] hover:text-[#2f2d2a]"
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Roadmap
                </button>
                <button
                  type="button"
                  onClick={() => setView("graph")}
                  className={cn(
                    "flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition",
                    view === "graph"
                      ? "bg-[#2f2d2a] text-white"
                      : "text-[#67625b] hover:bg-[#f1ede5] hover:text-[#2f2d2a]"
                  )}
                >
                  <Network className="h-4 w-4" />
                  Graph
                </button>
              </div>
            </div>

            <NotebookInsight />

            {view === "roadmap" ? (
              <div className="mt-10 space-y-9">
                {project.milestones.map((milestone, index) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    isLast={index === project.milestones.length - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 flex h-[420px] items-center justify-center rounded-xl border border-dashed border-[#d4cfc5] bg-white/70 text-[#6f6b64]">
                Dependency graph view is coming soon.
              </div>
            )}
          </div>
        </main>

        <GitHubSyncSidebar project={project} />
      </div>
    </div>
  );
}
