import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { updateProjectRepository } from "@/lib/server/workspace-db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const { id } = await context.params;
  const body = (await request.json()) as { repository?: string };
  const repository = typeof body.repository === "string" ? body.repository : "";

  const result = await updateProjectRepository(workspaceId, id, repository);
  if (!result) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    workspaceId,
    project: result.project,
    workspace: result.workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
