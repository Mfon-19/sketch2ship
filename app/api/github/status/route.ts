import { NextRequest, NextResponse } from "next/server";
import {
  getGitHubConnectionStatusForToken,
  hasServerGitHubToken,
} from "@/lib/server/github-client";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import {
  getWorkspaceGitHubAuth,
  getWorkspaceGitHubToken,
} from "@/lib/server/workspace-db";

export async function GET(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const auth = await getWorkspaceGitHubAuth(workspaceId);
  const workspaceToken = await getWorkspaceGitHubToken(workspaceId);

  if (workspaceToken) {
    const status = await getGitHubConnectionStatusForToken(workspaceToken);
    const response = NextResponse.json({
      ...status,
      source: "workspace-oauth",
      login: status.login ?? auth.login,
      connectUrl: "/api/github/connect",
    });
    attachGuestWorkspaceCookie(response, workspaceId, isNew);
    return response;
  }

  if (hasServerGitHubToken()) {
    const status = await getGitHubConnectionStatusForToken();
    const response = NextResponse.json({
      ...status,
      source: "server-token",
      connectUrl: "/api/github/connect",
    });
    attachGuestWorkspaceCookie(response, workspaceId, isNew);
    return response;
  }

  const response = NextResponse.json({
    connected: false,
    source: "none",
    connectUrl: "/api/github/connect",
    error: "No GitHub connection found for this workspace.",
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
