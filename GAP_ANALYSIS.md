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
- [ ] **No eval harness** — no golden set / LLM-judge. → Add `test/eval` with sample prompts + assertions.
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
8. Eval harness — open
9. CI — **done**
10. In-UI editing / section regeneration — open
11. Role-based planning lenses (10 roles) — **done**: users opt into expert perspectives (Developer, Visual/UX Designer, Growth, Behavioral, Product Marketing, Conversion Copywriter, Global Market Copywriter, Marketing Officer, System Administrator, IT Support) via a multi-select question; each runs an extra LLM stage and renders to `plan/perspectives.md` + a webview tab. Recommended lenses are pre-selected per category. (Also fixed `multi_select` UI, previously unsupported.)
