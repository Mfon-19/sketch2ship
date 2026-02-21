"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bolt,
  Check,
  FolderOpen,
  Settings,
  Timer,
} from "lucide-react";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import type { ShipJobResponse, ShipJobRecord, ShipStartResponse } from "@/lib/notebook-types";
import type { Project, ShipJobStatus, Workspace } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

interface GitHubSyncSidebarProps {
  project: Project;
  className?: string;
}

interface GitHubStatusResponse {
  connected: boolean;
  login?: string;
  error?: string;
  source?: "workspace-oauth" | "server-token" | "none";
  connectUrl?: string;
}

const ACTIVE_SHIP_STATUSES: ShipJobStatus[] = [
  "queued",
  "planning",
  "scaffolding",
  "implementing",
  "testing",
  "publishing",
];

const SHIP_STATUS_LABEL: Record<ShipJobStatus | "idle", string> = {
  idle: "Idle",
  queued: "Queued",
  planning: "Planning",
  scaffolding: "Scaffolding",
  implementing: "Implementing",
  testing: "Testing",
  publishing: "Publishing",
  ready: "Prototype Ready",
  failed: "Failed",
  canceled: "Canceled",
};

export function GitHubSyncSidebar({
  project,
  className,
}: GitHubSyncSidebarProps) {
  const { updateWorkspace } = useWorkspace();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(
    () =>
      new Set(
        project.generatedIssues
          .filter((issue) => issue.selected)
          .map((issue) => issue.id)
      )
  );
  const [shipJob, setShipJob] = useState<ShipJobRecord | null>(null);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState(project.repository ?? "");
  const [repoSaving, setRepoSaving] = useState(false);
  const [repoMessage, setRepoMessage] = useState<string | null>(null);
  const [githubStatus, setGitHubStatus] = useState<GitHubStatusResponse | null>(
    null
  );

  const allSelected = selectedIssues.size === project.generatedIssues.length;
  const projectShipStatus = project.shipStatus ?? "idle";
  const hasActiveShip = ACTIVE_SHIP_STATUSES.includes(
    projectShipStatus as ShipJobStatus
  );

  const syncWorkspace = useCallback(
    (next: Workspace) => {
      updateWorkspace(() => next);
    },
    [updateWorkspace]
  );

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const connectHref = useMemo(() => {
    const base = githubStatus?.connectUrl ?? "/api/github/connect";
    return `${base}?redirect=${encodeURIComponent(currentPath)}`;
  }, [currentPath, githubStatus?.connectUrl]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIssues(new Set());
      return;
    }
    setSelectedIssues(new Set(project.generatedIssues.map((issue) => issue.id)));
  };

  const sortedIssues = useMemo(
    () =>
      project.generatedIssues
        .slice()
        .sort((a, b) => (a.number ?? 9999) - (b.number ?? 9999)),
    [project.generatedIssues]
  );

  useEffect(() => {
    setSelectedIssues(
      new Set(
        project.generatedIssues
          .filter((issue) => issue.selected)
          .map((issue) => issue.id)
      )
    );
  }, [project.generatedIssues, project.id]);

  useEffect(() => {
    setRepoInput(project.repository ?? "");
  }, [project.id, project.repository]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/github/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as GitHubStatusResponse;
        setGitHubStatus(payload);
      } catch {
        setGitHubStatus({ connected: false, error: "Unable to reach GitHub API" });
      }
    })();
  }, []);

  const refreshShipJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/ship/jobs/${jobId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ShipJobResponse;
        setShipJob(payload.job);
        syncWorkspace(payload.workspace);
      } catch {
        // suppress poll failures
      }
    },
    [syncWorkspace]
  );

  useEffect(() => {
    if (!project.shipJobId) {
      setShipJob(null);
      return;
    }
    void refreshShipJob(project.shipJobId);
  }, [project.shipJobId, refreshShipJob]);

  useEffect(() => {
    if (!project.shipJobId || !hasActiveShip) return;
    const poll = setInterval(() => {
      void refreshShipJob(project.shipJobId!);
    }, 2200);
    return () => clearInterval(poll);
  }, [hasActiveShip, project.shipJobId, refreshShipJob]);

  const onShip = async () => {
    if (githubStatus && !githubStatus.connected) {
      setShipError(githubStatus.error ?? "GitHub token is not configured.");
      return;
    }

    setShipLoading(true);
    setShipError(null);
    try {
      const response = await fetch("/api/ship/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          issueIds: [...selectedIssues],
        }),
      });
      const payload = (await response.json()) as
        | (ShipStartResponse & { error?: string })
        | { error?: string };
      if (!response.ok) {
        setShipError(payload.error ?? "Unable to start ship job");
        return;
      }

      const shipPayload = payload as ShipStartResponse;
      setShipJob(shipPayload.job);
      syncWorkspace(shipPayload.workspace);
    } catch {
      setShipError("Network error while starting ship job");
    } finally {
      setShipLoading(false);
    }
  };

  const onDisconnectGitHub = async () => {
    setRepoMessage(null);
    try {
      const response = await fetch("/api/github/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setRepoMessage("Unable to disconnect GitHub.");
        return;
      }
      setGitHubStatus({
        connected: false,
        source: "none",
        connectUrl: "/api/github/connect",
      });
      setRepoMessage("GitHub disconnected for this workspace.");
    } catch {
      setRepoMessage("Network error while disconnecting GitHub.");
    }
  };

  const onSaveRepository = async () => {
    setRepoSaving(true);
    setRepoMessage(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/repository`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: repoInput.trim() }),
      });
      const payload = (await response.json()) as
        | { workspace: Workspace; error?: string }
        | { error?: string };
      if (!response.ok) {
        setRepoMessage(payload.error ?? "Failed to save repository");
        return;
      }
      const okPayload = payload as { workspace: Workspace };
      syncWorkspace(okPayload.workspace);
      setRepoMessage("Repository saved.");
    } catch {
      setRepoMessage("Network error while saving repository.");
    } finally {
      setRepoSaving(false);
    }
  };

  const buttonLabel = shipLoading
    ? "Starting Agent..."
    : hasActiveShip
      ? "Agent Running..."
      : projectShipStatus === "ready"
        ? "Re-Ship with AI Agent"
        : "Ship with AI Agent";

  return (
    <aside
      className={cn(
        "hidden h-full w-[380px] shrink-0 flex-col border-l border-[#d8d3ca] bg-white xl:flex 2xl:w-[410px]",
        className
      )}
    >
      <div className="border-b border-[#d8d3ca] bg-[#f2eee6]/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif text-4xl font-bold text-[#2f2d2a]">
              GitHub Sync
            </span>
            <span className="rounded bg-[#2f2d2a] px-1.5 py-0.5 font-mono text-[10px] text-white">
              PREVIEW
            </span>
          </div>
          <button className="rounded p-1 text-[#8f8a82] transition hover:bg-[#f3efe7] hover:text-[#2f2d2a]">
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded border border-[#d7d1c8] bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dcd6cc] bg-[#efebe3] text-[#3e3a35]">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#77726a]">
                Repository
              </p>
              <p className="font-mono text-sm font-medium text-[#2f2d2a]">
                {project.repository ?? (githubStatus?.connected ? "Auto-created on Ship" : "Not connected")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={repoInput}
              onChange={(event) => setRepoInput(event.target.value)}
              placeholder="owner/repo"
              className="h-9 min-w-0 flex-1 rounded border border-[#d8d2c8] bg-white px-2.5 font-mono text-xs text-[#2f2d2a] focus:border-[#2f2d2a] focus:outline-none"
            />
            <button
              onClick={onSaveRepository}
              disabled={repoSaving || repoInput.trim() === (project.repository ?? "")}
              className={cn(
                "h-9 rounded px-3 text-xs font-semibold",
                repoSaving || repoInput.trim() === (project.repository ?? "")
                  ? "cursor-not-allowed border border-[#ddd7ca] bg-[#f2eee6] text-[#8b857b]"
                  : "border border-[#2f2d2a] bg-[#2f2d2a] text-white hover:bg-black"
              )}
            >
              {repoSaving ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#6a655d]">
            {githubStatus?.connected
              ? `GitHub connected${githubStatus.login ? ` as ${githubStatus.login}` : ""}.`
              : `GitHub not connected. ${githubStatus?.error ?? "Set GITHUB_TOKEN on the server."}`}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href={connectHref}
              className="rounded border border-[#d7d1c8] bg-[#f8f5ef] px-2 py-1 text-[11px] font-medium text-[#2f2d2a] hover:bg-[#f1ece3]"
            >
              {githubStatus?.connected ? "Reconnect GitHub" : "Connect GitHub"}
            </Link>
            {githubStatus?.source === "workspace-oauth" ? (
              <button
                onClick={onDisconnectGitHub}
                className="rounded border border-[#d7d1c8] bg-white px-2 py-1 text-[11px] font-medium text-[#6f695f] hover:bg-[#f7f3eb]"
              >
                Disconnect
              </button>
            ) : null}
          </div>
          {repoMessage ? (
            <p className="mt-1 text-[11px] text-[#6a655d]">{repoMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#faf9f6] p-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#2f2d2a]">
            Generated Issues ({project.generatedIssues.length})
          </span>
          <button
            onClick={toggleAll}
            className="text-xs italic text-[#5e5952] underline-offset-2 hover:underline"
          >
            Select All
          </button>
        </div>

        <div className="space-y-3">
          {sortedIssues.map((issue) => {
            const checked = selectedIssues.has(issue.id);
            return (
              <button
                key={issue.id}
                type="button"
                onClick={() =>
                  setSelectedIssues((prev) => {
                    const next = new Set(prev);
                    if (next.has(issue.id)) next.delete(issue.id);
                    else next.add(issue.id);
                    return next;
                  })
                }
                className="flex w-full items-start gap-3 rounded border border-[#d9d4ca] bg-white p-3 text-left shadow-sm transition hover:border-[#2f2d2a]"
              >
                <span className="mt-1 flex h-4 w-4 items-center justify-center rounded border border-[#2f2d2a]">
                  {checked && <Check className="h-3 w-3 text-[#2f2d2a]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-[1rem] font-medium leading-tight text-[#2f2d2a]">
                      {issue.title}
                    </span>
                    {issue.number && (
                      <span className="rounded border border-[#dad4ca] px-1 text-[10px] font-mono text-[#8d887f]">
                        #{issue.number}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block line-clamp-1 text-xs text-[#68635c]">
                    {issue.description}
                  </span>
                  {issue.tags.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {issue.tags.map((tag) => (
                        <span
                          key={`${issue.id}-${tag}`}
                          className={cn(
                            "rounded border px-1.5 py-0.5 font-mono text-[10px]",
                            tag === "database"
                              ? "border-[#b7dcb6] bg-[#ecf8eb] text-[#5f8f5e]"
                              : "border-[#d7d1c8] bg-[#f2eee6] text-[#5f5a53]"
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {project.milestoneConfig && (
          <div className="mt-8">
            <h4 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.15em] text-[#2f2d2a]">
              Milestone Config
            </h4>
            <div className="rounded border border-[#d7d1c8] bg-[#f1eee8] p-4 font-mono text-[11px] text-[#645f58] shadow-inner">
              <div>
                <span className="font-bold text-[#2f2d2a]">title:</span>{" "}
                <span className="text-[#3f7a47]">
                  {project.milestoneConfig.title}
                </span>
              </div>
              <div>
                <span className="font-bold text-[#2f2d2a]">due_on:</span>{" "}
                <span className="text-[#3663b2]">{project.milestoneConfig.dueOn}</span>
              </div>
              <div>
                <span className="font-bold text-[#2f2d2a]">state:</span>{" "}
                <span className="text-[#3f7a47]">
                  {project.milestoneConfig.state}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded border border-[#d7d1c8] bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#2f2d2a]">
              Agent Run
            </h4>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                projectShipStatus === "ready"
                  ? "bg-emerald-100 text-emerald-700"
                  : projectShipStatus === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-[#efebe3] text-[#5f5a53]"
              )}
            >
              {SHIP_STATUS_LABEL[projectShipStatus as ShipJobStatus | "idle"]}
            </span>
          </div>

          {shipError ? (
            <p className="mb-2 text-xs text-red-700">{shipError}</p>
          ) : null}

          {project.latestPrototypeSummary ? (
            <p className="mb-3 text-xs leading-5 text-[#5f5a53]">
              {project.latestPrototypeSummary}
            </p>
          ) : (
            <p className="mb-3 text-xs leading-5 text-[#5f5a53]">
              Start a background agent run to convert this plan into a working
              prototype branch and PR.
            </p>
          )}

          {shipJob?.logs?.length ? (
            <div className="mb-3 space-y-1 rounded border border-[#ece7dd] bg-[#faf8f3] p-2">
              {shipJob.logs.slice(0, 4).map((log) => (
                <p key={log.id} className="text-[11px] text-[#6b665f]">
                  {log.message}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-1 text-xs">
            {project.latestPrototypeUrl ? (
              <Link
                href={project.latestPrototypeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#2f2d2a] underline underline-offset-2"
              >
                Open latest prototype
              </Link>
            ) : null}
            {project.latestPullRequestUrl ? (
              <Link
                href={project.latestPullRequestUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#2f2d2a] underline underline-offset-2"
              >
                Open latest pull request
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-[#d8d3ca] bg-[#f2eee6]/60 p-6">
        <div className="mb-4 flex items-center justify-between font-mono text-xs text-[#625d56]">
          <span className="flex items-center gap-1">
            <Bolt className="h-3.5 w-3.5" />
            Est. Tokens: {project.tokenEstimate ?? "4.2k"}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            {project.eta ?? "~2 mins"}
          </span>
        </div>
        <button
          onClick={onShip}
          disabled={shipLoading || hasActiveShip}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold tracking-wide text-white transition",
            shipLoading || hasActiveShip
              ? "cursor-not-allowed bg-[#4d4a45]"
              : "bg-[#2f2d2a] hover:bg-black"
          )}
        >
          {buttonLabel}
          <Bolt className="h-4 w-4" />
        </button>
        <p className="mt-3 text-center text-[10px] italic text-[#6d6860]">
          By clicking ship, you agree to automate repo creation.
        </p>
      </div>
    </aside>
  );
}
