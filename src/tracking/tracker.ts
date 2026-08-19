import { Project, Task } from "../types/pim";

export type TrackerType = "webhook" | "jira" | "linear" | "github";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  projectKey: string;
}

export interface LinearConfig {
  token: string;
  teamId: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface TrackerConfig {
  type: TrackerType;
  /** When true, build payloads but do not actually call the remote API. */
  dryRun?: boolean;
  /** When false, tasks already marked `done` are skipped. Default true. */
  includeDone?: boolean;
  webhookUrl?: string;
  jira?: JiraConfig;
  linear?: LinearConfig;
  github?: GitHubConfig;
}

export interface CreatedIssue {
  externalId?: string;
  externalKey?: string;
  url?: string;
  title: string;
}

export interface TrackerResult {
  type: TrackerType;
  attempted: number;
  created: CreatedIssue[];
  skipped: number;
  errors: string[];
}

type FetchImpl = (url: string, init: any) => Promise<any>;

const DEFAULT_FETCH: FetchImpl =
  typeof fetch !== "undefined"
    ? (fetch as unknown as FetchImpl)
    : (() => {
        throw new Error("No fetch implementation available in this environment");
      });

/* ----------------------------- payload helpers ---------------------------- */

function statusLabel(status: Task["status"]): string {
  return `status:${status}`;
}

function buildIssueTitle(task: Task): string {
  return `[${task.id}] ${task.title}`;
}

function buildIssueBody(task: Task, project: Project): string {
  const lines: string[] = [];
  lines.push(task.description || "(no description)");
  lines.push("");
  if (task.acceptance_criteria?.length) {
    lines.push("Acceptance criteria:");
    for (const ac of task.acceptance_criteria) lines.push(`- ${ac}`);
    lines.push("");
  }
  if (task.files_expected?.length) {
    lines.push("Expected files:");
    for (const f of task.files_expected) lines.push(`- ${f}`);
    lines.push("");
  }
  if (task.depends_on?.length) {
    lines.push(`Depends on: ${task.depends_on.join(", ")}`);
    lines.push("");
  }
  lines.push(
    `Effort: ${task.estimated_effort || "?"} (~${task.estimated_hours || "?"}h, ${task.story_points || "?"} pts) · Type: ${task.task_type || "?"}`
  );
  lines.push(`Project: ${project.name} (${project.category})`);
  lines.push(`Vizier task id: ${task.id}`);
  return lines.join("\n");
}

/** Atlassian Document Format (ADF) doc for Jira v3 description fields. */
function toAdf(text: string): any {
  const blocks = text.split(/\n{2,}/);
  const content = blocks.map((block) => ({
    type: "paragraph",
    content: block
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => ({ type: "text", text: line }))
  }));
  if (content.length === 0) {
    content.push({ type: "paragraph", content: [{ type: "text", text: " " }] });
  }
  return { type: "doc", version: 1, content };
}

/* ------------------------------- webhook ---------------------------------- */

async function pushWebhook(
  project: Project,
  tasks: Task[],
  url: string,
  fetchImpl: FetchImpl
): Promise<CreatedIssue[]> {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "vizier.plan",
      project: { id: project.id, name: project.name, category: project.category },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: buildIssueTitle(t),
        body: buildIssueBody(t, project),
        status: t.status
      }))
    })
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Webhook error ${res.status}: ${err}`);
  }
  return tasks.map((t) => ({ title: buildIssueTitle(t) }));
}

/* --------------------------------- Jira ----------------------------------- */

async function pushJira(
  project: Project,
  tasks: Task[],
  cfg: JiraConfig,
  fetchImpl: FetchImpl
): Promise<CreatedIssue[]> {
  const auth = Buffer.from(`${cfg.email}:${cfg.token}`).toString("base64");
  const base = cfg.baseUrl.replace(/\/$/, "");
  const created: CreatedIssue[] = [];

  for (const task of tasks) {
    const labels = [
      "vizier",
      `project:${project.category}`,
      statusLabel(task.status),
      `type:${task.task_type || "feature"}`
    ];
    const body = {
      fields: {
        project: { key: cfg.projectKey },
        summary: buildIssueTitle(task),
        description: toAdf(buildIssueBody(task, project)),
        issuetype: { name: "Task" },
        labels
      }
    };

    const res = await fetchImpl(`${base}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Jira error ${res.status} creating ${task.id}: ${err}`);
    }
    const data = await res.json();
    created.push({ externalKey: data.key, url: data.self, title: buildIssueTitle(task) });
  }
  return created;
}

/* -------------------------------- Linear ---------------------------------- */

async function pushLinear(
  project: Project,
  tasks: Task[],
  cfg: LinearConfig,
  fetchImpl: FetchImpl
): Promise<CreatedIssue[]> {
  const created: CreatedIssue[] = [];

  for (const task of tasks) {
    const mutation = `
      mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url }
        }
      }`;
    const variables = {
      input: {
        teamId: cfg.teamId,
        title: buildIssueTitle(task),
        description: buildIssueBody(task, project)
      }
    };

    const res = await fetchImpl("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.token}`
      },
      body: JSON.stringify({ query: mutation, variables })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Linear error ${res.status} creating ${task.id}: ${err}`);
    }
    const data = await res.json();
    const issue = data?.data?.issueCreate?.issue;
    if (!issue) {
      throw new Error(`Linear issueCreate failed for ${task.id}: ${JSON.stringify(data?.errors)}`);
    }
    created.push({ externalId: issue.id, externalKey: issue.identifier, url: issue.url, title: buildIssueTitle(task) });
  }
  return created;
}

/* -------------------------------- GitHub ---------------------------------- */

async function pushGitHub(
  project: Project,
  tasks: Task[],
  cfg: GitHubConfig,
  fetchImpl: FetchImpl
): Promise<CreatedIssue[]> {
  const created: CreatedIssue[] = [];

  for (const task of tasks) {
    const labels = [
      "vizier",
      statusLabel(task.status),
      `type:${task.task_type || "feature"}`
    ];
    const res = await fetchImpl(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/issues`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.token}`,
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          title: buildIssueTitle(task),
          body: buildIssueBody(task, project),
          labels
        })
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`GitHub error ${res.status} creating ${task.id}: ${err}`);
    }
    const data = await res.json();
    created.push({ externalId: String(data.number), url: data.html_url, title: buildIssueTitle(task) });
  }
  return created;
}

/* ------------------------------- orchestrator ----------------------------- */

export async function syncTasksToTracker(
  project: Project,
  config: TrackerConfig,
  fetchImpl: FetchImpl = DEFAULT_FETCH
): Promise<TrackerResult> {
  const includeDone = config.includeDone ?? true;
  const tasks = project.tasks.filter((t) => includeDone || t.status !== "done");

  const result: TrackerResult = {
    type: config.type,
    attempted: tasks.length,
    created: [],
    skipped: project.tasks.length - tasks.length,
    errors: []
  };

  if (tasks.length === 0) return result;

  try {
    if (config.dryRun) {
      result.created = tasks.map((t) => ({ title: buildIssueTitle(t) }));
      return result;
    }

    switch (config.type) {
      case "webhook":
        if (!config.webhookUrl) throw new Error("tracker.webhookUrl is not configured");
        result.created = await pushWebhook(project, tasks, config.webhookUrl, fetchImpl);
        break;
      case "jira":
        if (!config.jira) throw new Error("tracker.jira.* is not configured");
        result.created = await pushJira(project, tasks, config.jira, fetchImpl);
        break;
      case "linear":
        if (!config.linear) throw new Error("tracker.linear.* is not configured");
        result.created = await pushLinear(project, tasks, config.linear, fetchImpl);
        break;
      case "github":
        if (!config.github) throw new Error("tracker.github.* is not configured");
        result.created = await pushGitHub(project, tasks, config.github, fetchImpl);
        break;
    }
  } catch (error: any) {
    result.errors.push(error?.message || String(error));
  }

  return result;
}

export const __test = {
  buildIssueTitle,
  buildIssueBody,
  toAdf
};
