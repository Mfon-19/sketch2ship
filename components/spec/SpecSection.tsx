"use client";

import type { SpecSection as SpecSectionType } from "@/lib/mock-data";
import { SpecCard } from "./SpecCard";
import { cn } from "@/lib/utils";

interface SpecSectionProps {
  section: SpecSectionType;
}

const sectionDotColors: Record<SpecSectionType["icon"], string> = {
  blue: "bg-indigo-500",
  orange: "bg-orange-500",
  red: "bg-rose-500",
};

export function SpecSection({ section }: SpecSectionProps) {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between border-b border-[#e3ddd2] pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.07em] text-[#2f2d2a]">
          <span className={cn("h-2 w-2 rounded-full", sectionDotColors[section.icon])} />
          {section.title}
        </h3>
        <span className="rounded-full bg-[#f0ede6] px-2 py-0.5 font-mono text-[11px] text-[#6b665e]">
          {section.items.length} {section.items.length === 1 ? "item" : "items"}
        </span>
      </header>
      <div className="space-y-4">
        {section.items.map((item) => (
          <SpecCard key={item.id} item={item} sectionIcon={section.icon} />
        ))}
      </div>
    </section>
  );
}
