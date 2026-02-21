"use client";

import Link from "next/link";

export function SettingsContent() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-700">Gemini API Key</h2>
        <p className="text-sm text-zinc-600">
          The API key is configured via the <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">GEMINI_API_KEY</code> environment variable. Add it to <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code> for local development.
        </p>
        <p className="text-xs text-zinc-500">
          Get your API key from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-700"
          >
            Google AI Studio
          </a>
          .
        </p>
      </div>

      <div className="border-t border-zinc-200 pt-6">
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 underline"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
