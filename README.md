# Vizier

**Turn app ideas into structured, agent-ready build plans.**

Vibe Plan is a VS Code extension that takes a loose app idea and transforms it into a complete, structured blueprint — PRD, tech stack, data model, build tasks, and agent-specific rules files.

## Features

- **Smart Classification** — Automatically categorizes your idea (SaaS, Mobile, CLI, etc.) using AI
- **Repo Scanner** — Reads your existing `package.json`, file tree, and configs so plans respect your current stack instead of guessing greenfield
- **Category-Aware Questionnaire** — Asks different questions based on your app type
- **Complete Blueprint Generation** — 6-stage pipeline: PRD → Architecture → Data Model → **API Contract** → Tasks → Decisions
- **API Contract Design** — Generates concrete REST endpoints (method, path, auth, request/response shapes)
- **Estimates & Story Points** — Each task gets an effort size, engineering hours, and Fibonacci story points
- **Auto Testing Tasks** — Appends a setup + per-entity + API + end-to-end test plan as a valid task DAG
- **Dependency-Aware Task Graph** — Build tasks ordered by dependencies with cycle detection
- **Structured Validation** — All LLM output is schema-validated with `zod` and retried with feedback on failure
- **Context Packs** — Per-task scoped context (not the whole PRD dump)
- **Agent-Specific Export** — Generates `.cursorrules`, `CLAUDE.md`, or `AGENTS.md` automatically

## Requirements

- VS Code 1.85.0 or higher
- An Anthropic API key (Claude) — [Get one here](https://console.anthropic.com/)

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Vibe Plan"
4. Click Install
5. Enter your API key when prompted

## Usage

1. Open the Vizier sidebar (click the rocket icon in the activity bar)
2. Describe your app idea in 1-3 sentences
3. Answer a few questions about your app
4. Wait for your blueprint to generate (15-30 seconds)
5. Review the blueprint, tasks, and decisions
6. Export to files in your workspace

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `vizier.anthropicApiKey` | (empty) | Your Anthropic API key |
| `vizier.preferredModel` | `claude-sonnet-4-20250514` | Which Claude model to use |

## Output

After generation, Vizier writes these files to your workspace:

```
plan/
  overview.md        - Product requirements document
  architecture.md    - Tech stack with rationale
  schema.md          - Data model with entities
  api.md             - API contract (endpoints, auth, request/response)
  tasks.md           - Build tasks in dependency order (with estimates)
  decisions.md       - Architectural decision register
  context/           - Per-task context packs
    TASK-001.md
    TASK-002.md
    ...
.cursorrules         - Cursor rules (if Cursor detected)
CLAUDE.md            - Claude Code rules (if Claude Code detected)
AGENTS.md            - Generic agent rules (fallback)
```

## FAQ

**Q: Which AI models are supported?**
A: Vibe Plan uses Claude by default (Sonnet 4 recommended). Any Claude 3.5+ model works.

**Q: Is my code sent to the AI?**
A: No. Only your idea description and questionnaire answers are sent. Your code never leaves your machine.

**Q: Can I edit the generated plan?**
A: Yes! All files are written to your workspace. Edit them freely.

**Q: What if the classification is wrong?**
A: Vibe Plan will ask you to confirm if it is unsure. You can always pick the category manually.

## License

MIT
