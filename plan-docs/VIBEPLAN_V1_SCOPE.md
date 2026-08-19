# VIZIER — Final V1 Scope Document

## Product Name
**Vizier** — The planning layer for AI-powered development.

## One-Line Pitch
A VS Code extension that turns a loose idea (or an existing codebase) into a structured, agent-ready build plan — works with any AI model, from the strongest to the weakest.

## Product Positioning
Vizier is not a "spec generator." It is the **intelligence and control layer** sitting between humans, AI coding agents, and the software project itself.

- Cursor, Claude Code, Windsurf can write code.
- Vizier tells them **what to build, in what order, with what constraints.**

We do not compete with AI coding agents. We make them dramatically more effective.

## Core Architecture Principles

1. **PIM-First**: The Project Intelligence Model (typed TypeScript interfaces) is the internal source of truth. Markdown is an export format, not the data model.
2. **Graph, Not Documents**: Everything is connected — requirements link to tasks link to entities link to decisions. The graph is the moat.
3. **Context Scoping**: Each AI task gets exactly the context it needs, not the entire PRD dump.
4. **Model Agnostic**: Works with Claude, GPT, Gemini, or local models. Adapts prompting strategy to model capability.
5. **Git-Native**: Plans live as files in the user's repo, versioned with code. No backend, no accounts, no lock-in.
6. **Depth Over Breadth**: 3 categories done extremely well beats 6 done shallowly.

---

## V1 Feature Set

### Three Wedge Features

These are the features strong enough to be the sole reason a user adopts Vizier.

#### Wedge 1: Category-Aware Questionnaire
- Not a generic form. Not freeform chat.
- Structured slot-filling with 6-10 questions per category.
- Questions differ dramatically between SaaS, Mobile, and CLI Tool.
- Each question has: a sane default, a tooltip ("why this matters"), skip option.
- Categories for V1: **SaaS** (10 questions), **Mobile** (8 questions), **CLI Tool** (8 questions).

#### Wedge 2: Task DAG (Dependency-Aware Build Graph)
- Not a flat checklist. A true directed acyclic graph.
- Each task is "one AI coding session" sized.
- Tasks have: dependencies, acceptance criteria, expected files, linked requirements.
- Rendered as interactive graph (React Flow) in the sidebar.
- Validated: no cycles, correct topological ordering.
- Exportable as flat ordered list for tools that do not read graphs.

#### Wedge 3: Decision Register + Context Packs
- **Decision Register**: Every architectural choice is logged with options considered, choice made, rationale, impact areas. Prevents AI agents from flip-flopping mid-build.
- **Context Packs**: Per-task scoped context (not the whole PRD). Each task gets: relevant requirements, relevant entities, relevant decisions, relevant rules, expected files, "do not" list.

### Supporting Features

#### Category Classifier
- Single LLM call: idea text in, one of six categories out.
- Confidence check: if ambiguous, ask the user directly.
- Cheap and fast (can use Tier 2/3 models).

#### Blueprint Generator
- LLM-powered: idea + answers -> PRD + architecture + schema.
- PRD: vision, target audience, MVP scope vs Phase 2.
- Architecture: full tech stack with one-paragraph rationale per choice.
- Schema: data model with entities, fields, relationships.
- Adapts to model tier (single prompt for strong models, multi-stage for weaker).

#### Agent-Specific Export
- Generates .cursorrules (Cursor), CLAUDE.md (Claude Code), AGENTS.md (generic).
- Detects installed AI tool by checking for config files in workspace.
- Export content derived from PIM, not hardcoded templates.

#### Model Router + Prompt Strategy Tiers
- Tier 1 (Strong: Claude Sonnet 4, GPT-4o): Single prompt, full structured JSON.
- Tier 2 (Medium: GPT-3.5, Claude Haiku): Multi-stage pipeline (requirements -> architecture -> entities -> tasks).
- Tier 3 (Basic: small local models): Template-fill with user confirmation at each step.
- Adaptive fallback: start strong, automatically degrade if model fails.

#### Lightweight Workspace Scanner (Stub)
- Detects: package.json, framework, main languages, existing /plan or config files.
- Entry point: "Understand This Project" -> quick scan -> "I see you have X. Plan a new feature?"
- Seeds the questionnaire with detected stack (no need to ask "what framework?").

#### First-Time User Onboarding
- Welcome screen on first activation with example ideas to try.
- Guided first run: tooltips explaining each step.
- Celebration when first plan is generated.
- "What's next?" guidance after export.
- See GAPS_AND_IMPROVEMENTS.md for full onboarding flow spec.

#### Anonymous Opt-In Telemetry
- Opt-in only (ask user on first activation).
- Tracks: activation, generation success/failure, feature usage, errors.
- NEVER tracks: code, plans, ideas, API keys, workspace paths.
- Required to make data-driven product decisions.
- See GAPS_AND_IMPROVEMENTS.md for full telemetry spec.

#### PIM Schema Versioning
- `schemaVersion: "1.0.0"` field on every Project.
- Migration functions for future schema changes.
- Prevents data loss when PIM evolves in V1.5+.

#### Offline/Cost Indicators
- Connectivity check before generation attempts.
- Estimated API cost shown before generation ("~$0.01 - $0.05").
- Clear error messages when offline.
- See GAPS_AND_IMPROVEMENTS.md for full spec.

---

## User Flows

### Flow A: Greenfield (New App)
1. User runs command: "Plan New App" (or opens sidebar)
2. User types idea: "A habit tracking app for mobile"
3. Classifier tags it: Mobile (confidence: 0.92)
4. Questionnaire: 8 mobile-specific questions, user answers/skips
5. Blueprint generated: PRD + architecture + schema (reviewed in tabs)
6. Task DAG generated: 10-14 tasks with dependencies (visualized in graph)
7. Export: writes /plan/ folder, .cursorrules or CLAUDE.md to workspace
8. User builds with their AI tool, referencing the plan

### Flow B: Brownfield (Existing Project)
1. User runs command: "Understand This Project"
2. Scanner runs locally: detects React + Next.js + PostgreSQL + Prisma
3. System says: "I see a Next.js app with PostgreSQL. What do you want to add?"
4. User types: "Subscription billing with Stripe"
5. Questionnaire seeded with detected stack (skips framework questions)
6. Blueprint + DAG generated to FIT existing architecture
7. Export: plan references existing entities, uses existing patterns

---

## Explicit Out of Scope for V1

| Feature | Why It Is Cut | When |
|---------|---------------|------|
| Full codebase intelligence / architecture discovery | High build cost. Light stub only in V1. | V1.5 |
| Drift detection / repo re-scanning | Needs the DAG + export to be solid first. | V2 |
| Test generation (Playwright/Cypress) | Second product bolted onto the first. | V2 |
| All 6 categories fully fleshed out | 3 deep beats 6 shallow. | V1.5 |
| Multi-agent auto-detection (active tool) | File-presence detection is enough for V1. | V1.5 |
| Hosted backend / accounts / billing | No DB needed. Plans live in repo. | Never (optional) |
| Visual architecture diagrams (ERD image) | Markdown tables are enough. | V2 |
| Buildability scores / health dashboards | Nothing real to score without drift engine. | V2 |
| Multi-agent orchestration | Enterprise territory, no users yet. | V3 |
| Team collaboration | Single-player for V1. | V3 |
| Production telemetry / feedback loop | No production integration in V1. | V3 |
| User-facing docs site | High effort for V1. Can be markdown initially. | V1.5 |
| Crash reporting (Sentry) | Can add after launch when errors actually occur. | V1.5 |
| "What's new" update popup | Nice-to-have. Not blocking launch. | V1.5 |
| Settings import/export | Single-machine for V1. | V1.5 |
| i18n infrastructure | English-only for V1. Externalize strings in V1.5. | V1.5 |
| Uninstall feedback survey | Not enough users to matter in V1. | V1.5 |
| Public roadmap board | Can be a simple GitHub Project. | V1.5 |
| Contribution guidelines | No external contributors yet. | V1.5 |
| Multi-root workspace support | Edge case. Single-root for V1. | V1.5 |
| Rate limiting / cost caps | BYOK model. User controls their own spend. | V2 (hosted) |
| Remote development support | Untested. Add support when users request. | V1.5 |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Extension Host | TypeScript + VS Code Extension API | Native VS Code integration |
| UI Framework | React 18 (in webview) | Familiar, component-based |
| Styling | Tailwind CSS + VS Code CSS variables | Auto-theming, small bundle |
| DAG Rendering | React Flow (@xyflow/react) | Interactive dependency graphs |
| LLM (default) | Claude API (Sonnet 4) | Best structured output |
| LLM (alt) | OpenAI, Google, custom | Model-agnostic architecture |
| Bundler | esbuild | Fast, minimal config |
| State | React Context + useReducer | No extra dependencies |
| Persistence | Flat files in /plan/ | Git-versioned, no DB |
| Distribution | VS Code Marketplace + Open VSX | Maximum reach |

---

## Success Criteria

V1 is ready to ship when:

1. **Speed**: User goes from one-sentence idea to full /plan/ folder in under 5 minutes.
2. **Differentiation**: Questionnaire for SaaS, Mobile, CLI Tool feels genuinely different (not just reworded).
3. **Correctness**: Task DAG has correct dependency ordering for at least 3 test ideas end-to-end.
4. **Usability**: .cursorrules or CLAUDE.md export is immediately usable in real AI coding sessions.
5. **Performance**: Extension loads in <500ms, blueprint generates in <30 seconds.
6. **Robustness**: Works with at least 2 different LLM providers (Claude + one other).
7. **Graceful degradation**: If strong model fails, system retries with simpler strategy automatically.
8. **Onboarding**: New user can complete first plan without reading any documentation.
9. **Privacy**: Privacy policy published, telemetry is opt-in, no PII collected.
10. **Error handling**: All error cases show user-friendly messages, no raw errors exposed.

---

## File Structure (Summary)

```
src/
  extension.ts                   # Entry point
  commands/                      # planNewApp, understandProject, exportPlan
  core/                          # pim, classifier, questionnaire, blueprint, taskDag, contextPack, decisionRegister
  llm/                           # client, prompts, parser, modelAdapter
  export/                        # markdown, cursorrules, claudemd, agentsmd
  webview/                       # bridge, protocol
  utils/                         # workspace, fileIO, validation, idGenerator
  types/                         # pim, messages, constants

webview/
  index.html, index.tsx, App.tsx
  components/                    # ~15 React components
  hooks/                         # useBridge, useProject, useLoading
  context/                       # ProjectContext, AppContext
  styles/                        # globals.css

test/
  unit/                          # ~50 unit tests
  integration/                   # ~10 integration tests
  fixtures/                      # sample project data
```

---

## Build Phases

```
Phase 1: Foundation
  Scaffolding, config, deps, "Hello World" extension
  
Phase 2: Category Classifier
  LLM client, prompt templates, response parser, classification flow
  
Phase 3: Questionnaire
  Question banks (3 categories), engine, QuestionPanel UI
  
Phase 4: Blueprint Generator
  Blueprint prompt, generator, parser, BlueprintView UI
  + Model-agnostic prompting (Tier 1/2/3)
  
Phase 5: Task DAG
  Task prompt, DAG builder, cycle detection, topological sort, React Flow canvas
  
Phase 6: Context Packs + Export
  Context pack generator, markdown renderer, agent rules generators, export orchestrator
  + Decision Register UI
  
Phase 7: UI Polish + Light Scanner
  State machine, keyboard nav, accessibility, persistence, "Understand This Project" stub
  
Phase 8: Testing + Deployment
  Write tests, manual test scenarios, package, publish to Marketplace + Open VSX
```

---

## What Makes This Defensible

1. **The Graph**: The connected model (idea -> requirements -> architecture -> tasks -> decisions -> tests) is hard to replicate. It gets more valuable over time.
2. **Context Scoping**: Determining "what does the AI agent actually need to know for this specific task" is a genuine insight, not a feature checkbox.
3. **Agent Adapters**: The canonical PIM -> adapter -> agent-format pattern means supporting a new AI tool is a day's work, not a rewrite.
4. **Git-Native**: Plans version with code. No vendor lock-in. Users can leave anytime.
5. **Model-Agnostic**: Not bet on one horse. Works today with Claude, tomorrow with whatever comes next.

---

## Business Model (Future)

| Tier | What | Price |
|------|------|-------|
| Free | BYOK (bring your own API key), basic planning | $0 |
| Pro | Hosted AI, advanced planning, drift detection | TBD |
| Team | Shared projects, collaboration, team rules | TBD |

V1 is Free. Monetization comes after proving value.

---

## What Comes Next (V1.5 Headline)

**Full Repo Scanner**: Deep codebase intelligence — architecture discovery, technology detection, existing-project planning that truly understands the codebase.

This is the headline update that gets announced, blogged about, and brings the next wave of users.

---

## Immediate Next Steps

1. Lock this scope (this document).
2. Scaffold the extension (Phase 1).
3. Build classifier -> questionnaire -> blueprint (Phases 2-4).
4. Build DAG + decisions + context packs (Phases 5-6).
5. Polish UI + light scanner (Phase 7).
6. Test, package, ship (Phase 8).

**Estimated time to V1: 5-6 weeks** (with model-agnostic layer and light scanner stub).
