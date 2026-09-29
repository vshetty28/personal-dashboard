import { db } from "@/lib/db";
import { TIMEZONE, daysBetween, keyFromString, keyToString, localDateString, todayKey, zonedDayBounds } from "@/lib/time";

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
  projectId?: string;
  title: string;
  status: number; // 0 = open, 2 = completed
  dueDate?: string;
  priority?: number;
};

export type DashboardTask = {
  id: string;
  projectId: string;
  title: string;
  projectName: string;
  /** Whole days past due (0 = due today). */
  lateDays: number;
  overdue: boolean;
  webLink: string;
};

// Deep-links to a task in TickTick's web app. This URL pattern isn't part of the
// documented Open API — inferred from the web app's own hash-routing convention —
// so verify it actually opens the right task once real TickTick data is connected.
function ticktickTaskUrl(projectId: string, taskId: string) {
  return `https://ticktick.com/webapp/#p/${projectId}/tasks/${taskId}`;
}

async function getAccessToken() {
  const cred = await db.oAuthCredential.findUnique({ where: { provider: "TICKTICK" } });
  return cred?.accessToken ?? null;
}

/**
 * Returns open TickTick tasks due today or earlier (i.e. today's "Today" view —
 * matches TickTick's own smart list, which surfaces overdue tasks alongside
 * today's rather than hiding them), or null if not yet connected. "Today" is
 * the calendar day in DASHBOARD_TIMEZONE.
 */
export async function getTodaysTickTickTasks(): Promise<DashboardTask[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const projectsRes = await fetch(`${API_BASE}/project`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!projectsRes.ok) {
    throw new Error(`TickTick projects fetch failed: ${projectsRes.status}`);
  }
  const projects = (await projectsRes.json()) as TickTickProject[];
  // The Inbox isn't returned by /project. /project/inbox/data isn't in the documented
  // Open API; if TickTick rejects it the request is skipped like any failed project.
  const withInbox: TickTickProject[] = [{ id: "inbox", name: "Inbox" }, ...projects];

  const today = todayKey();
  const { end } = zonedDayBounds(keyToString(today));

  const results = await Promise.all(
    withInbox.map(async (project) => {
      const res = await fetch(`${API_BASE}/project/${project.id}/data`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { tasks?: TickTickTask[] };
      const tasks: DashboardTask[] = [];
      for (const task of data.tasks ?? []) {
        if (task.status !== 0 || !task.dueDate) continue;
        const due = new Date(task.dueDate);
        if (Number.isNaN(due.getTime()) || due > end) continue;
        const lateDays = Math.max(0, daysBetween(keyFromString(localDateString(due)), today));
        const projectId = task.projectId ?? project.id;
        tasks.push({
          id: task.id,
          projectId,
          title: task.title,
          projectName: project.name,
          lateDays,
          overdue: lateDays > 0,
          webLink: ticktickTaskUrl(projectId, task.id),
        });
      }
      return tasks;
    }),
  );

  // Overdue first (most late at the top), then today's in TickTick's order.
  const unique = [...new Map(results.flat().map((t) => [t.id, t])).values()];
  return unique.sort((a, b) => b.lateDays - a.lateDays);
}

/** Marks a task complete in TickTick. */
export async function completeTickTickTask(projectId: string, taskId: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("TickTick is not connected");
  const res = await fetch(
    `${API_BASE}/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`TickTick complete failed: ${res.status} ${await res.text()}`);
}

/** Creates a task due today in the TickTick Inbox (no projectId = Inbox). */
export async function createTickTickTask(title: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("TickTick is not connected");
  const res = await fetch(`${API_BASE}/task`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      isAllDay: true,
      // All-day tasks are anchored to local midnight; TickTick wants "yyyy-MM-dd'T'HH:mm:ssZ".
      dueDate: zonedDayBounds(localDateString()).start.toISOString().replace(/\.\d{3}Z$/, "+0000"),
      timeZone: TIMEZONE,
    }),
  });
  if (!res.ok) throw new Error(`TickTick create failed: ${res.status} ${await res.text()}`);
}
