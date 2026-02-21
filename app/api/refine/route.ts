import { NextResponse } from "next/server";
import { refineNotebook } from "@/lib/server/refine-engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const parsed = await refineNotebook(content);
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message.includes("403") || message.includes("API key")
        ? 403
        : message.includes("429")
          ? 429
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
