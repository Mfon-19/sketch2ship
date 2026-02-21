"use client";

import { useState } from "react";
import { FileCheck2, Filter, Network } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpecSection } from "./SpecSection";
import type { SpecSection as SpecSectionType } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface LiveSpecPanelProps {
  specSections: SpecSectionType[];
}

export function LiveSpecPanel({ specSections }: LiveSpecPanelProps) {
  const [view, setView] = useState<"list" | "graph">("list");

  return (
    <section className="flex h-full flex-col bg-[#fffefc]">
      <div className="flex h-20 items-center justify-between border-b border-[#e5dfd3] px-6">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-[#2f2d2a]" />
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#2f2d2a]">
            Live Specification
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-[#f5f2eb] p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition",
                view === "list"
                  ? "border border-[#ddd7ca] bg-white text-[#2f2d2a]"
                  : "text-[#736f67] hover:text-[#2f2d2a]"
              )}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("graph")}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition",
                view === "graph"
                  ? "border border-[#ddd7ca] bg-white text-[#2f2d2a]"
                  : "text-[#736f67] hover:text-[#2f2d2a]"
              )}
            >
              Graph
            </button>
          </div>
          <button
            type="button"
            className="rounded p-2 text-[#847f76] transition hover:bg-[#f5f1e9] hover:text-[#2f2d2a]"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 bg-[#fbfaf7]">
        <div className="p-8">
          {view === "list" ? (
            <div className="space-y-8">
              {specSections.map((section) => (
                <SpecSection key={section.id} section={section} />
              ))}
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-[#d8d2c8] bg-white text-[#77726a]">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Graph view is coming soon
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
