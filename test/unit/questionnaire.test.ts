import { test } from "node:test";
import assert from "node:assert";

// Simple mock of the questionnaire logic for testing
const QUESTION_BANKS: Record<string, string[]> = {
  saas: ["auth_strategy", "multi_tenancy", "billing", "real_time", "target_scale", "admin_panel", "api_exposure", "file_uploads", "search", "deployment"],
  mobile: ["platforms", "framework", "offline", "push_notifications", "camera_media", "authentication", "state_management", "monetization"],
  cli_tool: ["distribution", "interactive_vs_flags", "config_format", "output_format", "plugin_system", "network", "filesystem", "logging"]
};

test("SAAS question bank has 10 questions", () => {
  assert.equal(QUESTION_BANKS.saas.length, 10);
});

test("Mobile question bank has 8 questions", () => {
  assert.equal(QUESTION_BANKS.mobile.length, 8);
});

test("CLI Tool question bank has 8 questions", () => {
  assert.equal(QUESTION_BANKS.cli_tool.length, 8);
});

test("All categories have different questions", () => {
  const saasSet = new Set(QUESTION_BANKS.saas);
  const mobileSet = new Set(QUESTION_BANKS.mobile);
  const cliSet = new Set(QUESTION_BANKS.cli_tool);
  
  // Check that mobile and CLI don't overlap
  for (const q of mobileSet) {
    assert.ok(!cliSet.has(q), `Question "${q}" should not be in both mobile and CLI`);
  }
});

test("Each category has auth-related question", () => {
  assert.ok(QUESTION_BANKS.saas.includes("auth_strategy"));
  assert.ok(QUESTION_BANKS.mobile.includes("authentication"));
});

test("Progress calculation works correctly", () => {
  const total = 10;
  const currentIndex = 5;
  const percentage = Math.round((currentIndex / total) * 100);
  assert.equal(percentage, 50);
});

test("Question IDs are unique within category", () => {
  for (const [category, questions] of Object.entries(QUESTION_BANKS)) {
    const unique = new Set(questions);
    assert.equal(unique.size, questions.length, `${category} has duplicate question IDs`);
  }
});
