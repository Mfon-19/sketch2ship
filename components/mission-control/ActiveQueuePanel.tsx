"use client";

import { Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PRItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ActiveQueuePanelProps {
  prItems: PRItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ActiveQueuePanel({
  prItems,
  selectedId,
  onSelect,
}: ActiveQueuePanelProps) {
  const runningCount = prItems.filter((p) => p.status === "in_progress").length;
  const pendingReview = prItems.filter((p) => p.status === "review").length;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-r border-[#e0dcd3] bg-[#f4f1ea]">
      <div className="border-b border-[#dfdbd2] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-[#2f2d2a]">Active Queue</h2>
          <span className="rounded bg-[#e1ddd4] px-2 py-1 font-mono text-[11px] text-[#66625a]">
            {runningCount} RUNNING
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-[#ddd8ce] bg-white p-3 shadow-sm">
            <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[#8d887f]">
              Velocity
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold text-[#2f2d2a]">
                {prItems.length} PRs
              </span>
              <span className="mb-1 text-xs font-medium text-[#4d8a5f]">↑ 15%</span>
            </div>
          </div>
          <div className="rounded-md border border-[#ddd8ce] bg-white p-3 shadow-sm">
            <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-[#8d887f]">
              Review
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold text-[#2f2d2a]">
                {pendingReview}
              </span>
              <span className="mb-1 text-xs font-medium text-[#9a6d26]">Pending</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-4">
        <div className="space-y-3">
          {prItems.map((pr) => {
            const selected = selectedId === pr.id;
            return (
              <button
                key={pr.id}
                type="button"
                onClick={() => onSelect(pr.id)}
                className={cn(
                  "group relative w-full rounded-md border p-4 text-left transition",
                  selected
                    ? "border-[#2f2d2a] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "border-[#ded9ce] bg-[#f8f6f1] hover:bg-white"
                )}
              >
                {selected && (
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-md bg-[#2f2d2a]" />
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-xs font-bold",
                        selected ? "text-[#2f2d2a]" : "text-[#7f7a72]"
                      )}
                    >
                      #{pr.number}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                        pr.status === "in_progress" && "bg-[#e3f2fd] text-[#4378a6]",
                        pr.status === "review" && "bg-[#fef7e0] text-[#9a6d26]",
                        pr.status === "merged" && "bg-[#e6f4ea] text-[#3e7b58]"
                      )}
                    >
                      {pr.status === "in_progress"
                        ? "In Progress"
                        : pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs text-[#8f8a82]">{pr.updatedAt}</span>
                </div>

                <p className="mt-2 text-[1.75rem] font-semibold leading-tight text-[#2f2d2a]">
                  {pr.title}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[#7d7870]">
                  <Bot className="h-3.5 w-3.5" />
                  {pr.agent}
                </div>

                {pr.progress !== undefined && (
                  <div className="mt-3 h-1 rounded-full bg-[#e7e2d9]">
                    <div
                      className="h-full rounded-full bg-[#2f2d2a]"
                      style={{ width: `${pr.progress}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
