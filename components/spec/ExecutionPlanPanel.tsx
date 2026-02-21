"use client";

import { useState } from "react";
import { CalendarDays, Network } from "lucide-react";
import type { Project } from "@/lib/workspace-store";
import { MilestoneCard } from "@/components/roadmap/MilestoneCard";
import { NotebookInsight } from "@/components/roadmap/NotebookInsight";
import { GitHubSyncSidebar } from "@/components/roadmap/GitHubSyncSidebar";
import { cn } from "@/lib/utils";

interface ExecutionPlanPanelProps {
  project: Project;
}

export function ExecutionPlanPanel({ project }: ExecutionPlanPanelProps) {
  const [view, setView] = useState<"roadmap" | "graph">("roadmap");

  return (
    <div className="flex h-full min-h-0">
      <main className="paper-grid min-h-0 flex-1 overflow-auto bg-[#f9f9f7]">
        <div className="px-8 pb-10 pt-8">
          <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-5xl font-bold tracking-tight text-[#2f2d2a]">
                Spec to Shipping
              </h2>
              <p className="my-2 max-w-3xl border-l-2 border-[#2f2d2a] pl-4 font-editor text-[1.75rem] italic text-[#57524b]">
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

      <GitHubSyncSidebar
        project={project}
        className="hidden h-full w-[360px] shrink-0 border-l border-[#d8d3ca] bg-white lg:flex xl:w-[390px]"
      />
    </div>
  );
}
