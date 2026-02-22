# Sketch2Ship

Have you ever had an awesome idea strike you at an inopportune time? Sometimes you write it down in your notes app, most times you forget about it. Sketch2Ship will turn your rough notes into shipped code. It is a notebook-first workspace that refines messy ideas into specs, milestones, and working prototypes—then ships them to GitHub via an AI agent.

## How it works

1. **Notebook** — Type freely in an infinite canvas. Raw bullets, links, and fragments. No signup; works locally.
2. **Refine** — When you stop typing (~2 seconds), Gemini extracts project ideas and builds a full spec: requirements, milestones, and tasks.
3. **Spec** — View and edit the live spec, source notes, and traceability.
4. **Roadmap** — See milestones and generated issues. Connect GitHub (token or OAuth).
5. **Ship** — Click "Ship with AI Agent". The agent creates a repo (if needed), generates implementation files from the spec, opens a branch, commits, and opens a draft PR.

## Tech stack

- **Next.js 16** — App router, API routes
- **TipTap** — Rich text editor in notebook blocks
- **Gemini 3.1 Pro** — Refine and ship generation
- **GitHub API** — Repo creation, branches, commits, PRs

## Setup

```bash
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
```

**Required env vars:**

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | [Get from AI Studio](https://aistudio.google.com/apikey) — Refine notes and ship generation |
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope — Ship to GitHub |

**Optional (OAuth):**

- `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` — Per-workspace GitHub login
- `GITHUB_OAUTH_CALLBACK_URL` — Defaults to `http://localhost:3000/api/github/callback`

## Project structure

```
app/
  page.tsx              # Main notebook (infinite canvas)
  projects/             # Project list, spec, roadmap
  api/
    refine/              # Refine notes → spec
    ship/                # Ship job start/status
    github/              # Connect, disconnect, status
    projects/[id]/       # Project repository
lib/
  server/
    refine-engine.ts     # Gemini refine prompt
    ship-generator.ts    # Gemini ship artifacts (multi-file)
    ship-processor.ts    # Repo create, branch, commit, PR
    github-client.ts     # GitHub API wrapper
```
