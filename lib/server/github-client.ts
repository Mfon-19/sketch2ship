const GITHUB_API = "https://api.github.com";

export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

interface GitHubApiErrorPayload {
  message?: string;
}

function resolveToken(explicitToken?: string): string {
  const token = explicitToken?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured");
  }
  return token;
}

export function hasServerGitHubToken(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim());
}

async function githubRequest<T>(
  path: string,
  init?: RequestInit & { allow404?: boolean },
  token?: string
): Promise<T | null> {
  const accessToken = resolveToken(token);
  const response = await fetch(`${GITHUB_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body,
    cache: "no-store",
  });

  if (response.status === 404 && init?.allow404) {
    return null;
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as GitHubApiErrorPayload;
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(`GitHub API error: ${message}`);
  }

  if (response.status === 204) return null;
  return (await response.json()) as T;
}

export function parseGitHubRepository(input: string): GitHubRepoRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleaned = trimmed
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length < 2) return null;

  const owner = parts[0].trim();
  const repo = parts[1].trim();
  if (!owner || !repo) return null;
  return { owner, repo };
}

export async function getGitHubConnectionStatus(): Promise<{
  connected: boolean;
  login?: string;
  error?: string;
}> {
  return getGitHubConnectionStatusForToken();
}

export async function getGitHubConnectionStatusForToken(
  token?: string
): Promise<{
  connected: boolean;
  login?: string;
  error?: string;
}> {
  try {
    const user = await githubRequest<{ login: string }>("/user", undefined, token);
    return { connected: true, login: user?.login };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub unavailable";
    return { connected: false, error: message };
  }
}

export async function getAuthenticatedGitHubUser(token: string): Promise<{
  login: string;
}> {
  const user = await githubRequest<{ login: string }>("/user", undefined, token);
  if (!user?.login) {
    throw new Error("Unable to resolve authenticated GitHub user");
  }
  return { login: user.login };
}

export async function getRepositoryDefaultBranch(
  repo: GitHubRepoRef,
  token?: string
): Promise<string> {
  const payload = await githubRequest<{ default_branch: string }>(
    `/repos/${repo.owner}/${repo.repo}`,
    undefined,
    token
  );
  return payload?.default_branch ?? "main";
}

export async function ensureBranchFromBase(
  repo: GitHubRepoRef,
  baseBranch: string,
  branch: string,
  token?: string
) {
  const existing = await githubRequest(
    `/repos/${repo.owner}/${repo.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { allow404: true },
    token
  );
  if (existing) return;

  const baseRef = await githubRequest<{ object: { sha: string } }>(
    `/repos/${repo.owner}/${repo.repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
    undefined,
    token
  );
  if (!baseRef?.object?.sha) {
    throw new Error(`Unable to resolve base branch '${baseBranch}'`);
  }

  await githubRequest(`/repos/${repo.owner}/${repo.repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: baseRef.object.sha,
    }),
  }, token);
}

export async function upsertRepositoryTextFile(
  repo: GitHubRepoRef,
  branch: string,
  filePath: string,
  content: string,
  message: string,
  token?: string
) {
  const encodedPath = filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const existing = await githubRequest<{ sha?: string }>(
    `/repos/${repo.owner}/${repo.repo}/contents/${encodedPath}?ref=${encodeURIComponent(
      branch
    )}`,
    { allow404: true },
    token
  );

  await githubRequest(`/repos/${repo.owner}/${repo.repo}/contents/${encodedPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch,
      content: Buffer.from(content, "utf8").toString("base64"),
      ...(existing?.sha ? { sha: existing.sha } : {}),
    }),
  }, token);
}

export async function createRepositoryForUser(
  repoName: string,
  description?: string,
  token?: string
): Promise<GitHubRepoRef> {
  const body: Record<string, unknown> = {
    name: repoName,
    private: false,
    auto_init: true,
  };
  if (description) body.description = description;

  const created = await githubRequest<{
    full_name: string;
    name: string;
    owner: { login: string };
  }>(
    "/user/repos",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    token
  );

  if (!created?.owner?.login || !created?.name) {
    throw new Error("GitHub did not return repository metadata");
  }

  return { owner: created.owner.login, repo: created.name };
}

export async function createOrReuseDraftPullRequest(
  repo: GitHubRepoRef,
  branch: string,
  baseBranch: string,
  title: string,
  body: string,
  token?: string
): Promise<{ url: string; number: number }> {
  try {
    const created = await githubRequest<{ html_url: string; number: number }>(
      `/repos/${repo.owner}/${repo.repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({
          title,
          head: branch,
          base: baseBranch,
          body,
          draft: true,
        }),
      },
      token
    );
    if (!created?.html_url || !created?.number) {
      throw new Error("GitHub did not return pull request metadata");
    }
    return { url: created.html_url, number: created.number };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub PR failure";
    if (!message.includes("already exists")) {
      throw error;
    }

    const existing = await githubRequest<Array<{ html_url: string; number: number }>>(
      `/repos/${repo.owner}/${repo.repo}/pulls?state=open&head=${encodeURIComponent(
        `${repo.owner}:${branch}`
      )}`,
      undefined,
      token
    );
    const first = existing?.[0];
    if (!first?.html_url || !first?.number) {
      throw new Error("Pull request already exists but could not be fetched");
    }
    return { url: first.html_url, number: first.number };
  }
}
