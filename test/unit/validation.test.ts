/**
 * Extension Error Handling & Input Validation Tests
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { 
  validateAndSanitizeIdea, 
  validateQuestionnaireAnswer,
  redactSensitivePatterns,
  validateCategory 
} from "../../src/validation";

import {
  extractErrorMessage,
  isTransientError,
  ErrorCode,
  VizierError
} from "../../src/errors";

test("validateAndSanitizeIdea - valid idea", () => {
  const result = validateAndSanitizeIdea("A mobile app for habit tracking");
  assert.strictEqual(result, "A mobile app for habit tracking");
});

test("validateAndSanitizeIdea - trims whitespace", () => {
  const result = validateAndSanitizeIdea("  A mobile app  ");
  assert.strictEqual(result, "A mobile app");
});

test("validateAndSanitizeIdea - normalizes spaces", () => {
  const result = validateAndSanitizeIdea("A  mobile   app");
  assert.strictEqual(result, "A mobile app");
});

test("validateAndSanitizeIdea - rejects empty", () => {
  assert.throws(
    () => validateAndSanitizeIdea(""),
    (err: any) => err.code === ErrorCode.INPUT_EMPTY
  );
});

test("validateAndSanitizeIdea - rejects too short", () => {
  assert.throws(
    () => validateAndSanitizeIdea("short"),
    (err: any) => err.code === ErrorCode.INPUT_EMPTY
  );
});

test("validateAndSanitizeIdea - truncates to 500 chars", () => {
  const longIdea = "A".repeat(600);
  const result = validateAndSanitizeIdea(longIdea);
  assert.strictEqual(result.length, 500);
});

test("validateQuestionnaireAnswer - choice with valid option", () => {
  const options = [{ value: "option1" }, { value: "option2" }];
  // Should not throw
  validateQuestionnaireAnswer("q1", "option1", "choice", options);
});

test("validateQuestionnaireAnswer - choice with invalid option", () => {
  const options = [{ value: "option1" }, { value: "option2" }];
  assert.throws(
    () => validateQuestionnaireAnswer("q1", "invalid", "choice", options),
    (err: any) => err.code === ErrorCode.INPUT_INVALID
  );
});

test("validateQuestionnaireAnswer - multi_select with valid options", () => {
  const options = [
    { value: "opt1" },
    { value: "opt2" },
    { value: "opt3" }
  ];
  // Should not throw
  validateQuestionnaireAnswer("q1", ["opt1", "opt3"], "multi_select", options);
});

test("validateQuestionnaireAnswer - multi_select with invalid option", () => {
  const options = [{ value: "opt1" }, { value: "opt2" }];
  assert.throws(
    () => validateQuestionnaireAnswer("q1", ["opt1", "invalid"], "multi_select", options),
    (err: any) => err.code === ErrorCode.INPUT_INVALID
  );
});

test("validateQuestionnaireAnswer - text cannot be empty", () => {
  assert.throws(
    () => validateQuestionnaireAnswer("q1", "   ", "text"),
    (err: any) => err.code === ErrorCode.INPUT_INVALID
  );
});

test("redactSensitivePatterns - redacts API keys", () => {
  const text = "My API key is api_key_sk_live_abc123def456";
  const redacted = redactSensitivePatterns(text);
  assert(redacted.includes("[REDACTED]"));
  assert(!redacted.includes("abc123def456"));
});

test("redactSensitivePatterns - redacts AWS keys", () => {
  const text = "AWS key: AKIAIOSFODNN7EXAMPLE";
  const redacted = redactSensitivePatterns(text);
  assert(redacted.includes("[REDACTED]"));
  assert(!redacted.includes("AKIAIOSFODNN7EXAMPLE"));
});

test("redactSensitivePatterns - redacts secrets", () => {
  const text = "SECRET=mysupersecretvalue123";
  const redacted = redactSensitivePatterns(text);
  assert(redacted.includes("[REDACTED]"));
});

test("redactSensitivePatterns - redacts passwords", () => {
  const text = "password: superSecurePass123";
  const redacted = redactSensitivePatterns(text);
  assert(redacted.includes("[REDACTED]"));
});

test("validateCategory - accepts valid categories", () => {
  assert.strictEqual(validateCategory("saas"), true);
  assert.strictEqual(validateCategory("mobile"), true);
  assert.strictEqual(validateCategory("cli_tool"), true);
  assert.strictEqual(validateCategory("browser_ext"), true);
  assert.strictEqual(validateCategory("game"), true);
  assert.strictEqual(validateCategory("internal_tool"), true);
});

test("validateCategory - rejects invalid categories", () => {
  assert.strictEqual(validateCategory("invalid"), false);
  assert.strictEqual(validateCategory(""), false);
  assert.strictEqual(validateCategory("   "), false);
});

test("extractErrorMessage - handles VizierError", () => {
  const error = new VizierError(ErrorCode.INPUT_EMPTY, "User message", {
    userMessage: "Please provide input"
  });
  const message = extractErrorMessage(error);
  assert.strictEqual(message, "Please provide input");
});

test("extractErrorMessage - handles INPUT_EMPTY error code", () => {
  const message = extractErrorMessage({ message: "INPUT_EMPTY" });
  assert(message.includes("empty"));
});

test("extractErrorMessage - handles CONFIG_NO_API_KEY error code", () => {
  const message = extractErrorMessage({ message: "CONFIG_NO_API_KEY" });
  assert(message.includes("API key"));
});

test("extractErrorMessage - handles NETWORK_ERROR error code", () => {
  const message = extractErrorMessage({ message: "NETWORK_ERROR" });
  assert(message.includes("Network"));
});

test("extractErrorMessage - returns fallback for unknown errors", () => {
  const message = extractErrorMessage({ message: undefined });
  assert(message.length > 0);
});

test("isTransientError - identifies timeouts as transient", () => {
  const error = { code: ErrorCode.LLM_TIMEOUT };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - identifies rate limits as transient", () => {
  const error = { code: ErrorCode.LLM_RATE_LIMIT };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - identifies network errors as transient", () => {
  const error = { code: ErrorCode.NETWORK_ERROR };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - identifies connection refused as transient", () => {
  const error = { message: "ECONNREFUSED" };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - identifies 429 status as transient", () => {
  const error = { status: 429 };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - identifies 503 status as transient", () => {
  const error = { status: 503 };
  assert.strictEqual(isTransientError(error), true);
});

test("isTransientError - marks schema errors as non-transient", () => {
  const error = { code: ErrorCode.LLM_INVALID_RESPONSE };
  assert.strictEqual(isTransientError(error), false);
});
