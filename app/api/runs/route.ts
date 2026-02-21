import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { createRun, getNoteById } from "@/lib/server/workspace-db";
import { startRunProcessing } from "@/lib/server/run-processor";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const body = (await request.json()) as { noteId?: string; areaId?: string };

  const noteId = body.noteId;
  const areaId = body.areaId;
  if (!noteId) {
    return NextResponse.json(
      { error: "noteId is required" },
      { status: 400 }
    );
  }
  if (!areaId) {
    return NextResponse.json({ error: "areaId is required" }, { status: 400 });
  }

  const note = await getNoteById(workspaceId, noteId);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  const hasArea = note.canvas.areas.some((area) => area.id === areaId);
  if (!hasArea) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const { run, alreadyActive, skipped, workspace } = await createRun(
    workspaceId,
    noteId,
    areaId
  );
  if (!alreadyActive && !skipped) {
    startRunProcessing(workspaceId, run.id);
  }

  const response = NextResponse.json({
    workspaceId,
    run,
    alreadyActive,
    skipped,
    workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
