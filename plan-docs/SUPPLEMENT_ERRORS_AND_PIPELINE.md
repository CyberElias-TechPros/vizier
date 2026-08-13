# SUPPLEMENT: Error Handling, Retry Logic, LLM Pipeline Stages, and Phase Gates

## Purpose
This document fills specific gaps in the main plan-docs: formal error taxonomy, retry algorithm, multi-stage LLM pipeline, webview security, and phase verification checklists.

---

## 1. Formal Error Taxonomy

### Error Categories

```typescript
// src/errors.ts

enum ErrorCode {
  // LLM errors (retryable)
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMIT = 'LLM_RATE_LIMIT',
  LLM_OVERLOADED = 'LLM_OVERLOADED',
  
  // Parse errors (retryable with feedback)
  PARSE_INVALID_JSON = 'PARSE_INVALID_JSON',
  PARSE_MISSING_FIELDS = 'PARSE_MISSING_FIELDS',
  PARSE_VALIDATION_FAILED = 'PARSE_VALIDATION_FAILED',
  
  // Input errors (not retryable, user must fix)
  INPUT_EMPTY = 'INPUT_EMPTY',
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',
  INPUT_INVALID_CATEGORY = 'INPUT_INVALID_CATEGORY',
  
  // Config errors (not retryable)
  CONFIG_NO_API_KEY = 'CONFIG_NO_API_KEY',
  CONFIG_INVALID_API_KEY = 'CONFIG_INVALID_API_KEY',
  
  // File system errors (some retryable)
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  
  // Webview errors
  WEBVIEW_DISCONNECTED = 'WEBVIEW_DISCONNECTED',
  WEBVIEW_MESSAGE_FAILED = 'WEBVIEW_MESSAGE_FAILED',
}

interface VibeCodingError {
  code: ErrorCode;
  message: string;           // User-facing message
  retryable: boolean;        // Should we retry?
  cause?: Error;             // Original error
  context?: Record<string, any>;  // Debugging context
}

// Error messages shown to users
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  LLM_TIMEOUT: 'The AI model took too long to respond. Retrying...',
  LLM_RATE_LIMIT: 'Too many requests. Waiting before retry...',
  LLM_OVERLOADED: 'The AI service is busy. Retrying in a moment...',
  PARSE_INVALID_JSON: 'The AI response was malformed. Retrying with clearer instructions...',
  PARSE_MISSING_FIELDS: 'The AI response was incomplete. Asking for the missing parts...',
  PARSE_VALIDATION_FAILED: 'The generated plan had invalid structure. Regenerating...',
  INPUT_EMPTY: 'Please describe your app idea before planning.',
  INPUT_TOO_LONG: 'Please keep your idea under 500 characters.',
  INPUT_INVALID_CATEGORY: 'Could not determine the app type. Please pick one manually.',
  CONFIG_NO_API_KEY: 'Please set your API key in Settings > Vibe Planner > API Key.',
  CONFIG_INVALID_API_KEY: 'The API key appears invalid. Please check and re-enter.',
  FILE_WRITE_FAILED: 'Could not write plan files to your workspace. Check permissions.',
  FILE_PERMISSION_DENIED: 'Permission denied. Make sure VS Code can write to this folder.',
  WEBVIEW_DISCONNECTED: 'Sidebar disconnected. Please close and reopen.',
  WEBVIEW_MESSAGE_FAILED: 'Communication error. Please reload the sidebar.',
};
```

### Error Handling Strategy

```
Error occurs
    |
    v
Is it retryable?
    |
    +-- YES --> Retry with backoff (max 3 attempts)
    |              |
    |              +-- Success --> Continue
    |              |
    |              +-- All retries failed --> Show error + partial results
    |
    +-- NO --> Show user-facing message immediately
               |
               +-- User can fix --> Show how-to
               +-- Cannot fix --> Log + graceful degradation
```

---

## 2. Retry Logic with Exponential Backoff + Jitter

```typescript
// src/llm/retry.ts

interface RetryConfig {
  maxAttempts: number;       // Default: 3
  baseDelayMs: number;       // Default: 1000 (1 second)
  maxDelayMs: number;        // Default: 30000 (30 seconds)
  timeoutMs: number;         // Default: 60000 (60 seconds)
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
};

/**
 * Calculate delay for attempt n (0-indexed)
 * Formula: min(baseDelay * 2^n + randomJitter, maxDelay)
 * 
 * Attempt 0: ~1 second  (1000ms + jitter)
 * Attempt 1: ~2 seconds (2000ms + jitter)
 * Attempt 2: ~4 seconds (4000ms + jitter)
 * Attempt 3: ~8 seconds (8000ms + jitter)
 * ...
 * Capped at maxDelayMs
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs; // 0 to baseDelay random
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Execute a function with retry logic
 * 
 * @example
 * const result = await withRetry(
 *   () => callClaudeAPI(prompt),
 *   {
 *     isRetryable: (error) => error.code === 'LLM_TIMEOUT' || error.code === 'LLM_RATE_LIMIT',
 *     onRetry: (error, attempt) => showMessage(`Retrying (${attempt}/3)...`),
 *   }
 * );
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    config?: Partial<RetryConfig>;
    isRetryable?: (error: Error) => boolean;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options.config };
  const isRetryable = options.isRetryable ?? (() => true);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Race against timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), config.timeoutMs)
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Do not retry if error is not retryable
      if (!isRetryable(lastError)) {
        throw lastError;
      }
      
      // Do not retry if this was the last attempt
      if (attempt === config.maxAttempts - 1) {
        throw lastError;
      }
      
      // Notify retry
      options.onRetry?.(lastError, attempt + 1);
      
      // Wait before retrying
      const delay = calculateDelay(attempt, config);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError; // Should never reach here, but TypeScript needs it
}
```

### When to Retry vs When to Fail Fast

| Error | Retry? | Why |
|-------|--------|-----|
| Timeout | Yes | Transient, often succeeds on retry |
| Rate limit (429) | Yes | Wait and retry per API guidance |
| Overloaded (529) | Yes | Temporary server issue |
| Invalid JSON | Yes | Add error context to prompt, retry |
| Missing API key | No | User must configure |
| Invalid API key | No | User must fix key |
| Empty input | No | User must provide idea |
| Permission denied | No | User must fix permissions |

---

## 3. 5-Stage Sequential LLM Pipeline

Instead of one giant "generate blueprint" prompt, break it into 5 sequential stages. Each stage feeds into the next. This produces dramatically better output.

### Why Sequential?

- **Focused prompts**: Each prompt has one job, reducing ambiguity
- **Context control**: Each stage only receives what it needs
- **Error isolation**: If one stage fails, you only redo that stage
- **Progress feedback**: User sees "Generating architecture..." then "Generating schema..."
- **Quality**: Claude/GPT perform better on focused tasks than multi-task prompts

### Pipeline Stages

```
Stage 1: PRD Generation
  Input: idea + category + answers
  Output: { vision, target_audience, mvp_scope, phase2_scope, core_workflows }
  Temperature: 0.7 (creative but grounded)
  Max tokens: 2000

      |
      v

Stage 2: Architecture Generation
  Input: idea + PRD (from stage 1)
  Output: { frontend, backend, database, auth, storage, infrastructure, rationale }
  Temperature: 0.5 (balanced)
  Max tokens: 1500

      |
      v

Stage 3: Schema Generation
  Input: PRD + Architecture (from stages 1-2)
  Output: { entities: [{ name, fields, relationships }] }
  Temperature: 0.3 (precise, structured)
  Max tokens: 1500

      |
      v

Stage 4: Task DAG Generation
  Input: PRD + Architecture + Schema (from stages 1-3)
  Output: [{ id, title, description, depends_on, acceptance_criteria, files_expected }]
  Temperature: 0.5 (balanced)
  Max tokens: 2500

      |
      v

Stage 5: Decision Register Generation
  Input: Architecture + Schema (from stages 2, 3)
  Output: [{ id, topic, options, chosen, rationale, impacts }]
  Temperature: 0.4 (reasoned)
  Max tokens: 1500
```

### Implementation

```typescript
// src/core/pipeline.ts

interface PipelineState {
  project: Project;
  stage: number;
  stageResults: Partial<BlueprintResult>;
  errors: StageError[];
}

async function runBlueprintPipeline(
  project: Project,
  onProgress: (stage: number, total: number, label: string) => void
): Promise<Project> {
  const totalStages = 5;
  
  // Stage 1: PRD
  onProgress(1, totalStages, 'Generating product requirements...');
  const product = await generatePRD(project);
  
  // Stage 2: Architecture
  onProgress(2, totalStages, 'Selecting tech stack...');
  const architecture = await generateArchitecture(project, product);
  
  // Stage 3: Schema
  onProgress(3, totalStages, 'Designing data model...');
  const entities = await generateSchema(project, product, architecture);
  
  // Stage 4: Tasks
  onProgress(4, totalStages, 'Building task graph...');
  const tasks = await generateTasks(project, product, architecture, entities);
  
  // Stage 5: Decisions
  onProgress(5, totalStages, 'Documenting decisions...');
  const decisions = await generateDecisions(architecture, entities);
  
  // Assemble final PIM
  return assemblePIM(project, { product, architecture, entities, tasks, decisions });
}
```

### What Happens If a Stage Fails?

1. Retry that stage up to 3 times (with the retry logic above)
2. If still failing, show partial results: "PRD and architecture generated, but schema failed. You can retry schema or continue with partial plan."
3. User can manually trigger retry of specific stage
4. Never lose work from previous stages

---

## 4. Webview Security (CSP Headers)

```typescript
// In your webview provider, when generating HTML:

function getWebviewContent(webview: vscode.Webview, nonce: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <!-- Content Security Policy: only allow scripts from this webview -->
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data:;
      ">
      <title>Vibe Plan</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js'))}"></script>
    </body>
    </html>
  `;
}

// Generate a nonce for each webview load
function generateNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
```

### Why CSP Matters
- Prevents XSS attacks if user opens a malicious workspace
- Blocks inline scripts from running
- Only allows our bundled webview.js to execute
- Required by VS Code Marketplace security review

---

## 5. Phase Verification Gates

Every phase ends with a checklist. Do NOT proceed to the next phase until every box is checked.

### Phase 1 Gate: Foundation Complete

```markdown
- [ ] `npm install` completes without errors
- [ ] `npm run build:all` produces dist/extension.js and dist/webview.js
- [ ] `npm run typecheck` shows 0 errors
- [ ] Pressing F5 opens Extension Development Host
- [ ] "Plan New App" command appears in command palette
- [ ] Clicking "Plan New App" shows information message
- [ ] Sidebar icon appears in activity bar
- [ ] Clicking sidebar icon shows webview with "Vibe Planner" header
- [ ] No errors in VS Code Developer Tools console (Help > Toggle Developer Tools)
```

### Phase 2 Gate: Classifier Working

```markdown
- [ ] API key can be entered and saved
- [ ] API key persists across VS Code restarts
- [ ] Classifying "project management tool" returns saas with confidence > 0.7
- [ ] Classifying "workout app" returns mobile with confidence > 0.7
- [ ] Classifying "markdown converter" returns cli_tool with confidence > 0.7
- [ ] Ambiguous idea ("an app") triggers user confirmation
- [ ] API error shows user-friendly message (not raw error)
- [ ] Retry works: temporarily disconnect internet, see retry message, reconnect, succeeds
- [ ] Unit tests pass: npm test
```

### Phase 3 Gate: Questionnaire Flowing

```markdown
- [ ] SaaS shows 10 questions
- [ ] Mobile shows 8 questions
- [ ] CLI Tool shows 8 questions
- [ ] Questions differ noticeably between categories
- [ ] Skip button uses default value
- [ ] Tooltip shows on hover
- [ ] Progress bar updates correctly
- [ ] Last question triggers blueprint generation
- [ ] Answers are stored in PIM
- [ ] Can go back to previous question
```

### Phase 4 Gate: Blueprint Generating

```markdown
- [ ] 5-stage pipeline runs in sequence
- [ ] Progress updates shown for each stage
- [ ] PRD tab shows vision, audience, scope
- [ ] Architecture tab shows all sections with rationale
- [ ] Schema tab shows entity tables
- [ ] Stage failure shows partial results + retry option
- [ ] Output is valid JSON that parses into PIM
- [ ] Generation completes in < 30 seconds
```

### Phase 5 Gate: Task DAG Valid

```markdown
- [ ] Tasks render as nodes in React Flow
- [ ] Dependencies render as edges
- [ ] No cycles detected (test with known-cyclic input)
- [ ] Topological sort produces valid build order
- [ ] Clicking node shows task details
- [ ] Marking task done updates status
- [ ] Blocked tasks visually distinct
- [ ] Flat list view also works
```

### Phase 6 Gate: Export Working

```markdown
- [ ] Export creates /plan/ directory
- [ ] overview.md has valid markdown content
- [ ] architecture.md has all sections
- [ ] schema.md has entity tables
- [ ] tasks.md has ordered task list
- [ ] decisions.md has decision register
- [ ] Context packs created for each task
- [ ] .cursorrules generated when .cursor/ detected
- [ ] CLAUDE.md generated when .claude/ detected
- [ ] AGENTS.md generated as fallback
- [ ] Files open correctly in VS Code preview
```

### Phase 7 Gate: UI Polished

```markdown
- [ ] All views transition smoothly
- [ ] Loading spinners shown for async ops
- [ ] Error messages are user-friendly
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] ARIA labels present on interactive elements
- [ ] State persists across webview reconnect
- [ ] "Understand This Project" stub detects package.json
- [ ] Detected stack seeds questionnaire
```

### Phase 8 Gate: Ready to Ship

```markdown
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] 3 manual test scenarios pass (SaaS, Mobile, CLI)
- [ ] Extension loads in < 500ms
- [ ] Blueprint generates in < 30 seconds
- [ ] Works with Claude API
- [ ] Works with at least one other provider
- [ ] README.md complete
- [ ] CHANGELOG.md has version entry
- [ ] Icon created (128x128 PNG)
- [ ] .vsix package builds successfully
- [ ] .vsix installs and works when side-loaded
```

---

## 6. Anti-Pattern Callouts

Explicit warnings for common mistakes. Read these before writing code.

### ANTI-PATTERN: Using Redux for Webview State

**Why it is tempting:** "I need state management for my React app."

**Why it is wrong:** The webview is a small, single-page app with ~5 views. Redux adds 2+ KB bundle size, boilerplate, and complexity for no benefit.

**What to do instead:** React Context + useReducer. Zero dependencies, built into React, sufficient for this scope.

### ANTI-PATTERN: Using Webpack for Bundling

**Why it is tempting:** "Webpack is the standard bundler."

**Why it is wrong:** Webpack config is complex, slow, and overkill for a single-entry webview bundle. esbuild is 100x faster and needs zero config.

**What to do instead:** esbuild. One command, 50ms builds, no config file needed.

### ANTI-PATTERN: Markdown-First Architecture

**Why it is tempting:** "The output is markdown, so let me store everything as markdown and parse it."

**Why it is wrong:** Markdown is ambiguous. Parsing is fragile. Adding a field means changing parsers. Relationships between entities are impossible to represent. Drift detection is impossible.

**What to do instead:** Typed TypeScript interfaces as source of truth. Markdown is an export function: `renderToMarkdown(pim)`.

### ANTI-PATTERN: Parallel LLM Calls

**Why it is tempting:** "I can generate PRD, architecture, and schema in parallel to save time."

**Why it is wrong:** Architecture depends on PRD scope. Schema depends on architecture choices. Tasks depend on all three. Parallel calls produce inconsistent results (PRD says "simple app", architecture says "microservices").

**What to do instead:** Sequential pipeline. Each stage feeds the next. Total time is similar because each stage is smaller.

### ANTI-PATTERN: One Giant Prompt

**Why it is tempting:** "I will ask the model to generate the entire blueprint in one call."

**Why it is wrong:** Models lose track of instructions in long prompts. Output quality degrades. If it fails, you redo everything. No progress feedback.

**What to do instead:** 5-stage pipeline. Focused prompts, better output, isolated failures, progress feedback.

### ANTI-PATTERN: Hardcoding Claude API

**Why it is tempting:** "Claude is the best, I will just use Claude."

**Why it is wrong:** Vendor lock-in. If Anthropic changes pricing, has outages, or a better model comes along, you are stuck.

**What to do instead:** Provider abstraction layer. One interface, multiple implementations. Swap providers by changing one line.

### ANTI-PATTERN: Ignoring Error Handling Until the End

**Why it is tempting:** "Let me build the happy path first, add error handling later."

**Why it is wrong:** Error handling is not a feature, it is architecture. Retrofitting it means rewriting half the code.

**What to do instead:** Define error taxonomy upfront. Every LLM call uses withRetry. Every user action has error states in the UI.

---

## 7. Performance Budget

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Extension activation | < 500ms | console.time() around activate() |
| Webview first paint | < 200ms | Performance API in webview |
| Classification | < 3 seconds | Time from idea submit to category shown |
| Full blueprint (5 stages) | < 30 seconds | Time from generate click to blueprint shown |
| Task DAG generation | < 15 seconds | Time from generate click to DAG shown |
| Export to files | < 2 seconds | Time from export click to success message |
| Memory usage | < 50MB | VS Code process memory |
| Webview bundle size | < 500KB gzipped | esbuild metafile |
| Extension package size | < 5MB | .vsix file size |

### Performance Optimization Techniques

1. **Lazy load the webview**: Only create the panel when user opens it
2. **Stream LLM responses**: Show partial output as it arrives
3. **Debounce file watchers**: Do not scan on every keystroke
4. **Cache classification results**: Same idea = same category
5. **Minimize webview bundle**: Tree-shake, code-split if needed
6. **Use esbuild minification**: Production builds are minified
