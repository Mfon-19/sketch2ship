"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Move,
  Plus,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  type MouseEvent as ReactMouseEvent,
  useRef,
  useState,
} from "react";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import type { AreaSummary, NotePatch, RunStatus, WorkspaceLatestResponse } from "@/lib/notebook-types";
import type { NotebookBlock, NotebookViewport, Workspace } from "@/lib/workspace-store";
import { createDefaultViewport } from "@/lib/workspace-store";

const ACTIVE_STATUSES: RunStatus[] = ["queued", "threading", "specing", "planning"];
const WORLD_SIZE = 200000;

const STATUS_LABEL: Record<string, string> = {
  idle: "Waiting",
  queued: "Queued",
  threading: "Threading",
  specing: "Extracting spec",
  planning: "Planning",
  ready: "Ready",
  failed: "Failed",
};

function nowIso() {
  return new Date().toISOString();
}

function clampZoom(next: number) {
  return Math.min(2.5, Math.max(0.4, next));
}

function generateBlock(x: number, y: number): NotebookBlock {
  return {
    id: crypto.randomUUID?.() ?? `block-${Date.now()}`,
    x,
    y,
    w: 440,
    h: 260,
    content: "",
    updatedAt: nowIso(),
  };
}

function compactPatches(patches: NotePatch[]): NotePatch[] {
  const upserts = new Map<string, NotePatch & { op: "upsert_block" }>();
  const deletes = new Set<string>();
  let viewportPatch: NotePatch | null = null;
  const passthrough: NotePatch[] = [];

  for (const patch of patches) {
    if (patch.op === "upsert_block") {
      deletes.delete(patch.block.id);
      upserts.set(patch.block.id, patch);
      continue;
    }

    if (patch.op === "delete_block") {
      upserts.delete(patch.blockId);
      deletes.add(patch.blockId);
      continue;
    }

    if (patch.op === "set_viewport") {
      viewportPatch = patch;
      continue;
    }

    passthrough.push(patch);
  }

  return [
    ...passthrough,
    ...[...deletes].map((blockId) => ({ op: "delete_block", blockId }) as NotePatch),
    ...upserts.values(),
    ...(viewportPatch ? [viewportPatch] : []),
  ];
}

function mergeServerAreaIds(
  localBlocks: NotebookBlock[],
  serverBlocks: NotebookBlock[]
): NotebookBlock[] {
  const byId = new Map(serverBlocks.map((block) => [block.id, block]));
  const merged: NotebookBlock[] = localBlocks
    .filter((block) => byId.has(block.id))
    .map((block) => ({
      ...block,
      areaId: byId.get(block.id)?.areaId,
    }));

  for (const serverBlock of serverBlocks) {
    if (!merged.find((block) => block.id === serverBlock.id)) {
      merged.push(serverBlock);
    }
  }

  return merged;
}

export function NotebookPageContent() {
  const router = useRouter();
  const { workspace, isLoading, updateWorkspace } = useWorkspace();

  const [noteId, setNoteId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [viewport, setViewport] = useState<NotebookViewport>(createDefaultViewport());
  const [areaSummaries, setAreaSummaries] = useState<AreaSummary[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef<NotebookBlock[]>([]);
  const pendingPatchesRef = useRef<NotePatch[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleQueueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runQueueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueuedAreaRef = useRef<Record<string, string>>({});
  const saveInFlightRef = useRef(false);
  const noteIdRef = useRef<string | null>(null);
  const localDirtyRef = useRef(false);

  const interactionRef = useRef<
    | { type: "none" }
    | {
        type: "panning";
        pointerId: number;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
      }
    | {
        type: "dragging";
        pointerId: number;
        blockId: string;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
      }
    | {
        type: "resizing";
        pointerId: number;
        blockId: string;
        startX: number;
        startY: number;
        originW: number;
        originH: number;
      }
  >({ type: "none" });

  const syncWorkspace = useCallback(
    (next: Workspace) => {
      updateWorkspace(() => next);
    },
    [updateWorkspace]
  );

  const refreshLatest = useCallback(async () => {
    const response = await fetch("/api/workspace/latest", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as WorkspaceLatestResponse;
    syncWorkspace(payload.workspace);
    const latestAreas = payload.areaSummaries ?? [];
    setAreaSummaries(latestAreas);
    for (const area of latestAreas) {
      if (!area.preview.trim() || area.status !== "ready") continue;
      lastQueuedAreaRef.current[area.id] = `${area.preview}:${area.blockIds.join(",")}`;
    }

    const firstNote =
      payload.workspace.notebooks.find((note) => note.id === payload.latestNoteId) ??
      payload.workspace.notebooks[0];
    if (firstNote) {
      setNoteId(firstNote.id);
      // Avoid clobbering unsaved local edits during active typing/dragging.
      if (!localDirtyRef.current && !flushTimerRef.current && !saveInFlightRef.current) {
        setViewport(firstNote.canvas.viewport ?? createDefaultViewport());
        setBlocks((previous) =>
          previous.length
            ? mergeServerAreaIds(previous, firstNote.canvas.blocks)
            : firstNote.canvas.blocks
        );
      }
    }

    return payload;
  }, [syncWorkspace]);

  useEffect(() => {
    if (isLoading || bootstrapped) return;

    void (async () => {
      try {
        await refreshLatest();
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [bootstrapped, isLoading, refreshLatest]);

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const queueRuns = useCallback(async (currentNoteId: string, areas: AreaSummary[]) => {
    if (!currentNoteId || areas.length === 0) return;

    for (const area of areas) {
      if (!area.preview.trim()) continue;
      const fingerprint = `${area.preview}:${area.blockIds.join(",")}`;
      if (
        area.status !== "failed" &&
        lastQueuedAreaRef.current[area.id] === fingerprint
      ) {
        continue;
      }

      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: currentNoteId,
            areaId: area.id,
          }),
        });
        if (!response.ok) continue;
        lastQueuedAreaRef.current[area.id] = fingerprint;
      } catch {
        // ignore transient queue failures
      }
    }

    await refreshLatest();
  }, [refreshLatest]);

  const scheduleRunQueue = useCallback(
    (currentNoteId: string, areas: AreaSummary[]) => {
      if (runQueueTimerRef.current) clearTimeout(runQueueTimerRef.current);
      runQueueTimerRef.current = setTimeout(() => {
        void queueRuns(currentNoteId, areas);
      }, 1200);
    },
    [queueRuns]
  );

  const flushQueuedPatches = useCallback(async () => {
    if (saveInFlightRef.current) return;
    const raw = pendingPatchesRef.current;
    if (raw.length === 0) return;
    pendingPatchesRef.current = [];
    const touchedBlockIds = new Set<string>();
    const priorTouchedAreaIds = new Set<string>();
    for (const patch of raw) {
      if (patch.op === "upsert_block") {
        touchedBlockIds.add(patch.block.id);
        if (patch.block.areaId) priorTouchedAreaIds.add(patch.block.areaId);
        continue;
      }
      if (patch.op === "delete_block") {
        touchedBlockIds.add(patch.blockId);
        continue;
      }
      if (patch.op === "replace_blocks" || patch.op === "set_canvas") {
        for (const block of blocksRef.current) {
          touchedBlockIds.add(block.id);
          if (block.areaId) priorTouchedAreaIds.add(block.areaId);
        }
      }
    }
    for (const blockId of touchedBlockIds) {
      const existing = blocksRef.current.find((block) => block.id === blockId);
      if (existing?.areaId) {
        priorTouchedAreaIds.add(existing.areaId);
      }
    }
    const patches = compactPatches(raw);

    saveInFlightRef.current = true;
    setSaveState("saving");
    let committedNoteId: string | null = null;
    let committedAreas: AreaSummary[] = [];

    try {
      const response = await fetch("/api/workspace/note", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteId: noteIdRef.current ?? undefined,
          patches,
        }),
      });

      if (!response.ok) {
        setSaveState("error");
        return;
      }

      const payload = (await response.json()) as {
        note: {
          id: string;
          canvas: {
            viewport: NotebookViewport;
            blocks: NotebookBlock[];
          };
        };
        workspace: Workspace;
        areaSummaries: AreaSummary[];
      };

      committedNoteId = payload.note.id;
      const savedAreas = payload.areaSummaries ?? [];
      const affected = new Map<string, AreaSummary>();
      for (const area of savedAreas) {
        if (area.blockIds.some((blockId) => touchedBlockIds.has(blockId))) {
          affected.set(area.id, area);
        }
      }
      for (const area of savedAreas) {
        if (priorTouchedAreaIds.has(area.id)) {
          affected.set(area.id, area);
        }
      }
      committedAreas = [...affected.values()];
      noteIdRef.current = payload.note.id;
      setNoteId(payload.note.id);
      setAreaSummaries(savedAreas);
      setViewport(payload.note.canvas.viewport);
      setBlocks((previous) =>
        previous.length
          ? mergeServerAreaIds(previous, payload.note.canvas.blocks)
          : payload.note.canvas.blocks
      );
      syncWorkspace(payload.workspace);
    } catch {
      setSaveState("error");
      return;
    } finally {
      saveInFlightRef.current = false;
    }

    if (pendingPatchesRef.current.length > 0) {
      void flushQueuedPatches();
      return;
    }

    localDirtyRef.current = false;
    setSaveState("saved");
    if (committedNoteId) {
      scheduleRunQueue(committedNoteId, committedAreas);
    }
  }, [scheduleRunQueue, syncWorkspace]);

  const queuePatch = useCallback((patch: NotePatch) => {
    localDirtyRef.current = true;
    pendingPatchesRef.current.push(patch);
    if (flushTimerRef.current) return;

    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushQueuedPatches();
    }, 550);
  }, [flushQueuedPatches]);

  const toWorldPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const updateBlock = useCallback((blockId: string, updater: (block: NotebookBlock) => NotebookBlock) => {
    setBlocks((previous) =>
      previous.map((block) => (block.id === blockId ? updater(block) : block))
    );
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    setBlocks((previous) => previous.filter((block) => block.id !== blockId));
    queuePatch({ op: "delete_block", blockId });
  }, [queuePatch]);

  const onCanvasDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-notebook-block='true']")) return;

      const world = toWorldPoint(event.clientX, event.clientY);
      const block = generateBlock(world.x - 180, world.y - 100);
      setBlocks((previous) => [...previous, block]);
      queuePatch({ op: "upsert_block", block });
    },
    [queuePatch, toWorldPoint]
  );

  const queueRunsForAreas = useCallback(async () => {
    const currentNoteId = noteId;
    if (!currentNoteId) return;
    await queueRuns(currentNoteId, areaSummaries);
  }, [areaSummaries, noteId, queueRuns]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (idleQueueTimerRef.current) clearTimeout(idleQueueTimerRef.current);
    idleQueueTimerRef.current = setTimeout(() => {
      void queueRunsForAreas();
    }, 12_000);

    return () => {
      if (idleQueueTimerRef.current) {
        clearTimeout(idleQueueTimerRef.current);
        idleQueueTimerRef.current = null;
      }
    };
  }, [blocks, bootstrapped, queueRunsForAreas, viewport]);

  useEffect(() => {
    const onBlur = () => {
      void queueRunsForAreas();
    };

    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [queueRunsForAreas]);

  useEffect(() => {
    return () => {
      if (runQueueTimerRef.current) {
        clearTimeout(runQueueTimerRef.current);
        runQueueTimerRef.current = null;
      }
    };
  }, []);

  const hasActiveAreas = areaSummaries.some((area) =>
    ACTIVE_STATUSES.includes(area.status as RunStatus)
  );

  useEffect(() => {
    if (!hasActiveAreas) return;
    const poll = setInterval(() => {
      void refreshLatest();
    }, 2200);
    return () => clearInterval(poll);
  }, [hasActiveAreas, refreshLatest]);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (interaction.type === "none") return;

      if (interaction.type === "panning") {
        const dx = event.clientX - interaction.startX;
        const dy = event.clientY - interaction.startY;
        setViewport((previous) => ({
          ...previous,
          x: interaction.originX + dx,
          y: interaction.originY + dy,
        }));
      }

      if (interaction.type === "dragging") {
        const dx = (event.clientX - interaction.startX) / viewport.zoom;
        const dy = (event.clientY - interaction.startY) / viewport.zoom;
        updateBlock(interaction.blockId, (block) => ({
          ...block,
          x: interaction.originX + dx,
          y: interaction.originY + dy,
          updatedAt: nowIso(),
        }));
      }

      if (interaction.type === "resizing") {
        const dx = (event.clientX - interaction.startX) / viewport.zoom;
        const dy = (event.clientY - interaction.startY) / viewport.zoom;
        updateBlock(interaction.blockId, (block) => ({
          ...block,
          w: Math.max(260, interaction.originW + dx),
          h: Math.max(160, interaction.originH + dy),
          updatedAt: nowIso(),
        }));
      }
    },
    [updateBlock, viewport.zoom]
  );

  const onPointerUp = useCallback(() => {
    const interaction = interactionRef.current;
    interactionRef.current = { type: "none" };

    if (interaction.type === "panning") {
      queuePatch({ op: "set_viewport", viewport });
      return;
    }

    if (interaction.type === "dragging" || interaction.type === "resizing") {
      const block = blocks.find((item) => item.id === interaction.blockId);
      if (block) {
        queuePatch({ op: "upsert_block", block: { ...block, updatedAt: nowIso() } });
      }
    }
  }, [blocks, queuePatch, viewport]);

  useEffect(() => {
    const move = (event: PointerEvent) => onPointerMove(event);
    const up = () => onPointerUp();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onPointerMove, onPointerUp]);

  const startPanning = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-notebook-block='true']")) return;

    interactionRef.current = {
      type: "panning",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
  };

  const zoomBy = (factor: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - viewport.x) / viewport.zoom;
    const worldY = (cy - viewport.y) / viewport.zoom;
    const nextZoom = clampZoom(viewport.zoom * factor);
    const nextX = cx - worldX * nextZoom;
    const nextY = cy - worldY * nextZoom;
    setViewport({ x: nextX, y: nextY, zoom: nextZoom });
    queuePatch({
      op: "set_viewport",
      viewport: { x: nextX, y: nextY, zoom: nextZoom },
    });
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    const factor = event.deltaY > 0 ? 0.94 : 1.06;
    const nextZoom = clampZoom(viewport.zoom * factor);
    const nextX = mouseX - worldX * nextZoom;
    const nextY = mouseY - worldY * nextZoom;

    setViewport({ x: nextX, y: nextY, zoom: nextZoom });
    queuePatch({
      op: "set_viewport",
      viewport: { x: nextX, y: nextY, zoom: nextZoom },
    });
  };

  const areaProjectMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of workspace?.projects ?? []) {
      if (project.noteId !== noteId) continue;
      if (project.areaId) map.set(project.areaId, project.id);
    }
    return map;
  }, [noteId, workspace?.projects]);

  if (isLoading && !bootstrapped) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffdf8]">
        <Loader2 className="h-5 w-5 animate-spin text-[#6f6a63]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#fffdf8] text-[#2d2b28]">
      <div className="flex h-14 items-center justify-between border-b border-[#e6dfd2] px-5">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold">Infinite Notebook</h1>
          <button
            onClick={() => {
              const rect = canvasRef.current?.getBoundingClientRect();
              const world = rect
                ? toWorldPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
                : { x: 0, y: 0 };
              const block = generateBlock(world.x - 180, world.y - 100);
              setBlocks((previous) => [...previous, block]);
              queuePatch({ op: "upsert_block", block });
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d9d3c8] bg-white px-2.5 text-xs font-medium text-[#3f3b35] hover:bg-[#f5f2ea]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Block
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7a756d]">
          <span>{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "Idle"}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#e2ddd3] bg-white px-2 py-0.5">
            <Sparkles className="h-3.5 w-3.5" />
            {areaSummaries.length} idea area{areaSummaries.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => zoomBy(1.12)}
            className="rounded border border-[#d9d3c8] bg-white p-1.5 hover:bg-[#f5f2ea]"
            title="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => zoomBy(0.88)}
            className="rounded border border-[#d9d3c8] bg-white p-1.5 hover:bg-[#f5f2ea]"
            title="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgba(120,112,96,0.16)_1px,transparent_0)] [background-size:28px_28px]"
        onDoubleClick={onCanvasDoubleClick}
        onPointerDown={startPanning}
        onWheel={onWheel}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: `${WORLD_SIZE}px`,
            height: `${WORLD_SIZE}px`,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {blocks.map((block) => (
            <div
              key={block.id}
              data-notebook-block="true"
              className="absolute rounded-xl border border-[#d8d3ca] bg-white/95 shadow-[0_8px_18px_rgba(0,0,0,0.07)]"
              style={{
                left: block.x,
                top: block.y,
                width: block.w,
                height: block.h,
              }}
            >
              <div
                className="flex h-8 cursor-move items-center justify-between rounded-t-xl border-b border-[#eee8de] bg-[#f9f6f0] px-2 text-[10px] uppercase tracking-[0.08em] text-[#7f7a72]"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  interactionRef.current = {
                    type: "dragging",
                    pointerId: event.pointerId,
                    blockId: block.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originX: block.x,
                    originY: block.y,
                  };
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  Text Area
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteBlock(block.id);
                  }}
                  className="rounded p-1 text-[#8f897f] hover:bg-[#ece8df] hover:text-[#3f3a34]"
                  title="Delete block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <textarea
                value={block.content}
                onChange={(event) => {
                  const nextBlock = {
                    ...block,
                    content: event.target.value,
                    updatedAt: nowIso(),
                  };
                  updateBlock(block.id, () => nextBlock);
                  queuePatch({ op: "upsert_block", block: nextBlock });
                }}
                placeholder="Type an idea here..."
                className="h-[calc(100%-32px)] w-full resize-none bg-transparent px-3 py-2 font-editor text-[1.35rem] leading-[1.5] text-[#2f2d29] placeholder:text-[#aaa398] focus:outline-none"
              />

              <button
                onPointerDown={(event) => {
                  event.stopPropagation();
                  interactionRef.current = {
                    type: "resizing",
                    pointerId: event.pointerId,
                    blockId: block.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    originW: block.w,
                    originH: block.h,
                  };
                }}
                className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border border-[#d5cfc3] bg-[#f3efe7]"
                title="Resize"
              />
            </div>
          ))}

          {areaSummaries.map((area) => {
            const linkedProjectId = area.projectId ?? areaProjectMap.get(area.id);
            const isReady = area.status === "ready" && Boolean(linkedProjectId);
            const isActive = ACTIVE_STATUSES.includes(area.status as RunStatus);

            return (
              <button
                key={area.id}
                onClick={() => {
                  if (!linkedProjectId) return;
                  router.push(`/projects/${linkedProjectId}/spec`);
                }}
                className="absolute -translate-x-1/2 -translate-y-[120%] rounded-full border border-[#d8d2c7] bg-white px-3 py-1 text-xs shadow-sm"
                style={{
                  left: area.centroid.x,
                  top: area.centroid.y,
                }}
                title={isReady ? "Open generated spec" : area.preview}
                disabled={!linkedProjectId}
              >
                <span className="inline-flex items-center gap-1">
                  {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span
                    className={
                      area.status === "failed"
                        ? "text-red-600"
                        : area.status === "ready"
                          ? "text-emerald-700"
                          : "text-[#4f4b45]"
                    }
                  >
                    {STATUS_LABEL[area.status] ?? area.status}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex h-9 items-center justify-between border-t border-[#e6dfd2] px-4 text-[11px] text-[#867f74]">
        <span>
          Double-click empty canvas to create a new idea block. Distant blocks become
          distinct idea areas.
        </span>
        <div className="flex items-center gap-3">
          <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
          <Link className="underline underline-offset-2" href="/projects">
            Open Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
