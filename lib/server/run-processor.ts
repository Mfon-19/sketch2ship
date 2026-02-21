import { failRun, finalizeRun, getNoteById, updateRunStatus } from "@/lib/server/workspace-db";
import { refineNotebook, toProject } from "@/lib/server/refine-engine";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startRunProcessing(workspaceId: string, runId: string) {
  void processRun(workspaceId, runId);
}

async function processRun(workspaceId: string, runId: string) {
  try {
    const threading = await updateRunStatus(workspaceId, runId, "threading");
    if (!threading) return;
    await delay(350);

    const note = await getNoteById(workspaceId, threading.noteId);
    if (!note) {
      await failRun(workspaceId, runId, "Source note not found");
      return;
    }

    await updateRunStatus(workspaceId, runId, "specing");
    const refined = await refineNotebook(note.content);
    await delay(300);

    await updateRunStatus(workspaceId, runId, "planning");
    const result = await finalizeRun(
      workspaceId,
      runId,
      refined.ideas,
      toProject(refined)
    );
    await delay(200);

    if (!result) {
      await failRun(workspaceId, runId, "Run finalization failed");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected run failure";
    await failRun(workspaceId, runId, message);
  }
}
