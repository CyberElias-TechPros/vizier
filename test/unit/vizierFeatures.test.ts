import { test } from "node:test";
import assert from "node:assert";
import { parseAndValidate, extractJsonObject, ValidationError } from "../../src/llm/schemas";
import { augmentWithTestingTasks } from "../../src/core/taskAugment";
import { detectLanguages, detectFrameworks, buildSummary, redactSecrets } from "../../src/core/repoAnalysis";
import { Task, Entity, ApiContract, RepoContext } from "../../src/types/pim";
import { QUESTION_BANKS } from "../../src/types/questionBank";

// ---------- extractJsonObject ----------

test("extractJsonObject handles fenced code block", () => {
  const text = "Here is the result:\n```json\n{\"a\": 1}\n```\nThanks!";
  const obj = extractJsonObject(text) as any;
  assert.equal(obj.a, 1);
});

test("extractJsonObject handles trailing prose", () => {
  const text = '{"vision":"x","n":2} some extra text not json';
  const obj = extractJsonObject(text) as any;
  assert.equal(obj.vision, "x");
  assert.equal(obj.n, 2);
});

test("extractJsonObject handles nested braces", () => {
  const text = 'prefix {"outer": {"inner": "}" },"ok": true} suffix';
  const obj = extractJsonObject(text) as any;
  assert.equal(obj.ok, true);
  assert.equal((obj.outer as any).inner, "}");
});

test("extractJsonObject throws on empty", () => {
  assert.throws(() => extractJsonObject(""), /Empty response/);
});

// ---------- parseAndValidate ----------

test("parseAndValidate prd passes for valid object", () => {
  const text = JSON.stringify({
    vision: "V",
    target_audience: "T",
    mvp_scope: "M",
    phase2_scope: "P",
    core_workflows: ["a", "b"]
  });
  const r = parseAndValidate(text, "prd");
  assert.equal(r.vision, "V");
  assert.deepEqual(r.core_workflows, ["a", "b"]);
});

test("parseAndValidate tasks coerces numeric estimates", () => {
  const text = JSON.stringify({
    tasks: [
      {
        id: "TASK-001",
        title: "Do thing",
        description: "d",
        depends_on: [],
        acceptance_criteria: [],
        files_expected: [],
        requirement_ids: [],
        estimated_effort: "medium",
        estimated_hours: "5",
        story_points: 3
      }
    ]
  });
  const r = parseAndValidate(text, "tasks");
  assert.equal(r.tasks[0].estimated_hours, 5);
  assert.equal(r.tasks[0].story_points, 3);
});

test("parseAndValidate tasks defaults missing array to []", () => {
  const r = parseAndValidate("{}", "tasks");
  assert.deepEqual(r.tasks, []);
});

test("parseAndValidate architecture tolerates missing sub-objects", () => {
  const r = parseAndValidate("{}", "architecture");
  assert.ok(r.frontend);
  assert.ok(r.database);
});

test("parseAndValidate throws ValidationError on malformed object", () => {
  assert.throws(() => parseAndValidate("not json at all", "prd"), ValidationError);
});

// ---------- augmentWithTestingTasks ----------

function makeTask(id: string, title: string): Task {
  return {
    id,
    title,
    description: "desc",
    depends_on: [],
    status: "not_started",
    acceptance_criteria: [],
    files_expected: [],
    requirement_ids: [],
    estimated_effort: "medium",
    estimated_hours: 4,
    story_points: 3,
    task_type: "feature"
  };
}

function makeEntity(name: string): Entity {
  return {
    id: "ENT-001",
    name,
    fields: [{ name: "id", type: "string", required: true, unique: true, indexed: true }],
    relationships: []
  };
}

function makeApi(endpoints: any[]): ApiContract {
  return { endpoints, notes: "" };
}

test("augmentWithTestingTasks adds setup, per-entity, api, and e2e tasks", () => {
  const base = [makeTask("TASK-001", "Scaffold"), makeTask("TASK-002", "Build")];
  const entities = [makeEntity("User"), makeEntity("Habit")];
  const api = makeApi([{ method: "GET", path: "/x", summary: "s", auth: true, tags: [] }]);

  const result = augmentWithTestingTasks(base, entities, api);

  const setup = result.find((t) => t.task_type === "setup");
  const entityTests = result.filter((t) => t.title.includes("entity"));
  const apiTest = result.find((t) => t.title.includes("API contract tests"));
  const e2e = result.find((t) => t.title.includes("End-to-end"));

  assert.ok(setup, "setup task exists");
  assert.equal(entityTests.length, 2, "one test task per entity");
  assert.ok(apiTest, "api test task exists");
  assert.ok(e2e, "e2e task exists");
  assert.ok(e2e!.depends_on.includes(apiTest!.id), "e2e depends on api test");
  assert.ok(e2e!.depends_on.includes(setup!.id), "e2e depends on setup");
});

test("augmentWithTestingTasks produces a valid DAG (all deps resolve)", () => {
  const base = [makeTask("TASK-001", "A"), makeTask("TASK-002", "B")];
  const result = augmentWithTestingTasks(base, [makeEntity("X")], makeApi([]));
  const ids = new Set(result.map((t) => t.id));
  for (const t of result) {
    for (const dep of t.depends_on) {
      assert.ok(ids.has(dep), `Task ${t.id} depends on existing ${dep}`);
    }
  }
});

test("augmentWithTestingTasks keeps sequential TASK ids", () => {
  const base = [makeTask("TASK-001", "A")];
  const result = augmentWithTestingTasks(base, [], makeApi([]));
  const nums = result.map((t) => parseInt(t.id.replace("TASK-", ""), 10));
  for (let i = 1; i < nums.length; i++) {
    assert.equal(nums[i], nums[i - 1] + 1, "ids are sequential");
  }
});

// ---------- repoAnalysis ----------

test("detectLanguages maps extensions to language names", () => {
  const langs = detectLanguages(new Set([".ts", ".tsx", ".py", ".unknownext"]));
  assert.ok(langs.includes("TypeScript"));
  assert.ok(langs.includes("Python"));
  assert.equal(langs.includes("unknownext"), false);
});

test("detectFrameworks detects from deps and config files", () => {
  const frameworks = detectFrameworks(
    { react: "1.0.0", next: "1.0.0", prisma: "1.0.0" },
    { tailwindcss: "1.0.0" },
    ["next.config.js"]
  );
  assert.ok(frameworks.includes("React"));
  assert.ok(frameworks.includes("Next.js"));
  assert.ok(frameworks.includes("Prisma"));
  assert.ok(frameworks.includes("Tailwind CSS"));
});

test("buildSummary includes frameworks and existing-plan note", () => {
  const ctx: RepoContext = {
    exists: true,
    root: "/tmp/x",
    packageJson: { name: "demo", dependencies: { react: "1" }, devDependencies: {}, scripts: {} },
    languages: ["TypeScript"],
    frameworks: ["React", "Next.js"],
    fileCount: 42,
    topDirectories: ["src", "tests"],
    hasExistingPlan: true,
    summary: ""
  };
  const summary = buildSummary(ctx);
  assert.ok(summary.includes("Next.js"));
  assert.ok(summary.includes("Existing plan"));
  assert.ok(summary.includes("42"));
});

// ---------- redactSecrets ----------

test("redactSecrets masks API keys and private keys", () => {
  const input = "key=sk-ant-abcdefghijklmnopqrstuvwxyz123456 and AKIAIOSFODNN7EXAMPLE and password=supersecret123";
  const out = redactSecrets(input);
  assert.ok(!out.includes("sk-ant-abcdefghijklmnopqrstuvwxyz123456"));
  assert.ok(!out.includes("AKIAIOSFODNN7EXAMPLE"));
  assert.ok(!out.includes("supersecret123"));
  assert.ok(out.includes("[REDACTED]"));
});

test("redactSecrets preserves normal text", () => {
  const out = redactSecrets("This project uses React and Next.js.");
  assert.equal(out, "This project uses React and Next.js.");
});

// ---------- question banks ----------

test("all six categories have question banks (no dead-ends)", () => {
  for (const cat of ["saas", "mobile", "cli_tool", "browser_ext", "game", "internal_tool"]) {
    assert.ok(QUESTION_BANKS[cat], `missing bank for ${cat}`);
    assert.ok(QUESTION_BANKS[cat].length >= 8, `${cat} should have >= 8 questions`);
  }
});
