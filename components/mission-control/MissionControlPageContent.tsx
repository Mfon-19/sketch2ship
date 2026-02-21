"use client";

import Link from "next/link";
import { Bell, BookCopy, Search } from "lucide-react";
import { useState } from "react";
import { ActiveQueuePanel } from "./ActiveQueuePanel";
import { PRDetailsPanel } from "./PRDetailsPanel";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";

export function MissionControlPageContent() {
  const { workspace, isLoading } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const prItems = workspace?.projects.flatMap((project) => project.prItems) ?? [];
  const selectedPr = prItems.find((p) => p.id === selectedId) ?? prItems[0];
  const effectiveSelectedId = selectedId ?? prItems[0]?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#fdfbf7]">
      <header className="flex h-20 items-center justify-between border-b border-[#e0dcd3] bg-[#fdfbf7] px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d8d3ca] bg-[#f3efe7] text-[#333333]">
              <BookCopy className="h-4 w-4" />
            </div>
            <h1 className="font-serif text-[1.8rem] font-semibold text-[#2f2d2a]">
              Sketch2Ship <span className="font-normal text-[#706b63]">Workspace</span>
            </h1>
          </div>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link
              href="/mission-control"
              className="border-b-2 border-[#2f2d2a] pb-1 font-medium text-[#2f2d2a]"
            >
              Mission Control
            </Link>
            <Link href="/mission-control" className="font-medium text-[#746f67] hover:text-[#2f2d2a]">
              Agent Fleet
            </Link>
            <Link href="/mission-control" className="font-medium text-[#746f67] hover:text-[#2f2d2a]">
              Knowledge Base
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8b83]" />
            <input
              className="h-10 w-64 rounded-md border border-[#dcd7ce] bg-white pl-10 pr-3 text-sm text-[#2f2d2a] placeholder:text-[#9f9a92] focus:border-[#2f2d2a] focus:outline-none"
              placeholder="Search notebook..."
            />
          </label>
          <button className="relative rounded-md p-2 text-[#7d7870] transition hover:bg-[#f0ece4] hover:text-[#2f2d2a]">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-red-400" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cfc9be] bg-[#e4e1db] text-xs font-bold text-[#6f6a62]">
            JD
          </div>
        </div>
      </header>

      <div className="min-h-0 flex flex-1 overflow-hidden">
        <ActiveQueuePanel
          prItems={prItems}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
        />
        <PRDetailsPanel selectedPr={selectedPr} />
      </div>
    </div>
  );
}
