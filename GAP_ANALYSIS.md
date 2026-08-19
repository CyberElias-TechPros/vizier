# Gap Analysis — Vizier

Tracked against VS Code extension standards, LLM-app engineering norms, and planning-tool competitors (v0, Lovable, Cursor, StackGen).

Status legend: `open` · `in_progress` · `done` · `wontfix`

## 1. Security & Privacy
- [ ] **API key stored in plaintext settings** — `client.ts` writes key via `config.update(..., Global)` → unencrypted `settings.json`. → Migrate to `vscode.SecretStorage`. **[done]**
- [ ] **No privacy/consent disclosure** — idea + repo summary sent to Anthropic with no notice. → Add first-run consent + privacy note. **[done]**
- [ ] **Prompt injection via repo context** — README/existing agent-rules fed raw into prompts. → Mark context as untrusted + inject guard in prompts. **[done]**
- [ ] **No secret redaction** — `.env`/tokens inside `.cursorrules`/README forwarded to model. → Redact known secret patterns before including snippets. **[done]**
- [ ] **No content-size/exfil controls** — repo summary could include large/irrelevant content. → Cap README/rules snippet size (done) + consider allowlist.

## 2. LLM / AI-App Engineering
- [ ] **No cancellation** — `extension.ts:50` `cancellable: false`, no `AbortController`. → Thread `AbortSignal`, make progress cancellable. **[done]**
- [ ] **No streaming** — 15–30s spinner, only stage-level progress. → Add token streaming (future; cancellation shipped first).
- [ ] **No cost/token tracking** — users blind to spend. → Accumulate `usage` per stage, surface in UI. **[done (basic)]**
- [ ] **No model fallback** — single configured model, no secondary. → Add fallback model on repeated failure.
- [ ] **No caching** — identical ideas re-billed. → Cache by idea+category hash.
- [ ] **Non-reproducible** — `temperature > 0`. → Add "stable mode" (low temp) option.
- [x] **No eval harness** — → added `scripts/eval.ts` (offline structural scoring of `plan/plan.json`) and `src/core/eval.ts` (`evaluatePlan` + optional `gradePlanWithLLM`). Run `npm run eval`; `VIZIER_EVAL_LLM=1` enables LLM grading. **[done]**
- [ ] **No observability** — prompt/response not logged. → Optional debug log channel.
- [ ] **Context bloat** — full repo summary + entities + API in Tasks prompt. → Summarize/chunk large context.
- [ ] **Retry cost** — 3× full-feedback retry on bad schema. → Cap feedback retries, shorten feedback.

## 3. VS Code Extension Packaging & Quality
- [x] **Missing marketplace metadata** — `license`, `icon`, `repository`, `bugs`, `homepage`, `galleryBanner` added; `publisher` set to placeholder `vizier` (replace with real publisher before publish). `vsce package` builds clean. **[done]**
- [x] **Weak categories** — now `Programming Languages` / `Snippets`. **[done]**
- [x] **No `SecretStorage`** — see §1. **[done]**
- [ ] **No localization** — English-only (`vscode-nls`).
- [ ] **Webview a11y** — no ARIA/keyboard nav/contrast. → Add roles + keyboard handling.
- [ ] **No `viewsWelcome`** empty-state; no "set API key" command.
- [ ] **No marketplace assets** — screenshots, icon, changelog link.

## 4. Planning Depth vs Industry Tools
- [ ] **3 of 6 categories dead-end** — only saas/mobile/cli_tool have question banks. → Add banks for browser_ext/game/internal_tool. **[done]**
- [ ] **No security / threat-model section** in plan.
- [ ] **No non-functional reqs** — observability, performance/SLA, cost-to-run, i18n, accessibility.
- [ ] **Shallow CI/CD & infra** — no env strategy, IaC, migration plan.
- [ ] **Superficial test plan** — no coverage targets / test pyramid.
- [ ] **No deployment/rollout** — feature flags, canary, runbooks, on-call.
- [ ] **Greenfield bias** — repo scanner only nudges stack, no code reconciliation.
- [ ] **No dependency compliance/IP/licensing** analysis.

## 5. Product / UX & Lifecycle
- [ ] **No in-UI editing** — export-only, no round-trip / section regeneration.
- [ ] **No plan versioning** — re-run overwrites `plan/`; no git history despite "git-native" claim.
- [ ] **No "apply" automation** — docs only, never scaffolds code / opens PRs.
- [ ] **No progress analytics** — burndown, assignment, dependency graph view.
- [ ] **No integrations** — Jira/Linear/Notion/GitHub Issues.
- [ ] **`context_packs` always empty** in project object (generated lazily at export).
- [ ] **Single-project assumption.**

## 6. Testing & CI
- [ ] **No LLM pipeline integration tests** (needs Anthropic mock).
- [ ] **No export tests** (temp-dir file writes).
- [ ] **No `analyzeRepo` fs tests.**
- [x] **No CI** building + testing on PR. → GitHub Actions added (install, typecheck, test, package). **[done]**
- [ ] **No `vscode-test` e2e** of webview.
- [ ] **No coverage thresholds.**

## Priority shortlist
1. SecretStorage + privacy notice — **done**
2. Cancellation — **done**
3. Redact secrets & sandbox repo context — **done**
4. Fill 3 empty categories — **done**
5. Cost/token visibility — **done (basic)**
6. Marketplace metadata + icon + screenshots — **done** (metadata + generated placeholder icon; add store screenshots before going live)
7. Non-functional planning sections — open
8. Eval harness — **done** (`npm run eval`)
9. CI — **done**
10. In-UI editing / section regeneration — open
11. Role-based planning lenses (10 roles) — **done**: users opt into expert perspectives (Developer, Visual/UX Designer, Growth, Behavioral, Product Marketing, Conversion Copywriter, Global Market Copywriter, Marketing Officer, System Administrator, IT Support) via a multi-select question; each runs an extra LLM stage and renders to `plan/perspectives.md` + a webview tab. Recommended lenses are pre-selected per category. (Also fixed `multi_select` UI, previously unsupported.)

## 7. Multi-model portability (current pass)

- [x] **Single-provider lock-in** — only Anthropic was usable. → Added a `ModelProvider` abstraction with `AnthropicProvider` and `OpenAICompatibleProvider`; `vizier.provider` selects `anthropic | openai | omniroute`. **[done]**
- [x] **No OpenAI/OpenRouter/omniroute support** — → `OpenAICompatibleProvider` calls `${baseUrl}/chat/completions` over `fetch`; omniroute is treated as OpenAI-compatible with `model: "auto"` for gateway-side model switching. **[done]**
- [x] **Provider reliability / fallback** — → `vizier.fallbackProvider` enables automatic failover via a `FallbackProvider` chain with backoff on 429/5xx/timeouts (circuit-breaker pattern). **[done]**
- [x] **Per-stage model selection** — → `vizier.stageModels` map + `getEffectiveModel(stage)`; classification etc. can use cheaper models. **[done]**
- [x] **Cost guardrails** — → soft `vizier.monthlyBudgetTokens` cap (global state) throwing `BUDGET_EXCEEDED`; plus 429/Retry-After exponential backoff. **[done]**
- [x] **Caching / reproducibility** — → hashed local response cache (`vizier.enableCache`) + `vizier.stableMode` (temperature 0). **[done]**
- [x] **On-prem / local model** — → added `OllamaProvider` (native `/api/chat`, no API key) and `vizier.provider: "ollama"` with `vizier.ollamaBaseUrl` / `vizier.ollamaModel`. Generation can now run fully local. **[done]**
- [~] **Streaming** — token streaming is implemented in both providers (SSE for OpenAI, SDK stream for Anthropic) and exposed via `ModelRequest.stream`/`onToken`. It is not yet wired into the blueprint UI (JSON plans need full responses), but is available for narratives. *(partial)*

## 8. Plan execution monitoring (current pass)

- [x] **No execution visibility** — → `src/monitor/` analyzes `plan/plan.json` locally (file existence + task-id references), produces a status report, status-bar chip, and `plan/status.md`. **[done]**
- [x] **Privacy of monitoring** — → 100% local; optional AI narrative uses plan metadata only; `vizier.codePrivacyMode` guarantees it. **[done]**
- [x] **Verification depth** — → fuses **git history** (commits referencing task ids) and **real test outcomes** parsed from Jest/JSON and JUnit/XML artifacts (`coverage/coverage-summary.json` + associated test files). A task is "verified" only when done **and** its tests actually passed; a failing suite blocks verification. **[done]**
- [x] **Continuous monitoring** — → workspace file watcher (debounced) keeps the progress chip live; optional **tracker webhook** POSTs the report. **[done]**
- [x] **Integration with trackers** — → unified `src/tracking/tracker.ts` syncs plan tasks on `Vizier: Check Plan Progress` to **Jira** (`/rest/api/3/issue`, Basic auth, ADF descriptions), **Linear** (GraphQL `issueCreate`), **GitHub Issues** (`/repos/{o}/{r}/issues`), or a generic **webhook**. Dry-run preview, `includeDone` toggle, and secret-based tokens (`vizier.tracker.*`). **[done]**
- [x] **Burndown / trends** — → progress snapshots persisted to `plan/.progress-history.json`; report shows trend %. **[done]**

## 9. Disclosures, disclaimers & trust (current pass)

- [x] **Disclaimers in generated artifacts** — every `plan/*.md`, context pack, and `status.md` carries an "AI-assisted, verify before use" footer. **[done]**
- [x] **Standalone disclaimer document** — `DISCLAIMERS.md` covers warranty, AI reliability, security responsibility, privacy model, data residency/third parties, IP/licensing, progress-report accuracy, cost, and liability limitation. **[done]**
- [x] **UI transparency** — persistent "AI-assisted · local plan monitoring · verify all output" note in the sidebar header; privacy notice on first run; ARIA roles/labels added. **[done]**
- [x] **Provenance / model stamping** — → `plan/plan.json` `generated_by` (provider/model/timestamp) + a provenance line in `overview.md`. **[done]**
- [x] **Human-in-the-loop gating** — → export requires an explicit "I have reviewed this plan" acknowledgement checkbox. **[done]**
- [x] **Diffable plans / versioning** — → `vizier.autoCommitPlan` commits `plan/` after export (git repos only). **[done]**

## 10. Conceivable gaps & industry-standard mitigations (summary)

| Area | Gap | Industry-standard mitigation |
|------|-----|-------------------------------|
| Security | Secrets in settings (historical) | Secret Storage (done); per-environment secrets managers (Vault/cloud KMS) |
| Privacy | Repo context sent to LLM | Send summaries only, redact secrets, allow local-only mode (done); offer self-hosted/OpenAI-compatible local models |
| AI reliability | Hallucinated/unsafe plans | Schema validation + retry w/ feedback (done); eval harness + human review gates (done in UI: review acknowledgement; eval harness open) |
| Monitoring | Plans not executed/verified | Local progress scan (done); test/CI/git signal fusion → **verified** flag (done); continuous watcher (done) |
| Cost | Unbounded LLM spend | Token visibility (done); budget caps + 429/Retry-After backoff (done); response cache (done) |
| Availability | Single provider | Multi-provider abstraction (done); fallback chain + circuit breaker (done) |
| Reproducibility | Non-deterministic / re-billed | Response cache + `stableMode` temperature 0 (done) |
| Compliance | No DPA/data-residency controls | Document provider responsibility (done in DISCLAIMERS.md); offer on-prem/local model option (open) |
| Lifecycle | No versioning/diff | Git-native plans; auto-commit `plan/` (done); diff UI (open) |
| Accessibility | Webview a11y gaps | ARIA roles, labels added (partial); full keyboard nav/contrast audit (open) |
| Trust | No provenance | Model/timestamp stamping `generated_by` + overview footer (done) |
| Tracking | No issue-tracker sync | Direct Jira/Linear/GitHub Issues sync + generic webhook (done) |

**Disclaimers are now present in:** README, DISCLAIMERS.md, every generated `plan/*.md` and context pack, `plan/status.md`, the sidebar header, the export review gate, and the first-run privacy notice. They state clearly that Vizier is an AI aid, output may be wrong, and everything must be independently verified.

