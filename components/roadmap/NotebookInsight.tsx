"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export function NotebookInsight() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative flex items-start gap-5 rounded border border-[#2f2d2a] bg-white p-5 shadow-[4px_4px_0_rgba(0,0,0,0.05)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2f2d2a] bg-white text-[#2f2d2a]">
        <Sparkles className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-serif text-[1.35rem] font-bold text-[#2f2d2a]">
          Notebook Insight
        </h3>
        <p className="mt-1 max-w-3xl text-[1.05rem] text-[#615d57]">
          Tasks are grouped by tech stack (Frontend vs Backend) to minimize
          mental overhead. Weekend slots are capped at 4 hours to prevent burnout.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-4 rounded p-1 text-[#8a857d] transition hover:bg-[#f3eee6] hover:text-[#2f2d2a]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
