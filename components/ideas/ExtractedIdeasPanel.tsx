"use client";

import { WandSparkles, SlidersHorizontal, Cloud } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IdeaCard } from "./IdeaCard";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useState } from "react";

export function ExtractedIdeasPanel() {
  const { workspace } = useWorkspace();
  const ideas = workspace?.extractedIdeas ?? [];
  const [selectedId, setSelectedId] = useState(ideas[0]?.id ?? null);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex h-20 items-center justify-between border-b border-[#eeeadf] px-6">
        <div className="flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-[#2f2d2a]" />
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#2f2d2a]">
            Extracted Ideas
          </h2>
        </div>
        <button
          type="button"
          className="rounded-md p-2 text-[#9d988f] transition hover:bg-[#f4efe5] hover:text-[#2f2d2a]"
          aria-label="Filter"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 bg-[#fcfaf6]">
        <div className="space-y-5 p-6">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              selected={selectedId === idea.id}
              onClick={() => setSelectedId(idea.id)}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-[#eeeadf] px-5 py-4 text-xs">
        <span className="text-[#8f8a81]">
          AI Model: <span className="text-[#56514a]">GPT-4o</span>
        </span>
        <span className="flex items-center gap-1 text-[#56514a]">
          <Cloud className="h-3.5 w-3.5" />
          Synced
        </span>
      </div>
    </div>
  );
}
