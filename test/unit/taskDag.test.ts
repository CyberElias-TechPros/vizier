import { test } from "node:test";
import assert from "node:assert";
import { topologicalSort, detectCycles, validateDag, calculateProgress, getNextTasks, getBlockedTasks } from "../../src/core/taskDag.ts";
import { generateContextPack } from "../src/core/contextPack.ts";

test("detectCycles returns empty for valid DAG", () => {
  const tasks = [
    { id: "TASK-001", depends_on: [] },
    { id: "TASK-002", depends_on: ["TASK-001"] },
    { id: "TASK-003", depends_on: ["TASK-002"] }
  ];
  const cycles = detectCycles(tasks);
  assert.deepStrictEqual(cycles, []);
});

test("detectCycles finds simple cycle", () => {
  const tasks = [
    { id: "TASK-001", depends_on: ["TASK-002"] },
    { id: "TASK-002", depends_on: ["TASK-001"] }
  ];
  const cycles = detectCycles(tasks);
  assert.ok(cycles.length > 0, "Should detect cycle");
});

test("detectCycles finds self-dependency", () => {
  const tasks = [
    { id: "TASK-001", depends_on: ["TASK-001"] }
  ];
  const cycles = detectCycles(tasks);
  assert.ok(cycles.length > 0, "Should detect self-dependency");
});

test("topologicalSort orders dependencies first", () => {
  const tasks = [
    { id: "TASK-001", depends_on: [] },
    { id: "TASK-002", depends_on: ["TASK-001"] },
    { id: "TASK-003", depends_on: ["TASK-001", "TASK-002"] }
  ];
  const sorted = topologicalSort(tasks);
  const ids = sorted.map((t: any) => t.id);
  assert.equal(ids[0], "TASK-001");
  assert.equal(ids[1], "TASK-002");
  assert.equal(ids[2], "TASK-003");
});

test("topologicalSort handles tasks with no dependencies", () => {
  const tasks = [
    { id: "TASK-001", depends_on: [] },
    { id: "TASK-002", depends_on: [] }
  ];
  const sorted = topologicalSort(tasks);
  assert.equal(sorted.length, 2);
});

test("validateDag passes for valid DAG", () => {
  const tasks = [
    { id: "TASK-001", depends_on: [] },
    { id: "TASK-002", depends_on: ["TASK-001"] }
  ];
  const result = validateDag(tasks);
  assert.equal(result.valid, true);
  assert.deepStrictEqual(result.errors, []);
});

test("validateDag detects invalid references", () => {
  const tasks = [
    { id: "TASK-001", depends_on: ["TASK-999"] }
  ];
  const result = validateDag(tasks);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e: string) => e.includes("non-existent")));
});

test("calculateProgress returns correct percentage", () => {
  const tasks = [
    { id: "TASK-001", status: "done" },
    { id: "TASK-002", status: "done" },
    { id: "TASK-003", status: "not_started" },
    { id: "TASK-004", status: "not_started" }
  ];
  const progress = calculateProgress(tasks);
  assert.equal(progress.total, 4);
  assert.equal(progress.done, 2);
  assert.equal(progress.percentage, 50);
});

test("getNextTasks returns tasks with all deps met", () => {
  const tasks = [
    { id: "TASK-001", status: "done", depends_on: [] },
    { id: "TASK-002", status: "not_started", depends_on: ["TASK-001"] },
    { id: "TASK-003", status: "not_started", depends_on: ["TASK-002"] }
  ];
  const next = getNextTasks(tasks, ["TASK-001"]);
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "TASK-002");
});

test("getBlockedTasks returns tasks with unmet deps", () => {
  const tasks = [
    { id: "TASK-001", status: "not_started", depends_on: [] },
    { id: "TASK-002", status: "not_started", depends_on: ["TASK-001"] }
  ];
  const blocked = getBlockedTasks(tasks, []);
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].id, "TASK-002");
});
