"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExtractedIdea } from "@/lib/mock-data";
import type { Project } from "@/lib/workspace-store";

interface RefineNotesButtonProps {
  content: string;
  onRefineComplete: (ideas: ExtractedIdea[], project: Project) => void;
  className?: string;
}

export function RefineNotesButton({
  content,
  onRefineComplete,
  className,
}: RefineNotesButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          alert("GEMINI_API_KEY not configured. Add it to .env.local");
        } else if (res.status === 403) {
          alert("Invalid API key");
        } else if (res.status === 429) {
          alert("Rate limited, try again later");
        } else {
          alert(data.error || "Something went wrong");
        }
        return;
      }

      const { ideas, project } = data;
      onRefineComplete(ideas, {
        ...project,
        id: "refined",
        prItems: [],
      });
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 gap-2 rounded-full bg-zinc-800 px-5 shadow-lg hover:bg-zinc-700 ${className ?? ""}`}
      size="lg"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {loading ? "Refining..." : "Refine Notes"}
    </Button>
  );
}
