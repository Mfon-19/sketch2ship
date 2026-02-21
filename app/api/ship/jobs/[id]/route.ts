import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { getShipJobById } from "@/lib/server/workspace-db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const { id } = await context.params;
  const { job, workspace } = await getShipJobById(workspaceId, id);

  if (!job) {
    return NextResponse.json({ error: "Ship job not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    workspaceId,
    job,
    workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
