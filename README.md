# 🚀 Vizier

**Turn app ideas into structured, agent-ready build plans in seconds.**

Vizier is a VS Code extension that takes a loose app idea and transforms it into a complete, structured blueprint — PRD, tech stack, data model, API contract, build tasks, and a decision register — then exports it to your workspace so you (or your AI coding agent) can build from it.

**✨ Trusted by developers building with Claude, GPT-4, Ollama, and more.**

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85.0+-blue)](#requirements)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/Tests-235+-brightgreen)]()
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-success)]()
[![Privacy](https://img.shields.io/badge/Privacy-First-important)](./DISCLAIMERS.md)

---

## Features

- **Smart Classification** — Automatically categorizes your idea (SaaS, Mobile, CLI tool, Browser extension, Game, Internal tool) using AI, with keyword-based fallback.
- **Repo-Aware Planning** — Scans your workspace (package files, README, existing agent rules) so plans respect your current stack instead of guessing greenfield. **No source code is read or sent.**
- **Category-Aware Questionnaire** — Asks different, relevant questions based on your app type, plus optional expert-perspective lenses.
- **Complete Blueprint Pipeline** — 6-stage generation: PRD → Architecture → Data Model → API Contract → Tasks → Decisions.
- **API Contract Design** — Concrete REST endpoints with method, path, auth, and request/response shapes.
- **Estimates & Story Points** — Every task gets an effort size, engineering hours, and Fibonacci story points.
- **Dependency-Aware Task Graph** — Build tasks ordered by dependencies with cycle detection, plus auto-generated testing tasks.
- **Structured Validation** — All LLM output is schema-validated with `zod` and automatically retried with feedback on failure.
- **Context Packs** — Per-task scoped context so agents get just what each task needs.
- **Agent-Specific Export** — Generates `.cursorrules`, `CLAUDE.md`, or `AGENTS.md` automatically based on what's installed in your workspace.
- **Plan Progress Monitoring (private, local)** — Track how much of the exported plan has been executed — done / in-progress / blocked, with git/test-backed verification and a live status-bar chip. Runs entirely on your machine.
- **Multi-Model Support** — Anthropic (Claude), any OpenAI-compatible API, **omniroute** (auto-switching gateway), or a local **Ollama** server (fully on-prem, no API key).
- **Provider Resilience & Cost Control** — Optional fallback provider (automatic failover), local response caching, per-stage model selection, a monthly token budget, and stable mode.
- **Real Tracker Integrations** — Push plan tasks to **Jira**, **Linear**, or **GitHub Issues** (or a generic webhook) as real issues, with dry-run preview.
- **Privacy-First by Design** — Planning sends only your idea + a workspace *summary*. Monitoring is 100% local. API keys live in VS Code Secret Storage.

## Requirements

- VS Code 1.85.0 or higher
- A model provider. Pick one in settings (`vizier.provider`):
  - **Anthropic (Claude)** — [get an API key](https://console.anthropic.com/), or
  - **OpenAI-compatible API** (OpenAI, OpenRouter, etc.), or
  - **omniroute** (an OpenAI-compatible gateway), or
  - **Ollama** — local, no API key required. Install [Ollama](https://ollama.com) and pull a model, e.g. `ollama pull llama3.2`.

## Installation

1. Open VS Code
2. Open the Extensions view (`Ctrl+Shift+X`)
3. Search for **"Vizier"**
4. Click **Install**
5. Open Settings, set `vizier.provider` and the matching API key (or pick `ollama` for fully local use)

## Quick Start

1. Open the **Vizier sidebar** (rocket icon in the activity bar)
2. Describe your app idea in 1–3 sentences, click **Plan This App**
3. Answer a few short questions (or skip them)
4. Wait ~15–30 seconds for your blueprint
5. Review the blueprint, tasks, and decisions
6. **Export to Files** — writes everything to a `plan/` folder in your workspace
7. As you build, run **Vizier: Check Plan Progress** to see live execution status — fully locally

> Tip: You can also start from the command palette with **Vizier: Plan New App**.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `vizier.provider` | `anthropic` | `anthropic` \| `openai` \| `omniroute` \| `ollama` |
| `vizier.anthropicApiKey` | (empty) | Your Anthropic API key |
| `vizier.preferredModel` | `claude-sonnet-4-20250514` | Which Claude model to use |
| `vizier.openaiApiKey` | (empty) | API key for the OpenAI-compatible provider |
| `vizier.openaiBaseUrl` | `https://api.openai.com/v1` | Base URL for the OpenAI-compatible API |
| `vizier.openaiModel` | `gpt-4o` | Model id for the OpenAI-compatible provider |
| `vizier.omnirouteApiKey` | (empty) | API key for the omniroute gateway |
| `vizier.omnirouteBaseUrl` | `https://api.openai.com/v1` | Base URL for omniroute (set to your gateway endpoint) |
| `vizier.omnirouteModel` | `auto` | Model for omniroute; `auto` enables gateway-side model switching |
| `vizier.ollamaBaseUrl` | `http://localhost:11434` | Local Ollama server (provider = `ollama`) |
| `vizier.ollamaModel` | `llama3.2` | Locally-pulled Ollama model (provider = `ollama`) |
| `vizier.planMonitorNarrative` | `true` | Include an AI narrative in progress reports (plan metadata only, never code) |
| `vizier.planMonitorOnStartup` | `true` | Populate the status-bar progress indicator on startup |
| `vizier.verifyPlanWithGit` | `true` | Inspect git history for commits referencing task ids (local) |
| `vizier.verifyPlanWithTests` | `true` | Look for coverage reports & test files tied to expected task files (local) |
| `vizier.autoCommitPlan` | `false` | Commit the `plan/` folder after export (git repos only) |
| `vizier.tracker.type` | `""` | `""` \| `webhook` \| `jira` \| `linear` \| `github` — where to sync plan tasks |
| `vizier.tracker.dryRun` | `false` | Build issue payloads but don't call the remote API (preview) |
| `vizier.tracker.includeDone` | `true` | When `false`, skip tasks already marked `done` |
| `vizier.tracker.webhookUrl` | `""` | Destination for `tracker.type = webhook` |
| `vizier.tracker.jiraBaseUrl` / `.jiraEmail` / `.jiraProjectKey` / `.jiraToken` | `""` | Jira Cloud connection (token also read from secret `vizier.tracker.jiraToken`) |
| `vizier.tracker.linearToken` / `.linearTeamId` | `""` | Linear connection |
| `vizier.tracker.githubToken` / `.githubOwner` / `.githubRepo` | `""` | GitHub Issues connection (token also read from secret `vizier.tracker.githubToken`) |
| `vizier.planTrackerWebhook` | `""` | *(Legacy)* URL to POST the progress report JSON to; used when `tracker.type` is empty |
| `vizier.requireReviewBeforeExport` | `true` | Require an explicit "I have reviewed this plan" acknowledgement before export |
| `vizier.codePrivacyMode` | `true` | Guarantee: Vizier never transmits repository source code to any LLM |
| `vizier.fallbackProvider` | `""` | Secondary provider for automatic failover (circuit-breaker) |
| `vizier.enableCache` | `true` | Cache identical LLM requests locally (cost + reproducibility) |
| `vizier.stableMode` | `false` | Force temperature 0 for deterministic generation |
| `vizier.stageModels` | `{}` | Per-stage model overrides, e.g. `{ "classification": "gpt-4o-mini" }` |
| `vizier.monthlyBudgetTokens` | `0` | Soft monthly token budget (0 = unlimited); throws when reached |

## Output

After generation, Vizier writes these files to your workspace:

```
plan/
  plan.json           - Machine-readable plan (source of truth for progress monitoring)
  overview.md         - Product requirements document
  architecture.md     - Tech stack with rationale
  schema.md           - Data model with entities
  api.md              - API contract (endpoints, auth, request/response)
  tasks.md            - Build tasks in dependency order (with estimates)
  decisions.md        - Architectural decision register
  perspectives.md     - Expert-perspective sections (if any selected)
  context/            - Per-task context packs
    TASK-001.md
    TASK-002.md
    ...
  status.md           - Plan progress report (written by "Check Plan Progress")
.cursorrules         - Cursor rules (if Cursor detected)
CLAUDE.md            - Claude Code rules (if Claude Code detected)
AGENTS.md            - Generic agent rules (fallback)
```

Every generated document includes a disclaimer footer. `plan/status.md` additionally states that monitoring is local and private.

## Plan Progress Monitoring

The **Vizier: Check Plan Progress** command (status-bar chip, command palette, or the button in the sidebar) compares the exported plan against your workspace to report:

- **Status per task** — done / in-progress / blocked / not started, computed from file existence and task references
- **Verification** — tasks are marked *verified* only when backed by real evidence: git commits referencing the task, or tests that actually passed (parsed from Jest/JSON and JUnit/XML reports)
- **Coverage & trend** — project coverage and a progress history for burndown-style trends

All of this runs **entirely on your machine**. No source code, file contents, or repository data is ever transmitted.

## Privacy & Disclaimers

- **Planning:** only your idea, questionnaire answers, and a *summary* of your workspace (package files, README, existing rules) are sent to your selected LLM provider. **No source code is sent.**
- **Monitoring:** runs 100% locally; it inspects file existence and task references only. **No data leaves your machine.**
- **Keys:** stored in VS Code Secret Storage, not plaintext.
- **AI is not a substitute for judgment.** Plans may be inaccurate, incomplete, or unsafe. Review, validate, and test everything. See [DISCLAIMERS.md](./DISCLAIMERS.md).

## FAQ

**Q: Which AI models are supported?**
A: Anthropic Claude, any OpenAI-compatible API, omniroute (OpenAI-compatible, can auto-switch models), or a local **Ollama** server (fully on-prem, no API key). Choose via `vizier.provider`.

**Q: Is my code sent to the AI?**
A: During planning, no source code is sent — only your idea, answers, and a repo *summary*. Plan-progress monitoring is fully local and never transmits any code. With the **Ollama** provider, generation is also fully local.

**Q: What does "omniroute" do?**
A: It's treated as an OpenAI-compatible endpoint where `vizier.omnirouteModel: "auto"` lets the gateway switch models (automode) while Vizier retains all planning context. Set `vizier.omnirouteBaseUrl` to your gateway.

**Q: How is my API key stored?**
A: API keys are stored in VS Code Secret Storage. They are never written to plaintext settings.

**Q: Does the status-bar chip upload anything?**
A: No. Plan-progress monitoring is local-only. If you enable the optional AI narrative, it is generated from plan metadata only (task ids, titles, status counts) — never from your code.

## License

MIT — see [LICENSE.md](./LICENSE.md).
