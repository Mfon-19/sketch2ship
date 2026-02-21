import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedGitHubUser } from "@/lib/server/github-client";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import {
  consumeGitHubOAuthState,
  saveWorkspaceGitHubAuth,
} from "@/lib/server/workspace-db";

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function appendQuery(path: string, key: string, value: string): string {
  const divider = path.includes("?") ? "&" : "?";
  return `${path}${divider}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function toAbsoluteUrl(target: string, requestUrl: string): URL {
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return new URL(target);
  }
  return new URL(target, requestUrl);
}

export async function GET(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorDescription = request.nextUrl.searchParams.get("error_description");

  const fail = (target: string, reason: string) => {
    const response = NextResponse.redirect(
      toAbsoluteUrl(appendQuery(target, "github", reason), request.url)
    );
    attachGuestWorkspaceCookie(response, workspaceId, isNew);
    return response;
  };

  if (!state) {
    return fail("/projects", "missing_state");
  }

  const consumed = await consumeGitHubOAuthState(workspaceId, state);
  const redirectTo = consumed?.redirectTo ?? "/projects";
  if (!consumed) {
    return fail("/projects", "invalid_state");
  }
  if (oauthError) {
    return fail(
      redirectTo,
      `oauth_error:${oauthErrorDescription ?? oauthError}`
    );
  }
  if (!code) {
    return fail(redirectTo, "missing_code");
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return fail(redirectTo, "oauth_not_configured");
  }
  const callbackUrl =
    process.env.GITHUB_OAUTH_CALLBACK_URL?.trim() ||
    `${request.nextUrl.origin}/api/github/callback`;

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
        redirect_uri: callbackUrl,
      }),
      cache: "no-store",
    });
    if (!tokenRes.ok) {
      return fail(redirectTo, `token_exchange_failed_${tokenRes.status}`);
    }

    const tokenPayload = (await tokenRes.json()) as OAuthTokenResponse;
    if (!tokenPayload.access_token) {
      return fail(
        redirectTo,
        `token_missing:${tokenPayload.error_description ?? tokenPayload.error ?? "unknown"}`
      );
    }

    const user = await getAuthenticatedGitHubUser(tokenPayload.access_token);
    await saveWorkspaceGitHubAuth(workspaceId, {
      accessToken: tokenPayload.access_token,
      tokenType: tokenPayload.token_type,
      scope: tokenPayload.scope,
      login: user.login,
    });

    const response = NextResponse.redirect(
      toAbsoluteUrl(appendQuery(redirectTo, "github", "connected"), request.url)
    );
    attachGuestWorkspaceCookie(response, workspaceId, isNew);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_callback_failed";
    return fail(redirectTo, message);
  }
}
