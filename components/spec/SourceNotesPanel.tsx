import {
  CalendarDays,
  Expand,
  FileText,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { SourceNote } from "@/lib/workspace-store";

interface SourceNotesPanelProps {
  sourceNote?: SourceNote | null;
}

export function SourceNotesPanel({ sourceNote }: SourceNotesPanelProps) {
  if (!sourceNote) {
    return (
      <div className="flex h-full items-center justify-center border-r border-[#e1ddd4] bg-[#fdfbf7]">
        <p className="text-sm text-[#77736b]">No source notes</p>
      </div>
    );
  }

  const blocks: Array<{
    id: number;
    before?: string;
    highlight: string;
    after?: string;
  }> =
    sourceNote.blocks ??
    sourceNote.highlights.map((highlight, index) => ({
      id: index + 1,
      highlight,
    }));

  return (
    <section className="relative flex h-full flex-col border-r border-[#e1ddd4] bg-[#fdfbf7] paper-dot-grid">
      <div className="flex h-20 items-center justify-between border-b border-[#e7e2d8] bg-[#fdfbf7]/90 px-8 backdrop-blur">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#6f6a62]" />
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#59554e]">
            Source Notes
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 text-[#8a857d] transition hover:bg-black/5 hover:text-[#2f2d2a]">
            <Pencil className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 text-[#8a857d] transition hover:bg-black/5 hover:text-[#2f2d2a]">
            <Expand className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-10 py-8">
        <div className="max-w-4xl font-editor text-[#2f2d2a]">
          <h3 className="mb-6 inline-block border-b-2 border-[#f0dea7] pb-1 font-serif text-[2.45rem] font-bold leading-tight">
            {sourceNote.title}
          </h3>

          <div className="mb-9 inline-flex items-center gap-3 rounded-md border border-[#dfd9cf] bg-white px-3 py-1.5 text-sm text-[#6f6a62] shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {sourceNote.date}
            </span>
            <span className="h-3 w-px bg-[#d8d2c8]" />
            <span className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              Recorded by {sourceNote.recordedBy}
            </span>
          </div>

          <div className="space-y-7 text-[2rem] leading-[1.8] text-[#2f2d2a]">
            {blocks.map((block) => (
              <p key={block.id}>
                {block.before && <span>{block.before} </span>}
                <mark
                  id={`note-${block.id}`}
                  className="rounded-sm bg-[#f6e8b6] px-1.5 py-0.5"
                >
                  {block.highlight}
                </mark>
                {block.after && <span> {block.after}</span>}
              </p>
            ))}
          </div>

          {sourceNote.aiNote && (
            <div className="mt-12 flex items-start gap-3 rounded-md border border-dashed border-[#d6d0c5] bg-white/60 p-4 text-sm italic text-[#6b665f]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#3f7ad8]" />
              <p>
                <span className="font-medium not-italic">AI Note:</span>{" "}
                {sourceNote.aiNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
