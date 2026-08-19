/**
 * Vizier Error Codes & Diagnostics
 * 
 * Centralized error handling with structured error codes, messages, and diagnostics.
 */

export enum ErrorCode {
  // Configuration errors
  CONFIG_NO_API_KEY = "ERR_CONFIG_NO_API_KEY",
  CONFIG_INVALID_PROVIDER = "ERR_CONFIG_INVALID_PROVIDER",
  CONFIG_MISSING_SETTING = "ERR_CONFIG_MISSING_SETTING",

  // Input validation errors
  INPUT_EMPTY = "ERR_INPUT_EMPTY",
  INPUT_TOO_LONG = "ERR_INPUT_TOO_LONG",
  INPUT_INVALID = "ERR_INPUT_INVALID",

  // Workspace errors
  NO_WORKSPACE = "ERR_NO_WORKSPACE",
  WORKSPACE_SCAN_FAILED = "ERR_WORKSPACE_SCAN_FAILED",

  // LLM / API errors
  LLM_TIMEOUT = "ERR_LLM_TIMEOUT",
  LLM_RATE_LIMIT = "ERR_LLM_RATE_LIMIT",
  LLM_INVALID_RESPONSE = "ERR_LLM_INVALID_RESPONSE",
  LLM_SERVER_ERROR = "ERR_LLM_SERVER_ERROR",
  NETWORK_ERROR = "ERR_NETWORK_ERROR",

  // Processing errors
  CLASSIFICATION_FAILED = "ERR_CLASSIFICATION_FAILED",
  GENERATION_FAILED = "ERR_GENERATION_FAILED",
  EXPORT_FAILED = "ERR_EXPORT_FAILED",

  // State errors
  INVALID_STATE = "ERR_INVALID_STATE",
  QUESTIONNAIRE_INVALID = "ERR_QUESTIONNAIRE_INVALID",

  // User actions
  ABORTED = "ERR_ABORTED",

  // Unknown
  UNKNOWN = "ERR_UNKNOWN",
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  userMessage?: string;  // User-facing friendly message
  stage?: string;
  duration?: number;
  retryCount?: number;
  traceId?: string;
  originalError?: Error;
  suggestion?: string;  // Actionable suggestion for user
}

export class VizierError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public context?: Partial<ErrorContext>
  ) {
    super(message);
    this.name = "VizierError";
  }
}

/**
 * Extract a user-friendly error message from an error object.
 */
export function extractErrorMessage(error: any, stage?: string): string {
  // Handle VizierError
  if (error instanceof VizierError) {
    return error.context?.userMessage || error.message;
  }

  // Handle known error codes from strings
  if (typeof error.message === "string") {
    const msg = error.message.toLowerCase();
    if (msg.includes("input_empty")) return "App idea cannot be empty.";
    if (msg.includes("input_too_long")) return "App idea is too long (max 500 characters).";
    if (msg.includes("config_no_api_key")) return "No API key configured. Please set vizier.provider and the matching API key in VS Code settings.";
    if (msg.includes("config_invalid_provider")) return "Invalid provider configured. Check vizier.provider in settings.";
    if (msg.includes("network_error")) return "Network connection failed. Check your internet connection.";
    if (msg.includes("lLm_timeout")) return "LLM request timed out. Please try again or check your network.";
    if (msg.includes("lLm_rate_limit")) return "Rate limited by LLM provider. Please wait a moment and try again.";
    if (msg.includes("lLm_invalid_response")) return "LLM returned an invalid response. Please try again.";
    if (msg.includes("classification_failed")) return "Could not classify your app idea. Please try rephrasing or pick a category manually.";
    if (msg.includes("generation_failed")) return "Blueprint generation failed. Please check the console and try again.";
    if (msg.includes("no_workspace")) return "No workspace folder is open. Please open a project folder and try again.";
  }

  return error?.message || "An unknown error occurred.";
}

/**
 * Log error with context for debugging.
 * If DEBUG_MODE is enabled, outputs to console; otherwise silent.
 */
export function logError(error: any, context: Partial<ErrorContext> = {}): void {
  const timestamp = new Date().toISOString();
  const traceId = context.traceId || generateTraceId();
  
  const logEntry = {
    timestamp,
    traceId,
    code: context.code || ErrorCode.UNKNOWN,
    message: error?.message || String(error),
    stage: context.stage,
    duration: context.duration,
    retryCount: context.retryCount,
  };

  console.error("[Vizier]", logEntry);

  // Could integrate with crash reporting here (e.g., Sentry)
  // sendToErrorTracking(logEntry);
}

/**
 * Generate a unique trace ID for error correlation.
 */
export function generateTraceId(): string {
  return `vizier-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine if an error is transient (should retry).
 */
export function isTransientError(error: any): boolean {
  if (error.code === ErrorCode.LLM_TIMEOUT) return true;
  if (error.code === ErrorCode.LLM_RATE_LIMIT) return true;
  if (error.code === ErrorCode.NETWORK_ERROR) return true;
  if (error?.message?.includes("ECONNREFUSED")) return true;
  if (error?.message?.includes("ETIMEDOUT")) return true;
  if (error?.status === 429) return true;
  if (error?.status === 503) return true;
  if (error?.status === 504) return true;
  return false;
}
