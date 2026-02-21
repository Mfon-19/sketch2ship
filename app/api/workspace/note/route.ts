import { NextRequest, NextResponse } from "next/server";
import {
  attachGuestWorkspaceCookie,
  resolveGuestWorkspaceId,
} from "@/lib/server/guest-cookie";
import { saveNoteContent } from "@/lib/server/workspace-db";

export async function POST(request: NextRequest) {
  const { workspaceId, isNew } = resolveGuestWorkspaceId(request);

  const body = (await request.json()) as {
    content?: string;
    noteId?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const result = await saveNoteContent(workspaceId, content, body.noteId);

  const response = NextResponse.json({
    workspaceId,
    note: result.note,
    workspace: result.workspace,
  });
  attachGuestWorkspaceCookie(response, workspaceId, isNew);
  return response;
}
