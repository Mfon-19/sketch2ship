import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { createShipJob } from "@/lib/server/workspace-db";
import { startShipJobProcessing } from "@/lib/server/ship-processor";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const body = (await request.json()) as {
    projectId?: string;
    issueIds?: string[];
  };

  const projectId = body.projectId;
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }
  const issueIds = Array.isArray(body.issueIds)
    ? body.issueIds.filter((item): item is string => typeof item === "string")
    : [];

  try {
    const { job, alreadyActive, workspace } = await createShipJob(
      workspaceId,
      projectId,
      issueIds
    );
    if (!alreadyActive) {
      startShipJobProcessing(workspaceId, job.id);
    }

    const response = NextResponse.json({
      workspaceId,
      job,
      alreadyActive,
      workspace,
    });
    attachGuestWorkspaceCookie(response, workspaceId, isNew);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ship-start-failed";
    if (message === "project-not-found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
