import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AcceptanceCriterion } from "@/lib/mock-data";

interface AcceptanceCriteriaProps {
  criteria: AcceptanceCriterion[];
}

const statusStyles = {
  pass: "bg-[#e6f4ea] text-[#3e7b58]",
  working: "text-[#2f2d2a]",
  pending: "text-[#a39e95]",
};

export function AcceptanceCriteria({ criteria }: AcceptanceCriteriaProps) {
  return (
    <section>
      <h3 className="mb-4 border-b border-[#dfdbd2] pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6e6961]">
        Acceptance Criteria
      </h3>
      <div className="space-y-4">
        {criteria.map((criterion) => (
          <label
            key={criterion.id}
            className={cn(
              "flex items-start gap-4 rounded-md border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
              criterion.status === "pending"
                ? "border-[#ebe7df] bg-[#f7f5f1] opacity-60"
                : "border-[#ddd8cf] bg-white"
            )}
          >
            <input
              type="checkbox"
              checked={criterion.checked}
              readOnly
              disabled={criterion.status === "pending"}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#2f2d2a]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-3xl font-medium text-[#2f2d2a]">
                {criterion.title}
              </p>
              <p className="mt-1 text-[1rem] leading-relaxed text-[#7a756d]">
                {criterion.description}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                statusStyles[criterion.status]
              )}
            >
              {criterion.status === "pass" && <Check className="h-3 w-3" />}
              {criterion.status === "working" && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f2d2a]" />
              )}
              {criterion.status === "pending" && (
                <Loader2 className="h-3 w-3" />
              )}
              {criterion.status}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
