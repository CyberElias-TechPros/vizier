# PLAN 02: Complete Technical Architecture

## Architecture Overview
This document explains every technical decision, why it was made, and how the pieces connect.

## High-Level Architecture

```
+-------------------------------------------------------------------+
|                        VS Code / Cursor                           |
|                                                                   |
|  +-----------------------------+  +----------------------------+  |
|  |   Sidebar UI (Webview)      |  |   Extension Host (Node)    |  |
|  |                             |  |                            |  |
|  |  - React + Tailwind         |  |  - VS Code APIs           |  |
|  |  - React Flow (DAG)         |  |  - File system access     |  |
|  |  - Context bridge           |  |  - Claude API calls       |  |
|  +-----------------------------+  |  - PIM management         |  |
|                                   |  - Export engine          |  |
|                                   +----------------------------+  |
|                                                                   |
+-------------------------------------------------------------------+
                          |
                          v
                  +------------------+
                  |   Claude API     |
                  |   (Sonnet 4)     |
                  +------------------+
                          |
                          v
                  +------------------+
                  |  Users Repo      |
                  |  /plan/*.md      |
                  |  .cursorrules    |
                  |  CLAUDE.md       |
                  +------------------+
```

## Why This Architecture?

### Why VS Code Extension (Not Web App)?
- Direct workspace access to read/write files in the users project
- No context switching - user stays in their editor
- Universal compatibility across VS Code, Cursor, Windsurf, VSCodium
- No hosting costs - no servers to maintain for V1
- Git-native - plans live in the repo, versioned with code

### Why Webview for UI?
- VS Code extensions cannot use native UI frameworks
- Webview is the only way to render custom interfaces
- React in webview is well-documented and supported
- Webview communicates with extension host via postMessage

### Why No Backend for V1?
- Simpler - no servers, no auth, no database
- Faster to ship - half the architecture to build
- Git-versioned - plans are version-controlled with code
- No maintenance - no uptime, no scaling, no security patches
- User owns their data - nothing stored on our servers

### Why Claude API Specifically?
- Best structured output - Sonnet 4 excels at generating specs
- JSON mode - can request structured JSON output directly
- Long context - 200K context window for complex projects
- Tool use - can be extended later for agent-like behavior

## The Project Intelligence Model (PIM)

This is the single most important architectural decision.

### The Core Principle
**Markdown is NOT the data model. Markdown is an export format.**

### Why PIM-First?
1. Reliability - structured data is predictable; LLM output is not
2. Extensibility - easy to add new fields, relationships, views
3. Drift detection - can only compare structured data to structured data
4. Traceability - requirements link to tasks link to tests link to code
5. Multiple exports - same data can render to markdown, JSON, prompts

### What PIM Contains

```
Project
+-- metadata (id, name, category, created_at)
+-- product
|   +-- vision (one-line value proposition)
|   +-- target_audience (who is this for)
|   +-- mvp_scope (what is in/out for MVP)
|   +-- phase2_scope (what comes later)
+-- requirements[]
|   +-- id (REQ-001)
|   +-- text (the requirement statement)
|   +-- priority (must/should/could)
|   +-- source (which question/answer produced this)
+-- features[]
|   +-- id (FEAT-001)
|   +-- name
|   +-- description
|   +-- requirements[] (links to REQ ids)
+-- architecture
|   +-- frontend (framework, ui_library, state_management)
|   +-- backend (runtime, framework, api_style)
|   +-- database (type, orm)
|   +-- auth (strategy, provider)
|   +-- storage (provider, type)
|   +-- infrastructure (hosting, ci_cd)
|   +-- rationale (why each choice was made)
+-- entities[]
|   +-- id (ENT-001)
|   +-- name (User, Business, Review)
|   +-- fields[] (name, type, required, unique, indexed)
|   +-- relationships[] (type, target_entity)
+-- tasks[]
|   +-- id (TASK-001)
|   +-- title
|   +-- description
|   +-- depends_on[] (other task IDs)
|   +-- status (not_started/in_progress/done)
|   +-- acceptance_criteria[]
|   +-- files_expected[]
|   +-- requirements[] (links to REQ ids)
+-- decisions[]
|   +-- id (DEC-001)
|   +-- topic
|   +-- options[] (considered alternatives)
|   +-- chosen (which option was selected)
|   +-- rationale (why)
|   +-- impacts[] (what areas this affects)
|   +-- status (proposed/approved/superseded)
+-- rules[]
|   +-- id (RULE-001)
|   +-- category (architecture/style/security/performance)
|   +-- text (the rule statement)
|   +-- rationale (why this rule exists)
+-- context_packs[]
    +-- task_id (which task this is for)
    +-- requirements[] (subset of REQ ids)
    +-- entities[] (subset of ENT ids)
    +-- decisions[] (subset of DEC ids)
    +-- rules[] (subset of RULE ids)
    +-- files[] (expected file paths)
```

## Extension Host Architecture

The extension host is the Node.js process that runs the extension. It has direct access to VS Code APIs and the file system.

### Responsibilities
1. Register commands - Plan New App, Open Sidebar, etc.
2. Manage webview - create sidebar panel, handle messages
3. Call Claude API - make LLM calls for classification, generation
4. Manage PIM - create, update, serialize the Project Intelligence Model
5. File operations - write plan files, .cursorrules, CLAUDE.md to workspace
6. Workspace detection - detect installed AI tools, read existing config

### Key Modules

```
src/
+-- extension.ts              # Entry point - activates extension
+-- commands/
|   +-- planNewApp.ts         # Main command: starts planning flow
|   +-- openSidebar.ts        # Opens the sidebar webview
|   +-- exportPlan.ts         # Triggers export to files
+-- core/
|   +-- pim.ts                # PIM data model and operations
|   +-- classifier.ts         # Category classifier (LLM call)
|   +-- questionnaire.ts      # Questionnaire engine
|   +-- blueprint.ts          # Blueprint generator (LLM call)
|   +-- taskDag.ts            # Task DAG builder
|   +-- contextPack.ts        # Context pack generator
|   +-- decisionRegister.ts   # Decision register management
+-- llm/
|   +-- client.ts             # Claude API client wrapper
|   +-- prompts.ts            # All prompt templates
|   +-- parser.ts             # Parse LLM responses into PIM
+-- export/
|   +-- markdown.ts           # Render PIM to markdown files
|   +-- cursorrules.ts        # Generate .cursorrules
|   +-- claudemd.ts           # Generate CLAUDE.md
|   +-- agentsmd.ts           # Generate AGENTS.md
+-- webview/
|   +-- bridge.ts             # Message passing between host and webview
|   +-- protocol.ts           # Message type definitions
+-- utils/
    +-- workspace.ts          # VS Code workspace utilities
    +-- fileIO.ts             # File read/write utilities
    +-- validation.ts         # Input validation
```

## Webview Architecture

The webview is a sandboxed browser environment that renders the React UI. It cannot access Node.js APIs directly.

### Communication Pattern

```
Webview (React)                  Extension Host (Node)
      |                                |
      |--- postMessage(request) ------>|
      |                                | (process, call LLM, etc.)
      |<-- postMessage(response) ------|
      |                                |
      | (update UI with response)      |
```

### Message Protocol
Every message has a type field and a payload field:

**Webview to Host messages:**
- START_PLANNING - User submitted their idea
- ANSWER_QUESTION - User answered a questionnaire question
- GENERATE_BLUEPRINT - User triggered blueprint generation
- MARK_TASK_DONE - User marked a task as complete
- EXPORT_PLAN - User wants to export to files
- GET_STATE - Webview requesting current state

**Host to Webview messages:**
- CLASSIFICATION_RESULT - Category classifier returned
- QUESTION - Next question to show user
- BLUEPRINT_READY - Blueprint generation complete
- TASK_DAG_READY - Task DAG generated
- EXPORT_COMPLETE - Files written successfully
- ERROR - Something went wrong
- STATE_UPDATE - Full state update

### Component Hierarchy

```
App
+-- Header (extension name, project name)
+-- PlanningFlow
|   +-- IdeaInput (text area for initial idea)
|   +-- CategoryBadge (shows classified category)
|   +-- QuestionPanel (renders current question)
|   |   +-- QuestionText
|   |   +-- AnswerInput (text/select/radio)
|   |   +-- SkipButton
|   |   +-- Tooltip (why this matters)
|   +-- ProgressBar (questions answered / total)
+-- BlueprintView
|   +-- OverviewTab (PRD)
|   +-- ArchitectureTab (stack choices)
|   +-- SchemaTab (data model)
+-- TaskDagView
|   +-- ReactFlowCanvas (interactive DAG)
|   +-- TaskList (flat checklist view)
|   +-- TaskDetail (selected task details)
+-- DecisionLog
|   +-- DecisionCard[] (list of decisions)
+-- ExportPanel
    +-- ExportButton (write to /plan/)
    +-- AgentSelector (which agent format)
```

## Data Flow (Complete User Journey)

### Step 1: User Opens Sidebar
1. User clicks extension icon or runs command
2. Extension host creates webview panel
3. Webview renders IdeaInput component
4. Host sends initial STATE_UPDATE to webview

### Step 2: User Submits Idea
1. User types idea in textarea, clicks Plan This
2. Webview sends START_PLANNING with idea text
3. Host receives message, calls classifier
4. Host sends CLASSIFICATION_RESULT to webview
5. Webview shows CategoryBadge and first question

### Step 3: Questionnaire
1. Host selects first question from category question bank
2. Host sends QUESTION to webview with question data
3. Webview renders QuestionPanel with input
4. User answers or skips (uses default)
5. Webview sends ANSWER_QUESTION with answer
6. Host updates PIM with answer, selects next question
7. Repeat steps 2-6 until all questions answered

### Step 4: Blueprint Generation
1. After last question, Host sends GENERATE_BLUEPRINT
2. Host constructs prompt from PIM data
3. Host calls Claude API for blueprint generation
4. Host parses response into PIM (requirements, architecture, entities)
5. Host sends BLUEPRINT_READY to webview
6. Webview shows BlueprintView with tabs

### Step 5: Task DAG Generation
1. Host constructs task generation prompt from PIM
2. Host calls Claude API for task generation
3. Host parses response into PIM tasks with dependencies
4. Host sends TASK_DAG_READY to webview
5. Webview renders React Flow canvas with DAG

### Step 6: Export
1. User clicks Export button
2. Webview sends EXPORT_PLAN to host
3. Host detects installed AI tools in workspace
4. Host renders PIM to markdown files
5. Host writes /plan/ directory with files
6. Host writes .cursorrules or CLAUDE.md
7. Host sends EXPORT_COMPLETE to webview

## Security Considerations

### API Key Handling
- User provides their own Anthropic API key
- Key stored in VS Code secrets API (encrypted, per-workspace)
- Key never leaves the extension host
- Key never sent to any server except Claude API
- Clear instructions for getting a key in extension README

### Data Privacy
- No analytics or telemetry in V1
- No data leaves the users machine except LLM calls
- All plans stored locally in the repo
- No account creation required

### LLM Prompt Safety
- System prompts do not expose user data unnecessarily
- No user files sent to LLM (only structured PIM data)
- Clear error messages if LLM call fails

## Performance Considerations

### Extension Load Time
- Target: under 500ms from activation to sidebar ready
- Achieved by: lazy loading webview, minimal startup code
- Measure with: VS Code extension profiler

### LLM Call Latency
- Classification: ~2-3 seconds (single, small prompt)
- Blueprint generation: ~10-20 seconds (large prompt, structured output)
- Task generation: ~5-10 seconds (medium prompt)
- Show loading states in UI for all LLM calls

### Webview Bundle Size
- Target: under 500KB gzipped
- Achieved by: tree-shaking, minimal dependencies
- React + React Flow + Tailwind is the core bundle
- Measure with: esbuild metafile analysis

## Testing Strategy Overview
(Detailed in PLAN_12_TESTING.md)

### Unit Tests
- PIM operations (create, update, serialize)
- Classifier prompt construction
- Questionnaire logic (next question selection)
- Export rendering (markdown generation)
- File path resolution

### Integration Tests
- Extension activation in VS Code test harness
- Webview message passing
- Claude API client (mocked)
- File system operations

### Manual Test Plan
- Test with 5 different app ideas (SaaS, Mobile, CLI)
- Verify questionnaire feels different per category
- Verify task DAG dependencies are correct
- Verify exported files are usable in Cursor/Claude Code
- Verify extension works on Windows, macOS, Linux

## What Could Go Wrong (and Mitigations)

### LLM Returns Malformed JSON
- Mitigation: Retry up to 3 times with error feedback in prompt
- Mitigation: Use Claude JSON mode (response_format: json)
- Mitigation: Validate response against TypeScript interface
- Fallback: If all retries fail, show error and partial results

### User Provides Vague Idea
- Mitigation: Classifier confidence check (ask if uncertain)
- Mitigation: Questionnaire catches gaps via slot-filling
- Mitigation: Blueprint generator fills reasonable defaults

### Webview Loses Connection
- Mitigation: Auto-reconnect on mount
- Mitigation: Persist PIM state in extension host
- Mitigation: Webview requests full state on reconnect

### Large Projects Exceed Context Window
- Mitigation: Chunk prompts (separate calls for architecture, schema, tasks)
- Mitigation: Summarize PIM before sending to LLM
- Mitigation: Progressive generation (generate in stages)

## Architecture Decision Records (ADRs)

### ADR-001: VS Code Extension Over Web App
**Status**: Accepted
**Context**: Need to deploy planning tool where developers work
**Decision**: Build as VS Code extension with webview UI
**Consequences**: positive workspace access, positive no hosting, negative webview constraints

### ADR-002: PIM-First Data Model
**Status**: Accepted
**Context**: Need reliable, extensible internal representation
**Decision**: TypeScript interfaces as source of truth, markdown as export
**Consequences**: positive reliable, positive extensible, positive enables drift detection later, negative slightly more code

### ADR-003: Claude API Only (No Multi-Model)
**Status**: Accepted
**Context**: Need best structured output for V1
**Decision**: Use Claude Sonnet 4 exclusively for V1
**Consequences**: positive best output quality, positive simpler code, negative vendor lock-in (mitigated by abstraction layer)

### ADR-004: No Backend for V1
**Status**: Accepted
**Context**: Want to ship fast, no server maintenance
**Decision**: All data stored as files in users repo
**Consequences**: positive fast to ship, positive git-versioned, positive no hosting costs, negative no real-time collaboration

### ADR-005: React Flow for DAG Visualization
**Status**: Accepted
**Context**: Need interactive dependency graph
**Decision**: Use React Flow (@xyflow/react) in webview
**Consequences**: positive interactive, positive well-maintained, negative adds ~100KB to bundle

### ADR-006: esbuild for Bundling
**Status**: Accepted
**Context**: Need fast, minimal-config bundler for webview
**Decision**: Use esbuild to bundle React webview code
**Consequences**: positive fast builds, positive minimal config, negative less ecosystem than webpack
