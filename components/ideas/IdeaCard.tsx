import { ChevronRight, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedIdea } from "@/lib/mock-data";

interface IdeaCardProps {
  idea: ExtractedIdea;
  selected?: boolean;
  onClick?: () => void;
}

export function IdeaCard({ idea, selected, onClick }: IdeaCardProps) {
  const isNeedsInput = idea.needsInput || idea.status === "Needs Input";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_8px_18px_rgba(0,0,0,0.05)]",
        selected ? "border-[#d9d3c8]" : "border-[#e7e1d7]"
      )}
    >
      <span className="mb-3 inline-flex rounded-md bg-[#f4f1ea] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#827d75]">
        {idea.category}
      </span>

      <h3 className="text-[2rem] font-semibold leading-tight text-[#2f2d2a]">
        {idea.title}
      </h3>
      <p className="mt-3 text-lg leading-relaxed text-[#635e57]">
        {idea.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-[#ede7de] pt-3">
        {isNeedsInput ? (
          <span className="flex items-center gap-2 text-[0.95rem] text-[#817b72]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f2c744]" />
            Needs Input
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[0.95rem] text-[#8f8a82]">
            <CheckCheck className="h-4 w-4" />
            {idea.taskCount ? `${idea.taskCount} tasks` : idea.status}
          </span>
        )}
        <ChevronRight className="h-5 w-5 text-[#cbc5bc]" />
      </div>
    </button>
  );
}
