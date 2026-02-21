import {
  CheckCircle2,
  Clock3,
  Database,
  FolderOpen,
  LogIn,
  ServerCog,
  ShieldCheck,
  Square,
  TerminalSquare,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/mock-data";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  terminal: TerminalSquare,
  folder: FolderOpen,
  database: Database,
  shield: ShieldCheck,
  form: Square,
  login: LogIn,
  api: ServerCog,
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const Icon = iconMap[task.icon] ?? TerminalSquare;
  const highlighted = task.status === "ready";

  return (
    <article
      className={cn(
        "group rounded border bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_10px_rgba(0,0,0,0.05)]",
        highlighted ? "border-[#9dc5a0] bg-[#f4faf4]" : "border-[#dfd9cf]"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded",
            highlighted
              ? "border border-[#cfe2d0] bg-white text-[#7aa978]"
              : "bg-[#efebe3] text-[#3c3935]"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "border-b border-dashed font-mono text-xs",
            highlighted ? "border-[#7fb879] text-[#67a163]" : "border-[#98938a] text-[#8a857d]"
          )}
        >
          #{task.id}
        </span>
      </div>

      <h4 className="font-serif text-4xl font-bold leading-tight text-[#2f2d2a] group-hover:underline">
        {task.title}
      </h4>
      <p className="mt-3 text-[1.05rem] leading-relaxed text-[#5f5b54]">
        {task.description}
      </p>

      {task.dependencyLabel && (
        <p className="mt-3 text-right font-mono text-xs italic text-[#a09a92]">
          {task.dependencyLabel}
        </p>
      )}

      <div
        className={cn(
          "mt-5 flex items-center justify-between border-t pt-4",
          highlighted ? "border-[#d8ead8]" : "border-[#e4dfd6]"
        )}
      >
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border font-serif text-[10px] font-bold",
            highlighted
              ? "border-[#2f2d2a] bg-[#c6e6c3] text-[#2f2d2a]"
              : "border-[#2f2d2a] bg-white text-[#2f2d2a]"
          )}
        >
          {task.badge}
        </div>

        {task.status === "ready" ? (
          <span className="flex items-center gap-1 text-xs text-[#4f4d49]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-xs text-[#66615a]">
            <Clock3 className="h-3.5 w-3.5" />
            {task.time}
          </span>
        )}
      </div>
    </article>
  );
}
