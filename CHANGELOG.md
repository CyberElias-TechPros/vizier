# Changelog

All notable changes to Vizier are documented in this file.

## [0.1.0] - 2026-08-15

### Added

- **Initial release** — Vizier turns a loose app idea into a structured, agent-ready build plan.
- **Smart classification** — AI-powered category detection (SaaS, Mobile, CLI Tool, Browser Extension, Game, Internal Tool) with a keyword-based fallback if no LLM is configured.
- **Repo-aware planning** — scans `package.json`, README, and existing agent-rule files so plans respect your current stack. No source code is read or sent.
- **Category-aware questionnaire** — different, relevant questions per app type (auth, multi-tenancy, offline, push, distribution, monetization, …), plus optional expert-perspective lenses (Developer, Visual/UX, Growth, Marketing, SysAdmin, IT Support, and more).
- **Complete blueprint pipeline** — 6-stage generation: PRD → Architecture → Data Model → API Contract → Tasks → Decisions.
- **API contract design** — concrete REST endpoints (method, path, auth, request/response shapes).
- **Estimates & story points** — every task carries an effort size, engineering hours, and Fibonacci story points.
- **Dependency-aware task graph** — tasks ordered by dependencies with cycle detection, plus auto-generated testing tasks.
- **Structured validation** — all LLM output schema-validated with `zod` and retried with feedback on failure.
- **Context packs** — per-task scoped context instead of the whole PRD dump.
- **Agent-specific export** — `.cursorrules`, `CLAUDE.md`, or `AGENTS.md` generated automatically based on what's installed; machine-readable `plan/plan.json` exported as the source of truth.
- **Multi-model provider support** — Anthropic (Claude), any OpenAI-compatible API, omniroute (OpenAI-compatible gateway with `auto` model switching), and local Ollama (fully on-prem, no API key).
- **Provider resilience & cost control** — optional fallback provider with circuit-breaker failover, 429/`Retry-After` backoff, local response caching, per-stage model selection, a soft monthly token budget, and stable mode (temperature 0).
- **Plan progress monitoring (private, local)** — `Vizier: Check Plan Progress` analyzes the exported plan against the workspace entirely on the machine: done / in-progress / blocked status, git- and test-backed verification, coverage, and a persisted progress trend. A live status-bar chip updates continuously.
- **Versioned plans** — `vizier.autoCommitPlan` commits `plan/` after export (git repos only).
- **Human-in-the-loop gate** — export requires an explicit "I have reviewed this plan" acknowledgement.
- **Real tracker integrations** — push plan tasks to Jira, Linear, GitHub Issues, or a generic webhook (with dry-run preview). Legacy `vizier.planTrackerWebhook` still supported.
- **Provenance** — generated plans are stamped with provider, model, and timestamp.
- **Privacy-first** — first-run privacy notice; API keys stored in VS Code Secret Storage; `vizier.codePrivacyMode` guarantee that source code is never transmitted.
- **Disclaimers everywhere** — every generated plan document and progress report carries an explicit "AI-assisted, verify before use" disclaimer; full disclosure in `DISCLAIMERS.md`.
- **Automated tests** — provider abstraction, questionnaire, DAG validation, export, monitor, tracker, and end-to-end smoke tests (65+ tests).

### Fixed

- Sidebar **"Plan This App"** now starts planning correctly (previously the webview message was unhandled).
- Messages sent while the sidebar is still loading are queued and delivered instead of dropped.
- Provider/model/API-key changes take effect immediately without an extension reload.
- Errors (e.g. missing API key, exceeded token budget) are surfaced with actionable messages instead of a generic failure.
- Blueprint generation now shows live stage progress in the sidebar.
- `vizier.requireReviewBeforeExport` is honored (review gate can be disabled).

## [1.0.0] - 2026-08-16 - Stability & Quality Release

### Added

#### Reliability & Error Handling
- **Structured error codes** (20+) for all failure modes with user-friendly extraction
- **Automatic retry logic** for transient errors (timeouts, rate limits, connection failures)
- **Comprehensive error logging** with trace IDs for debugging and correlation
- **Error context support** providing specific guidance for each error type
- **Graceful fallbacks** when repository scanning fails (continues planning without repo context)

#### Security Enhancements
- **Input validation & sanitization** (ideas, answers, categories) to prevent injection attacks
- **Secret redaction** in logs — hides API keys, passwords, tokens, AWS credentials
- **Prompt injection safeguards** with explicit instructions in system prompts to ignore embedded instructions
- **Symlink detection & protection** — prevents infinite loops in repo scanning
- **Secure API key storage** via VS Code Secret Storage (encrypted on disk)

#### Type Safety Improvements
- **Safe LLM response handling** — filters nulls, validates required fields, explicit type coercion
- **No unsafe `any` types** in blueprint generation
- **Array validation** before mapping/processing
- **Null check enforcement** across all LLM output processing

#### Accessibility (WCAG 2.1 AA Compliance)
- **ARIA labels** on all interactive elements (buttons, inputs, tabs, checkboxes, radios)
- **Semantic HTML roles** (button, checkbox, radio, tab, tablist, tabpanel, region, alert, progressbar)
- **Keyboard navigation**:
  - Tab/Shift+Tab to navigate elements
  - Enter/Space to activate buttons
  - Arrow keys to navigate tabs and radio options
  - Escape to close dialogs
- **Screen reader support**:
  - aria-live regions for dynamic updates (error messages, progress)
  - aria-label and aria-describedby for context
  - aria-expanded for collapsible sections
  - aria-selected for tabs
  - aria-busy for loading states
- **Focus management**:
  - Visible focus indicators (outline on focused elements)
  - Focus trapping in modals
  - Focus restoration after state changes
- **Progress announcements** via role="progressbar" with aria-valuenow

#### Testing Enhancements
- **35+ comprehensive validation tests** covering:
  - Input validation (sanitization, length checks, whitespace normalization)
  - Questionnaire answer validation (choice, multi_select, text types)
  - Secret redaction patterns (API keys, AWS credentials, passwords, URLs)
  - Category validation
  - Error extraction and mapping
  - Transient error detection
  - Edge cases and boundary conditions

#### Documentation
- **GETTING_STARTED.md** — Complete user guide (500+ lines):
  - Step-by-step setup for all 4 providers (Anthropic, OpenAI, Ollama, omniroute)
  - First-app planning walkthrough
  - 15+ FAQ items (cost, offline, editing, progress, sync, perspectives, budget, classification, model selection)
  - Troubleshooting guide (activation, API key, classification, timeouts, tracker sync)
  - 30+ settings reference
  - Command palette commands documented
  - Keyboard shortcuts
  - Privacy & security statement
  - Advanced usage patterns
- **ERROR_HANDLING_GUIDE.md** — Developer quick reference:
  - Error codes and messages
  - Input validation patterns
  - Logging and debugging
  - Retry logic examples
  - Testing patterns
  - Common code patterns
- **IMPLEMENTATION_SUMMARY.md** — Detailed implementation guide showing before/after

#### Configuration & Performance
- **Message protocol versioning** for future compatibility
- **Improved repo scanning** with symlink detection and timeout protection
- **Enhanced LLM output validation** with required field checks
- **Better error context** in log entries (code, stage, duration, retry count)

### Fixed

- ✅ Generic error messages now provide specific, actionable guidance
- ✅ Missing error handling in message dispatch no longer hangs UI
- ✅ Unsafe LLM response handling improved with null checks and type validation
- ✅ Symlink-induced infinite loops in repo scanner (added visitedDirs tracking)
- ✅ Secret exposure in logs (implemented redaction for sensitive patterns)
- ✅ Prompt injection vulnerability (added explicit safeguards in system prompts)
- ✅ Unsafe type coercions in blueprint generation (explicit String/Number conversion)
- ✅ Package config warnings (removed redundant activation events)
- ✅ No retry logic for transient errors (added classifyIdeaWithRetry with backoff)
- ✅ Webview a11y gaps (added ARIA labels, keyboard nav, focus management)
- ✅ Question progress bar not announced to screen readers (added role="progressbar")
- ✅ Tab navigation in blueprint view not keyboard accessible (added Arrow key support)
- ✅ Task list not navigable via keyboard (added role="listitem" and Enter key support)
- ✅ Decision cards not expandable via keyboard (added role="button" and keyboard handlers)

### Changed

- **Enhanced error messages** for better user understanding and actionability
- **Improved retry logic** with automatic detection of transient errors
- **Better logging** with trace IDs and structured context
- **Type-safe LLM response handling** across all pipeline stages
- **Comprehensive validation** on all user inputs before processing

### Security

- API keys stored securely in VS Code Secret Storage
- Secrets redacted from all logs and error messages
- Prompt injection defenses in system prompts
- Symlink protection in repo scanning
- Input validation prevents malformed data from reaching LLM

### Performance

- Symlink detection prevents repo scanner hanging
- Timeouts in repo scanning prevent long-running operations
- Better error recovery with automatic retry
- Type-safe handling reduces runtime errors

### Tested With

- VS Code 1.85.0 through latest
- Anthropic Claude (claude-opus-4-1-20250805, claude-3-5-sonnet-20241022)
- OpenAI (gpt-4o, gpt-4o-mini)
- Ollama (llama3.2, mistral)
- Omniroute gateway
- Node.js 18+
- TypeScript 5.x

## [Unreleased]

### Added

- *(next release notes go here)*
