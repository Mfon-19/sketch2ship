"use client";

import Link from "next/link";
import {
  Bell,
  BookOpenText,
  ChevronRight,
  Download,
  RefreshCcw,
  Search,
  Share2,
} from "lucide-react";
import { SourceNotesPanel } from "@/components/spec/SourceNotesPanel";
import { LiveSpecPanel } from "@/components/spec/LiveSpecPanel";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

interface SpecPageContentProps {
  projectId: string;
}

export function SpecPageContent({ projectId }: SpecPageContentProps) {
  const { workspace, isLoading } = useWorkspace();
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
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#fdfbf7]">
      <header className="flex h-16 items-center justify-between border-b border-black/20 bg-[#171717] px-6 text-white">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/10">
              <BookOpenText className="h-4 w-4" />
            </div>
            <span className="font-serif text-[1.1rem] font-bold">Sketch2Ship</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link className="text-white/70 transition hover:text-white" href="/">
              Dashboard
            </Link>
            <Link className="border-b border-white/40 pb-0.5 text-white" href="/projects">
              Projects
            </Link>
            <Link className="text-white/70 transition hover:text-white" href="/mission-control">
              Tasks
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              className="h-9 w-64 rounded-md border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
              placeholder="Search..."
            />
          </label>
          <button className="rounded-md p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-medium">
            JD
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-[#dfd9cf] bg-[#fdfbf7] px-6 py-3">
        <div className="flex items-center gap-3 text-sm">
          <nav className="flex items-center font-serif text-[#6a665f]">
            <Link className="transition hover:text-[#2f2d2a]" href="/">
              Workspace
            </Link>
            <ChevronRight className="mx-1 h-4 w-4 opacity-50" />
            <Link
              className="transition hover:text-[#2f2d2a]"
              href={`/projects/${projectId}/roadmap`}
            >
              {project.name}
            </Link>
            <ChevronRight className="mx-1 h-4 w-4 opacity-50" />
            <span className="font-semibold text-[#2f2d2a]">Live Spec</span>
          </nav>
          <span className="h-4 w-px bg-[#d1cbc0]" />
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            In Progress
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs italic text-[#7b766e] sm:block">
            Last synced 2m ago
          </span>
          <button className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8d2c8] bg-white px-3 text-xs font-medium text-[#2f2d2a] transition hover:bg-[#f5f1e9]">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d8d2c8] bg-white px-3 text-xs font-medium text-[#2f2d2a] transition hover:bg-[#f5f1e9]">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button className="inline-flex h-8 items-center gap-1 rounded-md bg-[#1a1a1a] px-3 text-xs font-medium text-white transition hover:bg-black">
            <RefreshCcw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="h-1/2 min-h-[22rem] w-full shrink-0 lg:h-auto lg:w-[45%]">
          <SourceNotesPanel sourceNote={project.sourceNote} />
        </div>
        <div className="min-h-0 flex-1">
          <LiveSpecPanel specSections={project.specSections} />
        </div>
      </main>
    </div>
  );
}
