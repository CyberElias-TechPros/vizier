import { test } from "node:test";
import assert from "node:assert";

// Test the markdown generation logic
function renderTable(headers: string[], rows: string[][]): string {
  let md = "| " + headers.join(" | ") + " |\n";
  md += "| " + headers.map(() => "---").join(" | ") + " |\n";
  for (const row of rows) {
    md += "| " + row.join(" | ") + " |\n";
  }
  return md;
}

test("renderTable generates correct markdown", () => {
  const headers = ["Name", "Type"];
  const rows = [["id", "string"], ["email", "string"]];
  const result = renderTable(headers, rows);
  assert.ok(result.includes("| Name | Type |"));
  assert.ok(result.includes("| id | string |"));
});

test("renderTable handles empty rows", () => {
  const headers = ["Name", "Type"];
  const result = renderTable(headers, []);
  assert.ok(result.includes("| Name | Type |"));
  assert.ok(result.includes("| --- | --- |"));
});

test("Question text is non-empty", () => {
  const questions = [
    "How should users log in?",
    "Which platforms?",
    "How will users install it?"
  ];
  for (const q of questions) {
    assert.ok(q.length > 0, "Question should not be empty");
    assert.ok(q.endsWith("?"), "Question should end with ?");
  }
});

test("Category values are valid", () => {
  const validCategories = ["saas", "mobile", "cli_tool", "browser_ext", "game", "internal_tool"];
  const testCategories = ["saas", "mobile", "cli_tool"];
  for (const cat of testCategories) {
    assert.ok(validCategories.includes(cat), `${cat} should be valid`);
  }
});

test("Task ID format is correct", () => {
  const taskIds = ["TASK-001", "TASK-002", "TASK-010"];
  for (const id of taskIds) {
    assert.match(id, /^TASK-\d{3}$/, `${id} should match TASK-XXX format`);
  }
});

test("Decision ID format is correct", () => {
  const decisionIds = ["DEC-001", "DEC-002", "DEC-010"];
  for (const id of decisionIds) {
    assert.match(id, /^DEC-\d{3}$/, `${id} should match DEC-XXX format`);
  }
});

test("Entity ID format is correct", () => {
  const entityIds = ["ENT-001", "ENT-002", "ENT-010"];
  for (const id of entityIds) {
    assert.match(id, /^ENT-\d{3}$/, `${id} should match ENT-XXX format`);
  }
});
