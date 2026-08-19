import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePlan } from "../../src/core/eval";

function goodPlan(): any {
  return {
    name: "Test App",
    category: "saas",
    product: { vision: "v", target_audience: "a", mvp_scope: "m" },
    architecture: { frontend: {}, backend: {}, database: {}, auth: {}, storage: {}, infrastructure: {} },
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

test("a complete plan scores 100", () => {
  const r = evaluatePlan(goodPlan());
  assert.equal(r.score, 100);
  assert.equal(r.issues.length, 0);
});

test("a broken plan scores lower and reports issues", () => {
  const bad = {
    product: {},
    architecture: null,
    tasks: [
      { id: "A", title: "t", status: "bogus", acceptance_criteria: [], files_expected: [], depends_on: ["MISSING"], task_type: "feature" }
    ]
  };
  const r = evaluatePlan(bad);
  assert.ok(r.score < 100);
  assert.ok(r.issues.length > 0);
  assert.ok(r.checks.some((c) => !c.ok && c.name === "dependency integrity"));
  assert.ok(r.checks.some((c) => !c.ok && c.name === "task statuses valid"));
});

test("code tasks without expected files are flagged", () => {
  const p = goodPlan();
  p.tasks[0].files_expected = [];
  const r = evaluatePlan(p);
  assert.ok(!r.checks.find((c) => c.name === "code tasks declare expected files")?.ok);
});
