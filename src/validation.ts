/**
 * Input Sanitization & Validation
 * 
 * Sanitizes and validates user input to prevent injection attacks and malformed data.
 */

import { VizierError, ErrorCode } from "./errors";

/**
 * Sanitize and validate app idea input.
 * 
 * - Trims whitespace
 * - Checks length constraints
 * - Normalizes line breaks
 * - No special character restrictions (to allow flexibility)
 * 
 * @throws VizierError if validation fails
 */
export function validateAndSanitizeIdea(idea: string): string {
  if (!idea || typeof idea !== "string") {
    throw new VizierError(ErrorCode.INPUT_EMPTY, "App idea is required", {
      userMessage: "Please describe your app idea in at least 10 characters.",
    });
  }

  const sanitized = idea
    .trim()
    .replace(/\s+/g, " ")  // Normalize whitespace
    .slice(0, 500);         // Truncate to max length

  if (sanitized.length < 10) {
    throw new VizierError(ErrorCode.INPUT_EMPTY, "App idea is too short", {
      userMessage: "Please describe your idea in at least 10 characters.",
    });
  }

  return sanitized;
}

/**
 * Validate a questionnaire answer against its question type.
 */
export function validateQuestionnaireAnswer(
  questionId: string,
  value: string | string[],
  questionType: string,
  options?: Array<{ value: string }>
): void {
  if (!questionId) {
    throw new VizierError(
      ErrorCode.QUESTIONNAIRE_INVALID,
      "Question ID is required",
      { userMessage: "Invalid question. Please try again." }
    );
  }

  if (questionType === "choice") {
    if (!value || typeof value !== "string") {
      throw new VizierError(
        ErrorCode.INPUT_INVALID,
        `Invalid choice value for ${questionId}`,
        { userMessage: "Please select a valid option." }
      );
    }

    // Validate against available options
    if (options && !options.some((o) => o.value === value)) {
      throw new VizierError(
        ErrorCode.INPUT_INVALID,
        `Value "${value}" not in options for ${questionId}`,
        { userMessage: "Selected option is not valid for this question." }
      );
    }
  }

  if (questionType === "multi_select") {
    const values = Array.isArray(value) ? value : String(value).split(",").map((v) => v.trim());
    if (values.length === 0) {
      throw new VizierError(
        ErrorCode.INPUT_INVALID,
        `No values selected for multi_select ${questionId}`,
        { userMessage: "Please select at least one option." }
      );
    }

    // Validate each value against available options
    if (options) {
      const validValues = new Set(options.map((o) => o.value));
      for (const v of values) {
        if (!validValues.has(v)) {
          throw new VizierError(
            ErrorCode.INPUT_INVALID,
            `Value "${v}" not in options for ${questionId}`,
            { userMessage: "One or more selected options are not valid." }
          );
        }
      }
    }
  }

  if (questionType === "text" || questionType === "textarea") {
    if (typeof value !== "string") {
      throw new VizierError(
        ErrorCode.INPUT_INVALID,
        `Text value must be a string for ${questionId}`,
        { userMessage: "Invalid text input." }
      );
    }

    if (value.trim().length === 0) {
      throw new VizierError(
        ErrorCode.INPUT_INVALID,
        `Text cannot be empty for ${questionId}`,
        { userMessage: "This field cannot be empty." }
      );
    }
  }
}

/**
 * Redact sensitive patterns from text.
 * Used to prevent accidental exposure of secrets in logs or repo context.
 */
export function redactSensitivePatterns(text: string): string {
  if (!text) return text;

  const patterns = [
    // API keys
    /api[_-]?key[\s=:]*[\w\-\.]{20,}/gi,
    // AWS keys
    /AKIA[0-9A-Z]{16}/g,
    // Generic secrets
    /secret[\s=:]*[\w\-\.]{20,}/gi,
    /password[\s=:]*[\w\-\.]{8,}/gi,
    /token[\s=:]*[\w\-\.]{20,}/gi,
    // URLs with credentials
    /https?:\/\/[^:]+:[^@]+@/g,
    // Env variable patterns
    /\b[A-Z_]+_(?:KEY|TOKEN|SECRET|PASS)\b\s*=\s*[\w\-\.]+/g,
  ];

  let redacted = text;
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }

  return redacted;
}

/**
 * Validate category string.
 */
export function validateCategory(category: string): boolean {
  const validCategories = [
    "saas",
    "mobile",
    "cli_tool",
    "browser_ext",
    "game",
    "internal_tool",
  ];
  return validCategories.includes(category?.toLowerCase());
}
