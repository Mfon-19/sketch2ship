import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { setGitHubOAuthState } from "@/lib/server/workspace-db";

function normalizeRedirect(target: string | null): string {
  if (!target) return "/projects";
  if (!target.startsWith("/")) return "/projects";
  if (target.startsWith("//")) return "/projects";
  return target;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_OAUTH_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const requestedRedirect = normalizeRedirect(
    request.nextUrl.searchParams.get("redirect")
  );
  const state = crypto.randomUUID();
  await setGitHubOAuthState(workspaceId, state, requestedRedirect);

  const callbackUrl =
    process.env.GITHUB_OAUTH_CALLBACK_URL?.trim() ||
    `${request.nextUrl.origin}/api/github/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "repo read:user");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
