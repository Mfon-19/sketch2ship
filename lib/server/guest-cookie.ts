import type { NextRequest, NextResponse } from "next/server";

export const GUEST_WORKSPACE_COOKIE = "s2s_guest_workspace";

export function resolveGuestWorkspaceId(request: NextRequest): {
  workspaceId: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(GUEST_WORKSPACE_COOKIE)?.value;
  if (existing) {
    return { workspaceId: existing, isNew: false };
  }

  return { workspaceId: crypto.randomUUID(), isNew: true };
}

export function attachGuestWorkspaceCookie(
  response: NextResponse,
  workspaceId: string,
  isNew: boolean
) {
  if (!isNew) return;

  response.cookies.set({
    name: GUEST_WORKSPACE_COOKIE,
    value: workspaceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
