import { db } from "@/lib/db";

// TickTick's Open API (developer.ticktick.com/docs). Register an app there to get
// a client id/secret and register the redirect URI used below.
const AUTH_URL = "https://ticktick.com/oauth/authorize";
const TOKEN_URL = "https://ticktick.com/oauth/token";
const API_BASE = "https://api.ticktick.com/open/v1";
const SCOPE = "tasks:read tasks:write";

export function getTickTickAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.TICKTICK_CLIENT_ID!,
    scope: SCOPE,
    redirect_uri: process.env.TICKTICK_REDIRECT_URI!,
    response_type: "code",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeTickTickCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${process.env.TICKTICK_CLIENT_ID}:${process.env.TICKTICK_CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TICKTICK_REDIRECT_URI!,
      scope: SCOPE,
    }),
  });

  if (!res.ok) {
    throw new Error(`TickTick token exchange failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{ access_token: string; token_type: string; expires_in?: number }>;
}

type TickTickProject = { id: string; name: string };
type TickTickTask = {
  id: string;
  title: string;
  status: number; // 0 = open, 2 = completed
  dueDate?: string;
  priority?: number;
};

function endOfLocalDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Deep-links to a task in TickTick's web app. This URL pattern isn't part of the
// documented Open API — inferred from the web app's own hash-routing convention —
// so verify it actually opens the right task once real TickTick data is connected.
function ticktickTaskUrl(projectId: string, taskId: string) {
  return `https://ticktick.com/webapp/#p/${projectId}/tasks/${taskId}`;
}

/**
 * Returns open TickTick tasks due today or earlier (i.e. today's "Today" view —
 * matches TickTick's own smart list, which surfaces overdue tasks alongside
 * today's rather than hiding them), or null if not yet connected.
 */
export async function getTodaysTickTickTasks() {
  const cred = await db.oAuthCredential.findUnique({ where: { provider: "TICKTICK" } });
  if (!cred) return null;

  const projectsRes = await fetch(`${API_BASE}/project`, {
    headers: { Authorization: `Bearer ${cred.accessToken}` },
  });
  if (!projectsRes.ok) {
    throw new Error(`TickTick projects fetch failed: ${projectsRes.status}`);
  }
  const projects = (await projectsRes.json()) as TickTickProject[];

  const now = new Date();
  const cutoff = endOfLocalDay(now);
  const tasks: (TickTickTask & { projectName: string; overdue: boolean; webLink: string })[] = [];
  for (const project of projects) {
    const res = await fetch(`${API_BASE}/project/${project.id}/data`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { tasks?: TickTickTask[] };
    for (const task of data.tasks ?? []) {
      if (task.status !== 0 || !task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      if (dueDate > cutoff) continue;
      tasks.push({
        ...task,
        projectName: project.name,
        overdue: dueDate < now,
        webLink: ticktickTaskUrl(project.id, task.id),
      });
    }
  }

  return tasks;
}
