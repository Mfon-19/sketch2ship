import { AlertTriangle, CheckCircle2, Clock3, MoreHorizontal, Quote, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpecItem } from "@/lib/mock-data";

interface SpecCardProps {
  item: SpecItem;
  sectionIcon: "blue" | "orange" | "red";
}

const accentColor = {
  blue: "hover:border-indigo-200",
  orange: "hover:border-orange-200",
  red: "hover:border-rose-200",
};

const idPill = {
  REQ: "border-indigo-100 bg-indigo-50 text-indigo-600",
  CON: "border-orange-100 bg-orange-50 text-orange-600",
  RSK: "border-rose-100 bg-rose-50 text-rose-600",
};

export function SpecCard({ item, sectionIcon }: SpecCardProps) {
  const prefix = item.id.slice(0, 3) as keyof typeof idPill;

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-[#e3ddd2] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition",
        accentColor[sectionIcon],
        item.notExplicitlyMentioned && "border-l-4 border-l-amber-400"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded border px-2 py-0.5 font-mono text-[11px] font-medium",
              idPill[prefix] ?? "border-[#ddd7cd] bg-[#f4f1ea] text-[#6f6a62]"
            )}
          >
            {item.id}
          </span>
          <h4 className="text-2xl font-semibold text-[#2f2d2a]">{item.title}</h4>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            className="rounded-md p-1 text-[#89847b] transition hover:bg-[#eef3ff] hover:text-indigo-600"
            title="Trace to note"
          >
            <Send className="h-4 w-4" />
          </button>
          <button className="rounded-md p-1 text-[#89847b] transition hover:bg-[#f3efe7] hover:text-[#2f2d2a]">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-4 text-lg leading-relaxed text-[#615d56]">{item.description}</p>

      <div className="flex flex-wrap items-center gap-4 border-t border-[#f1ede5] pt-3 text-xs">
        {item.status === "verified" ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600">
            <Clock3 className="h-3.5 w-3.5" />
            Pending Review
          </span>
        )}

        {item.linkedNote && (
          <span className="inline-flex items-center gap-1 italic text-[#807b73]">
            <Quote className="h-3.5 w-3.5" />
            Linked to Note #{item.linkedNote}
          </span>
        )}

        {item.inferred && (
          <span className="rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
            Inferred
          </span>
        )}
      </div>

      {item.notExplicitlyMentioned && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs italic text-[#766f66]">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Not explicitly mentioned in source
        </div>
      )}
    </article>
  );
}
