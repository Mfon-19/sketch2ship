import { Minus, TerminalSquare, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLog } from "@/lib/mock-data";

interface LiveAgentLogsProps {
  logs: AgentLog[];
}

export function LiveAgentLogs({ logs }: LiveAgentLogsProps) {
  return (
    <section className="h-72 shrink-0 border-t border-[#dfdbd2] bg-[#fdfbf7] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between border-b border-[#ddd9d0] bg-[#f4f1ea] px-4 py-2">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-[#2f2d2a]" />
          <h3 className="text-sm font-medium text-[#2f2d2a]">Live Agent Logs</h3>
          <span className="rounded bg-[#e2ded5] px-1.5 py-0.5 font-mono text-[10px] text-[#706b63]">
            TAIL -F
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#7f7a72]">
          <button className="rounded p-1 transition hover:bg-[#ebe7de] hover:text-[#2f2d2a]">
            <Minus className="h-4 w-4" />
          </button>
          <button className="rounded p-1 transition hover:bg-[#ebe7de] hover:text-[#2f2d2a]">
            <ChevronUp className="h-4 w-4" />
          </button>
          <button className="rounded p-1 transition hover:bg-[#ebe7de] hover:text-[#2f2d2a]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar h-[calc(100%-44px)] overflow-auto p-6 font-mono text-xs">
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div
              key={`${log.time}-${index}`}
              className={cn(
                "flex gap-4",
                log.tone === "muted" && "opacity-60",
                log.tone === "highlight" && "rounded bg-[#f1efea] px-2 py-2",
                log.tone === "thinking" && "mt-2"
              )}
            >
              <span className="min-w-[60px] text-[#8f8a82]">{log.time}</span>
              <span
                className={cn(
                  "font-bold",
                  log.source === "System" && "text-[#4378a6]",
                  log.source.startsWith("Agent") && "text-[#3e7b58]",
                  log.source === "Thinking" && "text-purple-700"
                )}
              >
                {log.source}
              </span>
              <span
                className={cn(
                  "text-[#4f4b45]",
                  log.source === "System" && "italic text-[#6b6760]",
                  log.tone === "highlight" && "font-bold text-[#2f2d2a]",
                  log.tone === "thinking" &&
                    "italic text-purple-600 after:ml-1 after:inline-block after:h-4 after:w-2 after:animate-pulse after:bg-purple-600 after:align-middle after:content-['']"
                )}
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
