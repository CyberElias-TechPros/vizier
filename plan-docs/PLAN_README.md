# Vibe Coding Planning Extension — Master Plan

## What This Is
A VS Code extension that turns a loose app idea into a structured, agent-ready build plan. It takes a one-sentence idea, asks intelligent questions based on the app category, and generates a complete blueprint (PRD, architecture, schema, task DAG, context packs, and agent-specific rules files).

## Current State
- We have a concept document (chatdraft.md) combining insights from Gemini, Claude, and ChatGPT
- No code has been written yet
- We have a refined V1 scope with clear wedge features
- We have detailed V2-V5 roadmap for future expansion

## Plan File Structure

| File | Purpose |
|------|---------|
| PLAN_README.md | This file — master index and navigation |
| PLAN_01_CURRENT_STATE.md | Where we are now, what we have, what we are starting with |
| PLAN_02_ARCHITECTURE.md | Full technical architecture, every decision explained |
| PLAN_03_DATA_MODELS.md | PIM schemas, TypeScript interfaces, relationships |
| PLAN_04_FILE_STRUCTURE.md | Complete directory tree, every file listed |
| PLAN_05_BUILD_PHASE_1.md | Foundation: project scaffolding, config, dependencies |
| PLAN_06_BUILD_PHASE_2.md | Category classifier: LLM-based idea classification |
| PLAN_07_BUILD_PHASE_3.md | Questionnaire: category-aware slot-filling |
| PLAN_08_BUILD_PHASE_4.md | Blueprint generator: PRD, architecture, schema |
| PLAN_09_BUILD_PHASE_5.md | Task DAG: dependency-aware build graph |
| PLAN_10_BUILD_PHASE_6.md | Context packs and export: per-task context, agent rules |
| PLAN_11_BUILD_PHASE_7.md | UI/Webview: sidebar interface, React components |
| PLAN_12_TESTING.md | Testing strategy: how to validate each piece |
| PLAN_13_DEPLOYMENT.md | Deployment: packaging, marketplace publishing |
| PLAN_14_V2_V5_ROADMAP.md | Future versions: codebase scanning, drift, verification |
| UPGRADE_REPO_AND_MODEL.md | **UPGRADE**: Existing repo analysis + model-agnostic planning |
| VIBEPLAN_V1_SCOPE.md | **FINAL**: Unified V1 scope document (the single source of truth) |
| SUPPLEMENT_ERRORS_AND_PIPELINE.md | **SUPPLEMENT**: Error taxonomy, retry logic, 5-stage LLM pipeline, CSP security, phase gates, anti-patterns, performance budget |
| GAPS_AND_IMPROVEMENTS.md | **GAPS**: Industry standard additions — onboarding, telemetry, privacy, offline handling, cost controls, i18n readiness |

## V1 Core Architecture (The Golden Rules)

1. **PIM First**: The Project Intelligence Model is the internal source of truth. Markdown is an export format, not the data model.
2. **Three Wedge Features**: Category-aware questionnaire, Task DAG, Decision Register
3. **Context Packs**: Each task gets scoped context, not the whole PRD
4. **Agent Adapters**: One canonical model, multiple export formats
5. **No Backend for V1**: Everything lives as files in the users repo
6. **Depth Over Breadth**: 3 categories done well, not 6 done poorly

## Tech Stack (V1)

| Layer | Technology | Why |
|-------|-----------|-----|
| Extension Host | TypeScript + VS Code Extension API | Native VS Code integration |
| UI Framework | React 18 (in webview) | Familiar, component-based |
| Styling | Tailwind CSS | Fast development, small bundle |
| DAG Rendering | React Flow (@xyflow/react) | Interactive dependency graphs |
| LLM | Claude API (Sonnet 4) | Best structured output |
| Bundler | esbuild | Fast, minimal config |
| State | React Context + useReducer | No extra dependencies |
| Persistence | Flat files in /plan/ | Git-versioned, no DB |

## V1 Feature Summary

### Three Wedge Features
1. **Category-Aware Questionnaire** — Tailored questions based on app type
2. **Task DAG** — Dependency-aware build order visualization
3. **Decision Register** — Log of architectural decisions with rationale

### Supporting Features
- Category classifier (LLM-based)
- Blueprint generator (PRD + architecture + schema)
- Context pack generator (per-task scoped context)
- Agent-specific export (.cursorrules, CLAUDE.md, AGENTS.md)

### Explicitly Out of Scope (V1)
- Drift detection
- Codebase scanning
- Test generation
- Hosted backend/accounts
- Multi-agent orchestration
- Team collaboration

## Success Criteria (V1)

1. User goes from one-sentence idea to full /plan/ folder in under 5 minutes
2. Questionnaire for SaaS, Mobile, CLI Tool feels genuinely different
3. Task DAG has correct dependency ordering (validated on 3+ test ideas)
4. .cursorrules/CLAUDE.md export is immediately usable in real AI tools
5. Extension loads in <500ms, blueprint generates in <30 seconds

## Build Order (V1)

```
Phase 1: Foundation (scaffolding, config, deps)
    |
    v
Phase 2: Category Classifier (LLM call, single category out)
    |
    v
Phase 3: Questionnaire System (category-aware slot-filling)
    |
    v
Phase 4: Blueprint Generator (PRD + architecture + schema)
    |
    v
Phase 5: Task DAG (dependency graph + visualization)
    |
    v
Phase 6: Context Packs + Export (per-task context + agent rules)
    |
    v
Phase 7: UI/Webview (sidebar interface, polish)
    |
    v
Testing + Deployment
```

## Key Terminology

| Term | Meaning |
|------|---------|
| PIM | Project Intelligence Model — the structured data representation |
| DAG | Directed Acyclic Graph — the task dependency structure |
| Wedge Feature | A feature strong enough to be the sole reason a user adopts the product |
| Slot-Filling | Structured questionnaire where each question fills a specific data slot |
| Context Pack | A scoped subset of the blueprint relevant to a single task |
| Agent Adapter | A converter from canonical PIM to agent-specific format |
| Drift | Divergence between the plan and actual codebase |

## How to Use This Plan

1. Read PLAN_01_CURRENT_STATE.md first to understand where we are
2. Read PLAN_02_ARCHITECTURE.md to understand the technical decisions
3. Read PLAN_03_DATA_MODELS.md to understand the data structures
4. Follow phases 1-7 in order — each builds on the previous
5. Reference PLAN_04_FILE_STRUCTURE.md for exact file paths
6. Use PLAN_12_TESTING.md to validate as you go
7. Use PLAN_13_DEPLOYMENT.md when ready to ship
