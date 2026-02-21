import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { clearWorkspaceGitHubAuth } from "@/lib/server/workspace-db";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  await clearWorkspaceGitHubAuth(workspaceId);

  const response = NextResponse.json({
    workspaceId,
    disconnected: true,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
