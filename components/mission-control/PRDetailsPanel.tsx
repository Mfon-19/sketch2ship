"use client";

import {
  CheckCircle2,
  Circle,
  FileText,
  Hammer,
  PencilLine,
  TestTube2,
  Upload,
} from "lucide-react";
import { AcceptanceCriteria } from "./AcceptanceCriteria";
import { LiveAgentLogs } from "./LiveAgentLogs";
import type { PRItem, AcceptanceCriterion, AgentLog } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type PRWithDetails = PRItem & {
  acceptanceCriteria?: AcceptanceCriterion[];
  agentLogs?: AgentLog[];
};

interface PRDetailsPanelProps {
  selectedPr: PRWithDetails | undefined;
}

const steps = [
  { id: "spec", label: "Spec", icon: CheckCircle2, status: "done" as const },
  { id: "coding", label: "Coding", icon: Circle, status: "current" as const },
  { id: "testing", label: "Testing", icon: TestTube2, status: "todo" as const },
  { id: "review", label: "Review", icon: Upload, status: "todo" as const },
];

export function PRDetailsPanel({ selectedPr }: PRDetailsPanelProps) {
  if (!selectedPr) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-[#77736b]">No PR selected</div>
      </div>
    );
  }

  const acceptanceCriteria = selectedPr.acceptanceCriteria ?? [];
  const logs = selectedPr.agentLogs ?? [];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#fdfbf7]">
      <div className="border-b border-[#dfdbd2] px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="max-w-3xl text-[3.2rem] font-semibold leading-[1.1] text-[#2f2d2a]">
              PR #{selectedPr.number}: {selectedPr.title}
            </h1>
            {selectedPr.summary && (
              <p className="mt-4 max-w-3xl text-[1.2rem] leading-relaxed text-[#5f5a53]">
                {selectedPr.summary}{" "}
                {selectedPr.eventCode && (
                  <code className="rounded border border-[#ded8cf] bg-[#f3efe7] px-1.5 py-0.5 font-mono text-sm">
                    {selectedPr.eventCode}
                  </code>
                )}
                .
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button className="inline-flex h-12 items-center gap-2 rounded-md border border-[#d7d2c8] bg-white px-4 text-sm font-medium text-[#2f2d2a] transition hover:bg-[#f3efe7]">
              <FileText className="h-4 w-4" />
              Spec
            </button>
            <button className="inline-flex h-12 items-center gap-2 rounded-md border border-[#d7d2c8] bg-white px-4 text-sm font-medium text-[#2f2d2a] transition hover:bg-[#f3efe7]">
              <PencilLine className="h-4 w-4" />
              Revise
            </button>
            <button className="inline-flex h-12 items-center gap-2 rounded-md border border-[#d7d2c8] bg-white px-4 text-sm font-medium text-red-700 transition hover:border-red-200 hover:bg-red-50">
              <Hammer className="h-4 w-4" />
              Take Over
            </button>
            <button className="inline-flex h-12 items-center gap-2 rounded-md bg-[#2f2d2a] px-6 text-sm font-medium text-white transition hover:bg-black">
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </button>
          </div>
        </div>

        <div className="mt-10 flex w-full max-w-5xl items-center">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      step.status === "done" && "bg-[#3e7b58] text-white",
                      step.status === "current" &&
                        "bg-[#2f2d2a] text-white ring-4 ring-[#f0ece4]",
                      step.status === "todo" && "bg-[#e4e1db] text-[#9a958d]"
                    )}
                  >
                    {step.status === "current" ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      step.status === "current"
                        ? "font-semibold text-[#2f2d2a]"
                        : "font-medium text-[#7f7a72]"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-4 h-px flex-1",
                      step.status === "done"
                        ? "bg-[#86af90]"
                        : "bg-[#ddd8cf]"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-10 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <AcceptanceCriteria criteria={acceptanceCriteria} />

          {selectedPr.latestChange && (
            <div>
              <h3 className="mb-3 border-b border-[#dfdbd2] pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6e6961]">
                Latest Change
              </h3>
              <div className="overflow-hidden rounded-md border border-[#ddd8cf] shadow-sm">
                <div className="flex items-center justify-between border-b border-[#ddd8cf] bg-[#f0ede6] px-4 py-2 text-xs">
                  <span className="font-mono text-[#3f3b36]">
                    {selectedPr.latestChange.path}
                  </span>
                  <span className="font-mono">
                    <span className="text-[#3e7b58]">
                      +{selectedPr.latestChange.additions}
                    </span>{" "}
                    <span className="text-red-500">
                      -{selectedPr.latestChange.deletions}
                    </span>
                  </span>
                </div>
                <div className="overflow-x-auto bg-white p-4 font-mono text-[13px] leading-relaxed text-[#4a463f]">
                  {selectedPr.latestChange.lines.map((line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className={cn(
                        line.startsWith("+") &&
                          "mx-[-1rem] border-l-2 border-[#3e7b58] bg-[#e6f4ea] px-4 text-[#2f7248]",
                        line.startsWith("-") &&
                          "mx-[-1rem] border-l-2 border-red-400 bg-red-50 px-4 text-red-700",
                        line.trim() === "" && "h-4"
                      )}
                    >
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <LiveAgentLogs logs={logs} />
    </section>
  );
}
