# PLAN 01: Current State Analysis

## Where We Are Right Now

### What We Have (Assets)
1. **chatdraft.md** — A 3600+ line concept document containing:
   - Initial product idea (vibe coding planning tool)
   - Googles Gemini plan (generic spec generator architecture)
   - Claudes improvements (drift detection, DAG, category-aware questionnaire)
   - A refined V1 scope doc (wedge features, build order, success criteria)
   - ChatGPTs massive upgrade (Project Intelligence Model, V1-V5 roadmap, 30 sections)
   - V2-V5 detailed plans (codebase scanning, drift engine, verification, control plane)
   - A critical analysis warning about scope creep and the "escalation trap"

2. **No code exists yet** — This is a greenfield project

3. **Clear product direction** — After three AI consultations, we know:
   - What to build (V1 scope)
   - What NOT to build yet (V2-V5)
   - The architectural foundation needed (PIM-first)
   - The wedge features that matter (questionnaire, DAG, decisions)

### What We Do NOT Have
- No repository initialized
- No dependencies installed
- No scaffolding or project structure
- No API keys configured
- No development environment set up
- No tests written
- No CI/CD pipeline
- No marketplace publisher account

## What the Concept Document Contains (Breakdown)

### Section 1: Initial Idea (Lines 1-70)
- The core concept: AI-driven planning tool for vibe coders
- Comparison to TestSprite, GitSpec
- Basic pipeline: User Input -> Spec Generation -> Structured Blueprint -> Export
- Five pillars: PRD, Architecture, Schema, Prompt Plan, Rules

### Section 2: Googles Gemini Plan (Lines 56-68)
- Recommended stack: Next.js, Tailwind, Shadcn, React Flow, Supabase
- This was the starting point but we are NOT using this stack
- We are building a VS Code extension, not a web app

### Section 3: Claudes Improvements (Lines 70-280)
Key upgrades over Gemini:
- Drift detector (scan repo, diff against blueprint)
- Task DAG instead of flat list
- Category-aware questionnaire (not generic)
- Agent-specific export formatting
- Reality check pass before generation
- VS Code extension architecture (not Next.js web app)
- Webview panel for UI
- Claude API called directly from extension host
- Flat files for persistence (no database)

### Section 4: V1 Scope Doc (Lines 124-223)
- One-line pitch
- Goal: prove two wedge features
- User flow (8 steps)
- Feature scope (classifier, questionnaire, blueprint, DAG, export)
- Out of scope items
- Tech stack
- Success criteria
- Build order

### Section 5: ChatGPTs Massive Upgrade (Lines 282-1936)
Major concepts introduced:
- **Project Intelligence Model (PIM)** — structured graph connecting everything
- **Project Knowledge Graph** — trace relationships (API -> Feature -> Requirement -> User Story)
- **Adaptive Interview** — KNOWN/UNKNOWN/ASSUMED/CONFLICTING/HIGH-RISK tracking
- **Decision Engine** — Decision Register with options, recommendations, impact
- **Reality Engine** — complexity analysis, scope recommendations
- **Buildability Score** — project health metrics
- **Context Packs** — scoped context per task (not whole PRD)
- **Agent Profiles** — adapter layer for different AI tools
- **Multi-Agent Architecture** — specialized reasoning stages
- **Model-Agnostic LLM** — router between fast/cheap and powerful models
- **Business model** — BYOK free tier, Pro hosted, Team, Enterprise

### Section 6: V2-V5 Detailed Plans (Lines 1938-3470)
- V2: Codebase Intelligence (scanner, technology detection, architecture discovery)
- V3: Drift and Governance (continuous monitoring, drift types, impact analysis)
- V4: Verification and Quality (requirements-to-tests, coverage, security)
- V5: AI Development Control Plane (orchestrator, agent sessions, team collaboration)

### Section 7: Critical Analysis / Scope Warning (Lines 3548-3575)
The most important insight in the entire document:
- Three AI models escalated the idea repeatedly
- Each round sounded more impressive but added scope
- The "trap" is endless escalation without shipping
- The actual upgrade is SMALLER than you think:
  1. Typed PIM as internal data model (not markdown-first)
  2. Decision Register as third wedge feature
  3. Context-pack generation added to Task DAG export

## Refined V1 Scope (What We Are Actually Building)

### Three Wedge Features
1. **Category-Aware Questionnaire** — Tailored questions based on app type
2. **Task DAG** — Dependency-aware build order visualization
3. **Decision Register** — Log of architectural decisions with rationale

### Supporting Features
- Category classifier (LLM-based, single call)
- Blueprint generator (PRD + architecture + schema)
- Context pack generator (per-task scoped context)
- Agent-specific export (.cursorrules, CLAUDE.md, AGENTS.md)

### Structural Decisions
- **PIM-first**: TypeScript interfaces as source of truth, markdown as export
- **Context packs**: Each task gets its own scoped context.md
- **Decision register**: Prevents AI flip-flopping on architecture
- **No backend**: Files in repo, git-versioned
- **3 categories**: SaaS, Mobile, CLI Tool (depth over breadth)

### What We Are NOT Building (Staying Focused)
- No drift detection (V2)
- No codebase scanning (V2)
- No test generation (V4)
- No hosted backend (never for V1)
- No multi-agent orchestration (V5)
- No team collaboration (V5)
- No buildability scores (visualization sugar without data)
- No production readiness dashboards (nothing to measure yet)

## The Development Environment We Need

### Required Tools
1. **Node.js** (v18+ recommended) — Runtime for building the extension
2. **npm** (v9+) — Package manager
3. **VS Code** — Development IDE and testing target
4. **Git** — Version control
5. **Anthropic API Key** — For Claude API access (Sonnet 4)

### Recommended Tools
1. **TypeScript** (v5+) — Already required for VS Code extensions
2. **esbuild** — Fast bundler for the webview code
3. **@vscode/vsce** — VS Code Extension CLI for packaging
4. **Prettier** — Code formatting (optional but recommended)

### Optional Tools
1. **Cursor** — AI-powered editor (ironic but useful for building an AI tool)
2. **GitHub CLI** — For creating repositories and managing issues
3. **Open VSX Account** — For publishing to the open-source marketplace

## What Comes Next

The immediate next step is **Phase 1: Foundation** — setting up the project scaffolding, installing dependencies, and creating the basic extension structure. This is documented in PLAN_05_BUILD_PHASE_1.md.

Before writing any code, we need to:
1. Initialize the project directory
2. Set up package.json with correct dependencies
3. Configure TypeScript
4. Set up the extension manifest (package.json contributes)
5. Create the basic extension host entry point
6. Set up the webview bundling pipeline
7. Verify the extension loads in VS Code

## Risk Assessment

### High Risks
1. **Scope creep** — The document is full of tempting V2-V5 features. Must resist.
2. **LLM output quality** — Structured output from Claude may need multiple attempts
3. **Webview complexity** — React in VS Code webview has constraints (no node APIs)

### Medium Risks
1. **API key management** — Users need to provide their own key securely
2. **Marketplace approval** — VS Code Marketplace has review requirements
3. **Cross-platform issues** — Windows, macOS, Linux path differences

### Low Risks
1. **Dependency conflicts** — Minimal dependencies reduce this risk
2. **Performance** — LLM calls are the bottleneck, not local code
3. **Security** — No backend means no server-side attack surface

## Key Decisions Already Made (Do Not Revisit)

These decisions are final. The plan is built on them. Do not second-guess them during implementation:

1. **VS Code extension, not web app** — This is the deployment channel
2. **TypeScript throughout** — Extension host and webview both use TS
3. **Claude API for LLM** — Best structured output for spec generation
4. **No backend for V1** — Files in repo, git-versioned
5. **PIM-first architecture** — Structured data model, markdown as export
6. **3 categories for V1** — SaaS, Mobile, CLI Tool
7. **esbuild for bundling** — Fast, minimal config
8. **React for webview** — Familiar, component-based
9. **React Flow for DAG** — Interactive dependency graph
10. **BYOK model for V1** — Users provide their own API key
