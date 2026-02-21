import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { getRunById } from "@/lib/server/workspace-db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const { id } = await context.params;
  const { run, workspace } = await getRunById(workspaceId, id);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    workspaceId,
    run,
    workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
