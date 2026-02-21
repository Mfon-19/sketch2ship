import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { getActiveRun, getWorkspaceRecord } from "@/lib/server/workspace-db";

export async function GET(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const record = await getWorkspaceRecord(workspaceId);
  const activeRun = await getActiveRun(workspaceId);

  const response = NextResponse.json({
    workspaceId,
    workspace: record.workspace,
    activeRun,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
