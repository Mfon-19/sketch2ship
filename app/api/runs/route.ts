import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { createRun, getNoteById } from "@/lib/server/workspace-db";
import { startRunProcessing } from "@/lib/server/run-processor";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const body = (await request.json()) as { noteId?: string };

  const noteId = body.noteId;
  if (!noteId) {
    return NextResponse.json(
      { error: "noteId is required" },
      { status: 400 }
    );
  }

  const note = await getNoteById(workspaceId, noteId);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const { run, alreadyActive, workspace } = await createRun(workspaceId, noteId);
  if (!alreadyActive) {
    startRunProcessing(workspaceId, run.id);
  }

  const response = NextResponse.json({
    workspaceId,
    run,
    alreadyActive,
    workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
