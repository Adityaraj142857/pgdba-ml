/**
 * Thin wrapper around the GitHub REST API, called directly from the browser on /admin/ — this
 * IS the "backend" for the admin CMS (see .plan/04-admin-cms.md). The PAT is supplied by the
 * admin and never leaves the browser except to api.github.com.
 */

export class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GitHubApiError";
  }
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

async function gh(config: GitHubConfig, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore — use the status text
    }
    throw new GitHubApiError(res.status, message);
  }
  return res;
}

/** The Contents API wants each path segment percent-encoded but the "/" separators literal
 *  — encodeURIComponent(wholePath) would turn "/" into "%2F" and break routing. */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Verifies the token can actually read this repo. Throws GitHubApiError with a clear status
 *  (401 = bad token, 404 = repo not found or no access) if not. */
export async function verifyAccess(config: GitHubConfig): Promise<{ defaultBranch: string }> {
  const res = await gh(config, "");
  const data = await res.json();
  return { defaultBranch: data.default_branch as string };
}

/** Fetches an existing file's parsed JSON content + its blob sha (needed to update it later).
 *  Returns null if the file doesn't exist yet (new batch). */
export async function getJsonFile<T>(
  config: GitHubConfig,
  path: string,
  ref: string
): Promise<{ data: T; sha: string } | null> {
  try {
    const res = await gh(config, `/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`);
    const body = await res.json();
    return { data: JSON.parse(base64ToUtf8(body.content)) as T, sha: body.sha as string };
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getBranchSha(config: GitHubConfig, branch: string): Promise<string> {
  const res = await gh(config, `/git/ref/heads/${encodeURIComponent(branch)}`);
  const body = await res.json();
  return body.object.sha as string;
}

export async function createBranch(config: GitHubConfig, newBranch: string, fromSha: string): Promise<void> {
  await gh(config, "/git/refs", {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha }),
  });
}

/** Creates or updates a JSON file on the given branch. Pass `sha` when updating an existing
 *  file (required by the GitHub API to avoid clobbering concurrent edits). */
export async function putJsonFile(
  config: GitHubConfig,
  path: string,
  branch: string,
  data: unknown,
  message: string,
  sha?: string
): Promise<void> {
  await gh(config, `/contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch,
      content: utf8ToBase64(JSON.stringify(data, null, 2) + "\n"),
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function createPullRequest(
  config: GitHubConfig,
  opts: { title: string; head: string; base: string; body: string }
): Promise<{ url: string }> {
  const res = await gh(config, "/pulls", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  const data = await res.json();
  return { url: data.html_url as string };
}
