import { test } from "node:test";
import assert from "node:assert/strict";
import { syncTasksToTracker, TrackerConfig, __test } from "../../src/tracking/tracker";

void __test;

function makeProject(): any {
  return {
    name: "Test App",
    category: "saas",
    product: { vision: "v", target_audience: "a", mvp_scope: "m" },
    architecture: {
      frontend: {}, backend: {}, database: {}, auth: {}, storage: {}, infrastructure: {}
    },
    tasks: [
      {
        id: "T1", title: "t1", description: "d", status: "not_started",
        acceptance_criteria: ["ac"], files_expected: ["a.ts"], depends_on: [],
        estimated_effort: "small", estimated_hours: 2, story_points: 1,
        task_type: "feature", priority: "must"
      },
      {
        id: "T2", title: "t2", description: "d", status: "done",
        acceptance_criteria: ["ac"], files_expected: ["b.ts"], depends_on: ["T1"],
        estimated_effort: "medium", estimated_hours: 4, story_points: 2,
        task_type: "infra", priority: "should"
      }
    ],
    perspectives: { sec: { roleId: "sec", label: "Security", summary: "s", recommendations: [], risks: [], open_questions: [] } },
    decisions: [{ topic: "t", options: [], chosen: "c", rationale: "r", impacts: [], status: "approved" }],
    rules: [{ category: "security", text: "t", rationale: "r" }]
  };
}

function recordingFetch() {
  const calls: any[] = [];
  const fn: any = async (url: string, init: any) => {
    calls.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        key: "PROJ-1",
        number: 1,
        html_url: "u",
        identifier: "T-1",
        id: "l1",
        url: "lu",
        data: { issueCreate: { success: true, issue: { id: "l1", identifier: "T-1", url: "lu" } } }
      })
    };
  };
  return { fn, calls };
}

test("buildIssueTitle helper", () => {
  assert.equal(__test.buildIssueTitle({ id: "T1", title: "x" } as any), "[T1] x");
});

test("Jira: POSTs to /rest/api/3/issue with Basic auth + ADF", async () => {
  const { fn, calls } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "jira", jira: { baseUrl: "https://x.atlassian.net/", email: "e@x.com", token: "tok", projectKey: "PROJ" } },
    fn
  );
  assert.equal(res.created.length, 2);
  assert.ok(calls[0].url.endsWith("/rest/api/3/issue"));
  assert.equal(calls[0].init.headers.Authorization, "Basic " + Buffer.from("e@x.com:tok").toString("base64"));
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.fields.project.key, "PROJ");
  assert.equal(body.fields.summary, "[T1] t1");
  assert.equal(body.fields.description.type, "doc");
  assert.ok(body.fields.labels.includes("vizier"));
});

test("GitHub: POSTs to /repos/owner/repo/issues with Bearer", async () => {
  const { fn, calls } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "github", github: { token: "ghp", owner: "o", repo: "r" } },
    fn
  );
  assert.equal(res.created.length, 2);
  assert.equal(calls[0].url, "https://api.github.com/repos/o/r/issues");
  assert.equal(calls[0].init.headers.Authorization, "Bearer ghp");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.title, "[T1] t1");
  assert.ok(body.labels.includes("vizier"));
});

test("Linear: POSTs GraphQL issueCreate with teamId + priority", async () => {
  const { fn, calls } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "linear", linear: { token: "lin", teamId: "TEAM" } },
    fn
  );
  assert.equal(res.created.length, 2);
  assert.equal(calls[0].url, "https://api.linear.app/graphql");
  assert.equal(calls[0].init.headers.Authorization, "Bearer lin");
  const body = JSON.parse(calls[0].init.body);
  assert.ok(body.query.includes("issueCreate"));
  assert.equal(body.variables.input.teamId, "TEAM");
});

test("Webhook: POSTs plan JSON to the configured URL", async () => {
  const { fn, calls } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "webhook", webhookUrl: "https://hook.example/ingest" },
    fn
  );
  assert.equal(res.created.length, 2);
  assert.equal(calls[0].url, "https://hook.example/ingest");
});

test("dryRun builds payloads without calling the API", async () => {
  const { fn, calls } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "github", dryRun: true, github: { token: "t", owner: "o", repo: "r" } },
    fn
  );
  assert.equal(res.created.length, 2);
  assert.equal(calls.length, 0);
});

test("includeDone=false skips done tasks", async () => {
  const { fn } = recordingFetch();
  const res = await syncTasksToTracker(
    makeProject(),
    { type: "webhook", includeDone: false, webhookUrl: "https://h" },
    fn
  );
  assert.equal(res.attempted, 1);
  assert.equal(res.skipped, 1);
});

test("missing config returns errors instead of throwing", async () => {
  const { fn } = recordingFetch();
  const res = await syncTasksToTracker(makeProject(), { type: "jira" } as TrackerConfig, fn);
  assert.equal(res.created.length, 0);
  assert.ok(res.errors.length > 0);
});
