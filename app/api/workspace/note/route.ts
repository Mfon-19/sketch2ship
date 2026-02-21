import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { saveNotePatches } from "@/lib/server/workspace-db";
import type { NotePatch } from "@/lib/notebook-types";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);

  const body = (await request.json()) as {
    patches?: NotePatch[];
    noteId?: string;
  };
  const patches = Array.isArray(body.patches) ? body.patches : [];
  if (patches.length === 0) {
    return NextResponse.json({ error: "patches are required" }, { status: 400 });
  }

  const result = await saveNotePatches(workspaceId, patches, body.noteId);

  const response = NextResponse.json({
    workspaceId,
    note: result.note,
    workspace: result.workspace,
    areaSummaries: result.areaSummaries,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
