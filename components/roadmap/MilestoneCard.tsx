import { TaskCard } from "./TaskCard";
import type { Milestone } from "@/lib/mock-data";

interface MilestoneCardProps {
  milestone: Milestone;
  isLast?: boolean;
}

export function MilestoneCard({ milestone, isLast }: MilestoneCardProps) {
  return (
    <section className="relative pl-8">
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-[-42px] w-px border-l border-dashed border-[#2f2d2a]" />
      )}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="absolute left-0 top-1 h-6 w-6 rounded-full border-2 border-[#2f2d2a] bg-white" />
        <div className="flex flex-wrap items-center gap-4">
          <h3 className="font-serif text-4xl font-bold text-[#2f2d2a]">
            {milestone.title}
          </h3>
          <span className="rounded border border-[#d3cec4] bg-[#f0ede6] px-2 py-1 font-mono text-xs text-[#67625b]">
            {milestone.time}
          </span>
        </div>
        {milestone.priority && (
          <span className="rounded-full border border-[#d7d1c6] bg-[#fff6bc] px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-[#39352f]">
            {milestone.priority}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {milestone.tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  );
}
