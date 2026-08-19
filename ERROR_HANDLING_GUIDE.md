# Error Handling & Validation Quick Reference

**For Vizier developers: A quick guide to the new error infrastructure**

---

## Error Codes & Messages

### Importing Error Infrastructure
```typescript
import { 
  ErrorCode, 
  VizierError, 
  extractErrorMessage,
  logError,
  isTransientError 
} from "./errors";
```

### Using Error Codes

```typescript
// Throw an error
throw new VizierError(ErrorCode.INPUT_EMPTY, "App idea is required", {
  userMessage: "Please describe your app idea in at least 10 characters.",
  stage: "classification"
});

// Catch and extract message
catch (error: any) {
  const userMessage = extractErrorMessage(error);
  vscode.window.showErrorMessage(userMessage);
  
  logError(error, { 
    code: ErrorCode.GENERATION_FAILED,
    stage: "blueprint",
    traceId: generateTraceId()
  });
}

// Check if error is retryable
if (isTransientError(error)) {
  // Retry logic
}
```

### All Error Codes

```typescript
// Configuration errors
ErrorCode.CONFIG_NO_API_KEY
ErrorCode.CONFIG_INVALID_PROVIDER
ErrorCode.CONFIG_MISSING_SETTING

// Input validation errors
ErrorCode.INPUT_EMPTY
ErrorCode.INPUT_TOO_LONG
ErrorCode.INPUT_INVALID

// Workspace errors
ErrorCode.NO_WORKSPACE
ErrorCode.WORKSPACE_SCAN_FAILED

// LLM / API errors
ErrorCode.LLM_TIMEOUT
ErrorCode.LLM_RATE_LIMIT
ErrorCode.LLM_INVALID_RESPONSE
ErrorCode.LLM_SERVER_ERROR
ErrorCode.NETWORK_ERROR

// Processing errors
ErrorCode.CLASSIFICATION_FAILED
ErrorCode.GENERATION_FAILED
ErrorCode.EXPORT_FAILED

// State errors
ErrorCode.INVALID_STATE
ErrorCode.QUESTIONNAIRE_INVALID

// User actions
ErrorCode.ABORTED

// Unknown
ErrorCode.UNKNOWN
```

---

## Input Validation

### Importing Validation Functions
```typescript
import {
  validateAndSanitizeIdea,
  validateQuestionnaireAnswer,
  redactSensitivePatterns,
  validateCategory
} from "./validation";
```

### Validating User Input

```typescript
// Validate & sanitize app idea
const idea = "  A mobile app  ";
const sanitized = validateAndSanitizeIdea(idea);
// Returns: "A mobile app"
// Throws: VizierError if invalid

// Validate questionnaire answer
validateQuestionnaireAnswer(
  "q1",           // questionId
  "option1",      // value
  "choice",       // questionType: "choice" | "multi_select" | "text" | "textarea"
  options         // Array<{ value: string }>
);
// Throws: VizierError if invalid

// Redact secrets before logging
const text = "API key: sk_live_abc123...";
const safe = redactSensitivePatterns(text);
// Returns: "API key: [REDACTED]..."

// Validate category
const isValid = validateCategory("saas");  // true
const invalid = validateCategory("xyz");   // false
```

---

## Logging & Debugging

### Log an Error
```typescript
import { logError, ErrorCode, generateTraceId } from "./errors";

try {
  // some operation
} catch (error) {
  logError(error, {
    code: ErrorCode.GENERATION_FAILED,
    stage: "blueprint",
    duration: 1500,
    retryCount: 2,
    traceId: generateTraceId()
  });
}

// Output in console:
// [Vizier] {
//   timestamp: "2026-08-16T12:34:56.789Z",
//   traceId: "vizier-1692188096789-a1b2c3d",
//   code: "ERR_GENERATION_FAILED",
//   message: "Blueprint generation failed",
//   stage: "blueprint",
//   duration: 1500,
//   retryCount: 2
// }
```

### Enable VS Code Debug Output
```bash
# In VS Code output panel, select "Vizier" channel
# All errors are logged there automatically
```

---

## Retry Logic

### Transient Error Detection
```typescript
import { isTransientError } from "./errors";

async function classifyIdeaWithRetry(idea: string, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await classifyIdea(idea);
    } catch (error) {
      if (isTransientError(error) && attempt < maxRetries) {
        console.log(`Retrying... (attempt ${attempt + 1})`);
        continue;
      }
      throw error;
    }
  }
}
```

### Transient Errors (Will Retry)
- `ErrorCode.LLM_TIMEOUT` — Request timed out
- `ErrorCode.LLM_RATE_LIMIT` — Rate limited (429)
- `ErrorCode.NETWORK_ERROR` — Connection failed
- `ECONNREFUSED` — Connection refused
- `ETIMEDOUT` — Timed out
- HTTP 503, 504 — Service unavailable

### Non-Transient Errors (Won't Retry)
- `ErrorCode.LLM_INVALID_RESPONSE` — Malformed JSON
- `ErrorCode.INPUT_INVALID` — Invalid input
- `ErrorCode.CONFIG_NO_API_KEY` — Missing configuration
- Other validation/configuration errors

---

## Error Message Extraction

### Convert Error to User-Friendly Message
```typescript
import { extractErrorMessage } from "./errors";

const userMessage = extractErrorMessage(error, stage);
vscode.window.showErrorMessage(userMessage);
```

### Message Mapping
- `ERROR_EMPTY` → "App idea cannot be empty."
- `ERROR_TOO_LONG` → "App idea is too long (max 500 characters)."
- `CONFIG_NO_API_KEY` → "No API key configured. Please set vizier.provider and the matching API key in VS Code settings."
- `NETWORK_ERROR` → "Network connection failed. Check your internet connection."
- `LLM_TIMEOUT` → "LLM request timed out. Please try again or check your network."
- `LLM_RATE_LIMIT` → "Rate limited by LLM provider. Please wait a moment and try again."
- And 20+ more...

---

## Validation Patterns

### App Idea Validation
```typescript
// Requirements:
// - Non-empty after trim
// - At least 10 characters
// - At most 500 characters
// - Whitespace normalized

const idea = "  A mobile app for habit tracking  ";
const valid = validateAndSanitizeIdea(idea);
// Returns: "A mobile app for habit tracking"

const short = "short";
// Throws: VizierError(ErrorCode.INPUT_EMPTY)

const long = "A".repeat(600);
const truncated = validateAndSanitizeIdea(long);
// Returns: "A".repeat(500) — truncated
```

### Questionnaire Answer Validation
```typescript
// Choice type: answer must be in options
validateQuestionnaireAnswer(
  "category",
  "saas",
  "choice",
  [{ value: "saas" }, { value: "mobile" }]
);
// OK

validateQuestionnaireAnswer(
  "category",
  "invalid",
  "choice",
  [{ value: "saas" }, { value: "mobile" }]
);
// Throws: VizierError(ErrorCode.INPUT_INVALID)

// Multi-select type: all values must be in options
validateQuestionnaireAnswer(
  "frameworks",
  ["react", "vue"],
  "multi_select",
  [{ value: "react" }, { value: "vue" }, { value: "svelte" }]
);
// OK

validateQuestionnaireAnswer(
  "frameworks",
  ["react", "unknown"],
  "multi_select",
  [{ value: "react" }, { value: "vue" }]
);
// Throws: VizierError(ErrorCode.INPUT_INVALID)

// Text type: cannot be empty
validateQuestionnaireAnswer("opinion", "   ", "text");
// Throws: VizierError(ErrorCode.INPUT_INVALID)

validateQuestionnaireAnswer("opinion", "Great idea!", "text");
// OK
```

### Secret Redaction
```typescript
const text = `
  API_KEY=sk_live_abc123def456
  password: mySecurePass
  https://user:pass@internal.company.com
  AKIA1234567890ABCDEF
`;

const safe = redactSensitivePatterns(text);
// Result:
// API_KEY=[REDACTED]
// password: [REDACTED]
// https://[REDACTED]
// [REDACTED]

// Safe to log, store, or display to user
```

---

## Testing Validation & Error Handling

### Import Test Utilities
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateAndSanitizeIdea,
  validateQuestionnaireAnswer,
  redactSensitivePatterns
} from "../../src/validation";

import {
  ErrorCode,
  extractErrorMessage,
  isTransientError,
  VizierError
} from "../../src/errors";
```

### Example Tests
```typescript
test("validateAndSanitizeIdea - rejects empty", () => {
  assert.throws(
    () => validateAndSanitizeIdea(""),
    (err: any) => err.code === ErrorCode.INPUT_EMPTY
  );
});

test("redactSensitivePatterns - redacts API keys", () => {
  const text = "My key is sk_live_abc123";
  const redacted = redactSensitivePatterns(text);
  assert(!redacted.includes("abc123"));
  assert(redacted.includes("[REDACTED]"));
});

test("extractErrorMessage - handles error codes", () => {
  const message = extractErrorMessage({ 
    message: "CONFIG_NO_API_KEY" 
  });
  assert(message.includes("API key"));
});

test("isTransientError - identifies timeouts", () => {
  assert(isTransientError({ code: ErrorCode.LLM_TIMEOUT }));
  assert(!isTransientError({ code: ErrorCode.INPUT_INVALID }));
});
```

---

## Common Patterns

### Pattern 1: Validate & Throw
```typescript
function processIdea(idea: string) {
  const sanitized = validateAndSanitizeIdea(idea);
  // If invalid, throws automatically
  // If valid, returns sanitized idea
  return sanitized;
}
```

### Pattern 2: Try/Catch with Logging
```typescript
async function classifyIdea(idea: string) {
  try {
    return await classifyIdeaWithFallback(idea);
  } catch (error: any) {
    logError(error, {
      code: ErrorCode.CLASSIFICATION_FAILED,
      stage: "classification",
      traceId: generateTraceId()
    });
    throw error;
  }
}
```

### Pattern 3: User-Facing Error Messages
```typescript
async function handleUserAction() {
  try {
    // user action
  } catch (error: any) {
    const userMessage = extractErrorMessage(error);
    vscode.window.showErrorMessage(userMessage);
  }
}
```

### Pattern 4: Transient Error Retry
```typescript
async function apiCallWithRetry(maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await api.call();
    } catch (error) {
      if (isTransientError(error) && attempt < maxRetries) {
        continue;  // retry
      }
      throw error;
    }
  }
}
```

---

## Checklist for New Features

When adding new functionality:

- [ ] Validate all user input with `validation.ts` functions
- [ ] Use appropriate `ErrorCode` enum values
- [ ] Throw `VizierError` with user-friendly messages
- [ ] Log errors with `logError()` and trace IDs
- [ ] Handle both transient and permanent errors
- [ ] Add tests to `test/unit/validation.test.ts` or new test file
- [ ] Use `extractErrorMessage()` for user-facing errors
- [ ] Redact secrets before logging with `redactSensitivePatterns()`
- [ ] Document error scenarios in code comments

---

## References

- **Error System:** `src/errors.ts`
- **Validation System:** `src/validation.ts`
- **Tests:** `test/unit/validation.test.ts`
- **Usage:** `src/extension.ts` (see imports and error handling)
- **Full Analysis:** `EXTENSION_FAULT_ANALYSIS.md`
- **User Guide:** `GETTING_STARTED.md`

---

Happy coding! 🚀
