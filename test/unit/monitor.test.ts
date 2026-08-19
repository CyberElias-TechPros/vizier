import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { analyzePlanStatus, renderStatusReportMarkdown } from "../../src/monitor";

function makeProject(): any {
  return {
    name: "Test App",
    schemaVersion: "1.0",
    id: "x",
    category: "saas",
    created_at: "",
    updated_at: "",
    product: {},
    requirements: [],
    features: [],
    architecture: null,
    entities: [],
    api_contract: null,
    tasks: [
      {
        id: "TASK-001",
        title: "Scaffold",
        description: "",
        depends_on: [],
        status: "not_started",
        acceptance_criteria: [],
        files_expected: ["src/index.ts"],
        requirement_ids: [],
        estimated_effort: "small",
        estimated_hours: 1,
        story_points: 1,
        task_type: "setup"
      },
      {
        id: "TASK-002",
        title: "Feature",
        description: "",
        depends_on: ["TASK-001"],
        status: "not_started",
        acceptance_criteria: [],
        files_expected: ["src/feature.ts"],
        requirement_ids: [],
        estimated_effort: "small",
        estimated_hours: 1,
        story_points: 1,
        task_type: "feature"
      },
      {
        id: "TASK-003",
        title: "No files",
        description: "",
        depends_on: [],
        status: "not_started",
        acceptance_criteria: [],
        files_expected: [],
        requirement_ids: [],
        estimated_effort: "small",
        estimated_hours: 1,
        story_points: 1,
        task_type: "feature"
      }
    ],
    decisions: [],
    rules: [],
    context_packs: [],
    perspectives: {},
    repo_context: null
  };
}

test("analyzePlanStatus: local, privacy-preserving progress detection", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-"));
  fs.mkdirSync(path.join(ws, "src"), { recursive: true });
  fs.writeFileSync(path.join(ws, "src", "index.ts"), "export const x = 1;", "utf8");
  // TASK-003 has no expected files; reference it in a stray note -> in_progress
  fs.writeFileSync(path.join(ws, "notes.txt"), "see TASK-003 for details", "utf8");
  fs.mkdirSync(path.join(ws, "plan"), { recursive: true });
  fs.writeFileSync(path.join(ws, "plan", "plan.json"), JSON.stringify(makeProject()), "utf8");

  const report = analyzePlanStatus(ws);

  assert.equal(report.total, 3);
  assert.equal(report.byStatus.done, 1, "TASK-001 done (file present)");
  assert.equal(report.byStatus.in_progress, 1, "TASK-003 in_progress (referenced)");
  assert.equal(report.byStatus.not_started, 1, "TASK-002 not_started (missing file)");
  assert.equal(report.tasks.find((t) => t.id === "TASK-001")!.status, "done");
  assert.equal(report.tasks.find((t) => t.id === "TASK-002")!.status, "not_started");
  assert.equal(report.tasks.find((t) => t.id === "TASK-003")!.status, "in_progress");
  assert.equal(report.progressPercent, 33);
  assert.ok(report.privacy.toLowerCase().includes("local"), "privacy statement present");
});

test("analyzePlanStatus: no plan -> graceful report", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-empty-"));
  const report = analyzePlanStatus(ws);
  assert.equal(report.total, 0);
  assert.ok(report.notes.some((n) => n.toLowerCase().includes("no vizier plan")));
});

test("renderStatusReportMarkdown includes summary + privacy + disclaimer", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-md-"));
  fs.mkdirSync(path.join(ws, "plan"), { recursive: true });
  fs.writeFileSync(path.join(ws, "plan", "plan.json"), JSON.stringify(makeProject()), "utf8");
  fs.mkdirSync(path.join(ws, "src"), { recursive: true });
  fs.writeFileSync(path.join(ws, "src", "index.ts"), "x", "utf8");

  const md = renderStatusReportMarkdown(analyzePlanStatus(ws));
  assert.ok(md.includes("Plan Progress Report"));
  assert.ok(md.includes("Progress"));
  assert.ok(md.includes("Disclaimer"));
});

test("analyzePlanStatus persists progress history when requested", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-hist-"));
  fs.mkdirSync(path.join(ws, "plan"), { recursive: true });
  fs.writeFileSync(path.join(ws, "plan", "plan.json"), JSON.stringify(makeProject()), "utf8");

  const first = analyzePlanStatus(ws, { persistHistory: true });
  const second = analyzePlanStatus(ws, { persistHistory: true });
  assert.equal(second.history.length, 2, "history accumulates snapshots");
  assert.equal(second.trend, 0, "trend vs previous snapshot is 0 (no change)");

  const histPath = path.join(ws, "plan", ".progress-history.json");
  assert.ok(fs.existsSync(histPath), "history file written");
  assert.ok(first.privacy.toLowerCase().includes("local"));
});

test("verified reflects ACTUAL passing tests (Jest JSON)", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-jest-"));
  fs.mkdirSync(path.join(ws, "src"), { recursive: true });
  fs.mkdirSync(path.join(ws, "plan"), { recursive: true });
  fs.writeFileSync(path.join(ws, "src", "index.ts"), "export const x = 1;", "utf8");
  const testFile = path.join(ws, "src", "index.test.ts");
  fs.writeFileSync(testFile, "test('ok', () => {});", "utf8");
  fs.writeFileSync(
    path.join(ws, "jest-results.json"),
    JSON.stringify({
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      testResults: [{ testFilePath: testFile, status: "passed", assertionResults: [] }]
    }),
    "utf8"
  );
  fs.writeFileSync(path.join(ws, "plan", "plan.json"), JSON.stringify(makeProject()), "utf8");

  const report = analyzePlanStatus(ws);
  assert.ok(report.testReport, "test report parsed");
  assert.equal(report.testReport!.passed, 1);
  assert.equal(report.testReport!.failed, 0);
  const t = report.tasks.find((x) => x.id === "TASK-001")!;
  assert.equal(t.testsPassing, true, "associated test passing -> testsPassing");
  assert.equal(t.verified, true, "done + passing tests -> verified");
});

test("failing test suite prevents verified (JUnit XML)", () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mon-junit-"));
  fs.mkdirSync(path.join(ws, "src"), { recursive: true });
  fs.mkdirSync(path.join(ws, "plan"), { recursive: true });
  fs.writeFileSync(path.join(ws, "src", "index.ts"), "export const x = 1;", "utf8");
  fs.writeFileSync(path.join(ws, "src", "index.test.ts"), "test('bad', () => {});", "utf8");
  fs.writeFileSync(
    path.join(ws, "junit.xml"),
    `<?xml version="1.0"?>
<testsuite name="x" tests="1" failures="1" errors="0" skipped="0">
  <testcase name="fails" classname="y"><failure>boom</failure></testcase>
</testsuite>`,
    "utf8"
  );
  fs.writeFileSync(path.join(ws, "plan", "plan.json"), JSON.stringify(makeProject()), "utf8");

  const report = analyzePlanStatus(ws);
  assert.ok(report.testReport, "junit report parsed");
  assert.equal(report.testReport!.failed, 1);
  const t = report.tasks.find((x) => x.id === "TASK-001")!;
  assert.equal(t.testsPassing, false, "failing suite -> not testsPassing");
  assert.equal(t.verified, false, "failing tests -> not verified");
});

