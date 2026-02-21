import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import {
  getActiveRun,
  getAreaSummaries,
  getLatestNote,
  getWorkspaceRecord,
} from "@/lib/server/workspace-db";

export async function GET(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);
  const record = await getWorkspaceRecord(workspaceId);
  const activeRun = await getActiveRun(workspaceId);
  const note = await getLatestNote(workspaceId);
  const areaSummaries = await getAreaSummaries(workspaceId);

  const response = NextResponse.json({
    workspaceId,
    workspace: record.workspace,
    activeRun,
    latestNoteId: note?.id ?? null,
    areaSummaries,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
