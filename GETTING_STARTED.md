# Vizier — Getting Started Guide

> A VS Code extension that turns app ideas into structured, agent-ready build plans.

---

## Quick Start

### 1. Install Vizier

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for **"Vizier"**
4. Click **Install**

### 2. Configure Your LLM Provider

Vizier supports multiple LLM providers. Pick one:

**Option A: Anthropic Claude (Recommended)**
1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. In VS Code, open Settings (`Ctrl+,` or `Cmd+,`)
3. Search for `vizier.provider`
4. Set it to `anthropic`
5. Search for `vizier.anthropicApiKey`
6. Paste your API key

**Option B: OpenAI or OpenAI-Compatible API**
1. Get an API key from [OpenAI](https://platform.openai.com), [OpenRouter](https://openrouter.ai), or your provider
2. In Settings, set `vizier.provider` to `openai`
3. Set `vizier.openaiApiKey` to your API key
4. Set `vizier.openaiModel` (default: `gpt-4o`)
5. *Optional*: Set `vizier.openaiBaseUrl` if using a custom endpoint (e.g., OpenRouter: `https://openrouter.ai/api/v1`)

**Option C: Local Ollama (Free, No API Key)**
1. Install [Ollama](https://ollama.com)
2. Pull a model: `ollama pull llama3.2`
3. Run the server: `ollama serve` (default: `http://localhost:11434`)
4. In VS Code Settings:
   - Set `vizier.provider` to `ollama`
   - Set `vizier.ollamaModel` to your model (e.g., `llama3.2`)
   - *Optional*: Set `vizier.ollamaBaseUrl` if Ollama is on a different machine

**Option D: Omniroute Gateway (Auto-Switching)**
1. Set up an [omniroute](https://omniroute.dev) endpoint
2. Get an API key
3. In Settings:
   - Set `vizier.provider` to `omniroute`
   - Set `vizier.omnirouteApiKey`
   - Set `vizier.omnirouteBaseUrl` to your gateway endpoint
   - Set `vizier.omnirouteModel` to `auto` (gateway decides the model)

### 3. Plan Your First App

1. Click the **Vizier** icon in the activity bar (rocket icon)
2. Click **"Plan This App"** or use the command palette (`Ctrl+Shift+P` → "Vizier: Plan New App")
3. Describe your app in 1–3 sentences, e.g.:
   - *"A mobile app for tracking habits with daily streaks and reminders"*
   - *"A web platform for remote team project management with Kanban boards"*
   - *"A CLI tool that converts markdown files to pretty PDFs with syntax highlighting"*
4. Click **Plan This App**
5. Answer a few quick questions about your app (or skip them)
6. Wait ~15–30 seconds while Vizier generates your blueprint
7. Review the plan, then click **Export to Files**

Your plan is now in the `plan/` folder of your workspace!

---

## Understanding Your Generated Plan

After export, you'll find these files in `plan/`:

| File | What It Is |
|------|-----------|
| `overview.md` | Executive summary — vision, audience, MVP scope |
| `architecture.md` | Tech stack and internal structure (frontend, backend, database, auth, etc.) |
| `schema.md` | Database entities and relationships |
| `api.md` | REST endpoints (method, path, auth, request/response shapes) |
| `tasks.md` | Build tasks ordered by dependencies, with estimates and acceptance criteria |
| `decisions.md` | Architecture decisions and their rationale |
| `roadmap.md` | Phased rollout plan with milestones |
| `perspectives.md` | (Optional) Insights from expert roles (designer, growth, marketing, etc.) |
| `plan.json` | Machine-readable source of truth (for progress tracking) |

---

## FAQ

### Q: Can I edit the plan after export?

**A:** Currently, Vizier exports the plan to static Markdown files. To make changes:
1. Edit the files manually, or
2. Run **Vizier: Plan New App** again with updated ideas/answers (this will overwrite `plan/`).

**Tip:** Commit your plan to git before regenerating:
```bash
cd plan
git add -A && git commit -m "Initial plan"
```

### Q: Does Vizier read my source code?

**A:** **No.** Vizier only reads:
- Package files (`package.json`, `go.mod`, etc.)
- README
- Existing agent-rule files (`.cursorrules`, `CLAUDE.md`)

It **never** reads or transmits your actual source code. See the [Privacy Policy](../DISCLAIMERS.md) for details.

### Q: How much does it cost?

**A:** Depends on your provider:
- **Anthropic Claude:** ~$0.01–$0.05 per plan (depending on model)
- **OpenAI:** ~$0.02–$0.10 per plan
- **Ollama (local):** FREE — runs on your machine
- **Omniroute:** Depends on your plan

**Tip:** Use `vizier.stableMode: true` for reproducible, cheaper generations. Or set `vizier.stageModels` to use cheaper models for lightweight stages:
```json
"vizier.stageModels": {
  "classification": "gpt-4o-mini",
  "prd": "gpt-4-turbo"
}
```

### Q: What if classification fails?

**A:** If Vizier can't automatically categorize your idea, it will:
1. Show you Vizier's best guess (with confidence level)
2. Let you confirm or manually pick from: SaaS, Mobile, CLI, Browser Extension, Game, Internal Tool

### Q: Can I use different models for different stages?

**A:** Yes! Use `vizier.stageModels`:
```json
"vizier.stageModels": {
  "classification": "gpt-4o-mini",
  "prd": "claude-opus-4-1-20250805",
  "architecture": "gpt-4o",
  "tasks": "gpt-4o-mini"
}
```

This optimizes cost and latency per stage.

### Q: How do I check progress on my plan?

**A:** Use **Vizier: Check Plan Progress** (command palette or sidebar button).

This scans your workspace and reports:
- ✅ Completed tasks (files present + tests passing)
- 🟡 In-progress (files exist, tests not yet run)
- ⏳ Blocked (missing dependencies)
- ⚪ Not started

**100% local** — nothing is sent to any server.

### Q: Can I sync my plan to Jira/Linear/GitHub Issues?

**A:** Yes! In settings, configure:
```json
"vizier.tracker": {
  "type": "jira",  // or "linear", "github", "webhook"
  "jiraBaseUrl": "https://your-org.atlassian.net",
  "jiraEmail": "you@company.com",
  "jiraToken": "your-token"
}
```

Then run **Vizier: Check Plan Progress** — it will sync tasks to your tracker.

**Tip:** Test with `vizier.tracker.dryRun: true` first to preview payloads.

### Q: How do I enable expert perspectives?

**A:** During the questionnaire, you'll see a question: *"Which expert perspectives would you like?"*

Select roles like:
- 👨‍💻 Developer (code quality, testing)
- 🎨 Visual/UX Designer (design system, UI/UX)
- 📈 Growth Specialist (growth loops, retention)
- 📝 Product Marketing Manager (positioning, messaging)
- ... and more

Each perspective generates insights in `plan/perspectives.md`.

### Q: Can I use Vizier offline?

**A:** Only if you're using Ollama (fully local). Otherwise, you need internet to reach your LLM provider.

### Q: What if I hit my monthly token budget?

**A:** If you set `vizier.monthlyBudgetTokens`, generation will throw `BUDGET_EXCEEDED` once the budget is reached (tracked in VS Code global state). The count resets monthly.

**Tip:** Use `vizier.stableMode` and `vizier.stageModels` to optimize spending.

---

## Troubleshooting

### Extension Won't Activate

**Check:**
1. Is VS Code 1.85.0 or higher? (Check: Help → About)
2. Is the extension enabled? (Check Extensions panel)
3. Do you have a workspace folder open? (Vizier requires a workspace)

### "No API key configured" Error

**Fix:**
1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search `vizier.provider` — confirm it's set to one of: `anthropic`, `openai`, `omniroute`, `ollama`
3. Search for the matching key setting (e.g., `vizier.anthropicApiKey`)
4. Paste your API key

**Note:** API keys are stored in VS Code Secret Storage (encrypted on your machine).

### Classification Fails

**If you see "Could not classify your idea":**
1. Rephrase your idea more clearly (avoid vague descriptions)
2. Check your internet connection
3. Verify your API key is valid (test in Anthropic console or OpenAI playground)
4. Click **"No, let me pick"** to manually select a category

### Generation Hangs or Times Out

**If generation is stuck:**
1. Check your internet connection
2. Press `Escape` or click the "Cancel" button in the progress dialog
3. Check your LLM provider's status page (e.g., Anthropic, OpenAI)
4. Try with a cheaper model: `vizier.preferredModel: "claude-3-5-sonnet-20241022"` (Claude)

### Tests Not Running / Progress Report Empty

**If "Check Plan Progress" shows no tasks completed:**
1. Ensure you have a `plan/` folder (run **Vizier: Export Plan** first)
2. Make sure test files exist and follow the expected naming pattern
3. Enable verification: `vizier.verifyPlanWithTests: true`, `vizier.verifyPlanWithGit: true`

### Tracker Sync Fails

**If tasks aren't syncing to Jira/Linear/GitHub:**
1. Run with `vizier.tracker.dryRun: true` to preview the payload
2. Verify your tracker credentials (token, base URL, project key)
3. Check VS Code output panel for error details
4. Ensure the tracker account has permission to create issues

---

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `vizier.provider` | string | `"anthropic"` | LLM provider: `anthropic`, `openai`, `omniroute`, or `ollama` |
| `vizier.anthropicApiKey` | string | (empty) | Your Anthropic API key (stored securely) |
| `vizier.preferredModel` | string | `"claude-sonnet-4-20250514"` | Anthropic model to use |
| `vizier.openaiApiKey` | string | (empty) | OpenAI-compatible API key |
| `vizier.openaiBaseUrl` | string | `"https://api.openai.com/v1"` | OpenAI-compatible base URL |
| `vizier.openaiModel` | string | `"gpt-4o"` | Model name for OpenAI API |
| `vizier.ollamaBaseUrl` | string | `"http://localhost:11434"` | Local Ollama server URL |
| `vizier.ollamaModel` | string | `"llama3.2"` | Model to use in Ollama |
| `vizier.fallbackProvider` | string | (empty) | Secondary provider for failover (e.g., `"openai"`) |
| `vizier.enableCache` | boolean | `true` | Cache LLM responses to reduce cost |
| `vizier.stableMode` | boolean | `false` | Force temperature 0 for reproducibility |
| `vizier.stageModels` | object | `{}` | Per-stage model overrides (e.g., `{ "classification": "gpt-4o-mini" }`) |
| `vizier.monthlyBudgetTokens` | number | `0` | Soft monthly token budget (0 = unlimited) |
| `vizier.codePrivacyMode` | boolean | `true` | Never transmit source code to LLM |
| `vizier.verifyPlanWithGit` | boolean | `true` | Check git commits for task references |
| `vizier.verifyPlanWithTests` | boolean | `true` | Look for test results tied to tasks |
| `vizier.planMonitorNarrative` | boolean | `true` | Include AI narrative in progress reports |
| `vizier.planMonitorOnStartup` | boolean | `true` | Show progress indicator on startup |
| `vizier.tracker.type` | string | (empty) | Tracker type: `""`, `"webhook"`, `"jira"`, `"linear"`, `"github"` |
| `vizier.tracker.dryRun` | boolean | `false` | Preview tracker payloads without sending |
| `vizier.tracker.jiraBaseUrl` | string | (empty) | Jira Cloud instance URL |
| `vizier.tracker.linearToken` | string | (empty) | Linear API token |
| `vizier.tracker.githubToken` | string | (empty) | GitHub personal access token |

---

## Command Palette Commands

| Command | What It Does |
|---------|------------|
| `Vizier: Plan New App` | Start planning a new app (show input dialog) |
| `Vizier: Open Vizier Sidebar` | Focus the Vizier sidebar panel |
| `Vizier: Export Plan to Files` | Save the generated plan to `plan/` folder |
| `Vizier: Check Plan Progress` | Scan workspace and generate progress report |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` then "Vizier: Plan New App" | Launch planner |
| (Click rocket icon in activity bar) | Open/focus Vizier sidebar |

---

## Privacy & Security

✅ **Vizier is privacy-first:**
- Planning requests send your **idea** + **workspace summary** to your LLM provider (Anthropic, OpenAI, etc.)
- **Never** sends your source code
- **Never** sends your API keys to any third party
- Progress monitoring runs **100% locally** on your machine
- API keys stored in VS Code Secret Storage (encrypted)

See the full [Privacy Policy & Disclaimers](../DISCLAIMERS.md) for details.

---

## Support & Feedback

- 🐛 **Report a bug:** [GitHub Issues](https://github.com/CyberElias-TechPros/vizier/issues)
- 💡 **Suggest a feature:** [GitHub Discussions](https://github.com/CyberElias-TechPros/vizier/discussions)
- 📖 **Read the docs:** Check [README.md](../README.md) for architecture overview

---

## Advanced Usage

### Generate Multiple Plans in One Workspace

You can have multiple `plan-{name}/` folders:

```bash
plan-saas/
  plan.json
  overview.md
  ...

plan-mobile/
  plan.json
  overview.md
  ...
```

Just export each plan with a different workspace/folder and track them separately.

### Integrate with Your CI/CD

Use the exported tasks in your CI pipeline:

```bash
# Extract task IDs and create GitHub issues
jq -r '.tasks[].id' plan/plan.json | while read id; do
  echo "Task: $id"
done
```

### Export to Agent Rules

Vizier automatically generates:
- `.cursorrules` (for Cursor)
- `CLAUDE.md` (for Claude in IDE)
- `AGENTS.md` (for other agents)

These files are scoped to your specific plan and can be used by coding agents to stay on track.

---

## License

Vizier is MIT-licensed. See [LICENSE.md](../LICENSE.md).

---

**Happy planning! 🚀**
