"use client";

import Link from "next/link";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { FolderOpen } from "lucide-react";

export default function ProjectsPage() {
  const { workspace, isLoading } = useWorkspace();
  const projects = workspace?.projects ?? [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <FolderOpen className="h-12 w-12 text-zinc-300" />
        <h1 className="text-xl font-semibold text-zinc-900">No projects yet</h1>
        <p className="max-w-sm text-center text-zinc-600">
          Write your ideas in the notebook and wait for generation to produce a
          full project spec and ship plan.
        </p>
        <Link
          href="/"
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Go to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-6">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Projects</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}/spec`}
            className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <h2 className="font-medium text-zinc-900">{project.name}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {project.milestones.length} milestones ·{" "}
              {project.generatedIssues.length} issues
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
