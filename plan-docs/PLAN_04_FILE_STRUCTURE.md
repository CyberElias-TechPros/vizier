# PLAN 04: Complete File Structure

## Overview
This document lists every file in the project, its purpose, and its dependencies. Follow this structure exactly.

## Complete Directory Tree

```
vibecoder/
|-- .vscode/
|   |-- launch.json              # VS Code debug configuration
|   |-- tasks.json               # VS Code build tasks
|   |-- settings.json            # Workspace settings (recommended extensions)
|
|-- plan-docs/                   # The planning documents (this folder)
|   |-- PLAN_README.md
|   |-- PLAN_01_CURRENT_STATE.md
|   |-- PLAN_02_ARCHITECTURE.md
|   |-- PLAN_03_DATA_MODELS.md
|   |-- PLAN_04_FILE_STRUCTURE.md
|   |-- PLAN_05_BUILD_PHASE_1.md
|   |-- PLAN_06_BUILD_PHASE_2.md
|   |-- PLAN_07_BUILD_PHASE_3.md
|   |-- PLAN_08_BUILD_PHASE_4.md
|   |-- PLAN_09_BUILD_PHASE_5.md
|   |-- PLAN_10_BUILD_PHASE_6.md
|   |-- PLAN_11_BUILD_PHASE_7.md
|   |-- PLAN_12_TESTING.md
|   |-- PLAN_13_DEPLOYMENT.md
|   |-- PLAN_14_V2_V5_ROADMAP.md
|
|-- src/                         # Extension source code
|   |-- extension.ts             # Entry point - extension activation
|   |
|   |-- commands/
|   |   |-- planNewApp.ts        # Command: Plan New App
|   |   |-- openSidebar.ts       # Command: Open Planner Sidebar
|   |   |-- exportPlan.ts        # Command: Export Plan to Files
|   |
|   |-- core/
|   |   |-- pim.ts               # PIM data model and operations
|   |   |-- classifier.ts        # Category classifier
|   |   |-- questionnaire.ts     # Questionnaire engine
|   |   |-- blueprint.ts         # Blueprint generator
|   |   |-- taskDag.ts           # Task DAG builder
|   |   |-- contextPack.ts       # Context pack generator
|   |   |-- decisionRegister.ts  # Decision register management
|   |
|   |-- llm/
|   |   |-- client.ts            # Claude API client wrapper
|   |   |-- prompts.ts           # All prompt templates
|   |   |-- parser.ts            # Parse LLM responses into PIM
|   |
|   |-- export/
|   |   |-- markdown.ts          # Render PIM to markdown files
|   |   |-- cursorrules.ts       # Generate .cursorrules
|   |   |-- claudemd.ts          # Generate CLAUDE.md
|   |   |-- agentsmd.ts          # Generate AGENTS.md
|   |
|   |-- webview/
|   |   |-- bridge.ts            # Message passing host <-> webview
|   |   |-- protocol.ts          # Message type definitions
|   |
|   |-- utils/
|   |   |-- workspace.ts         # VS Code workspace utilities
|   |   |-- fileIO.ts            # File read/write utilities
|   |   |-- validation.ts        # Input validation
|   |   |-- idGenerator.ts       # ID generation (REQ-001, etc.)
|   |
|   |-- types/
|       |-- pim.ts               # TypeScript interfaces for PIM
|       |-- messages.ts          # Webview message types
|       |-- constants.ts         # Constants (categories, defaults)
|
|-- webview/                     # React webview source (bundled separately)
|   |-- index.html               # HTML entry point for webview
|   |-- index.tsx                # React entry point
|   |-- App.tsx                  # Root React component
|   |
|   |-- components/
|   |   |-- Header.tsx           # Extension header (name, project)
|   |   |-- IdeaInput.tsx        # Initial idea text input
|   |   |-- CategoryBadge.tsx    # Shows classified category
|   |   |-- QuestionPanel.tsx    # Renders current question
|   |   |-- AnswerInput.tsx      # Input for answering questions
|   |   |-- ProgressBar.tsx      # Questionnaire progress
|   |   |-- BlueprintView.tsx    # Blueprint tabs container
|   |   |-- OverviewTab.tsx      # PRD tab
|   |   |-- ArchitectureTab.tsx  # Architecture tab
|   |   |-- SchemaTab.tsx        # Schema tab
|   |   |-- TaskDagView.tsx      # DAG visualization
|   |   |-- TaskList.tsx         # Flat task checklist
|   |   |-- TaskDetail.tsx       # Selected task details
|   |   |-- DecisionLog.tsx      # Decision register display
|   |   |-- DecisionCard.tsx     # Single decision card
|   |   |-- ExportPanel.tsx      # Export options
|   |   |-- LoadingSpinner.tsx   # Loading indicator
|   |   |-- ErrorMessage.tsx     # Error display
|   |
|   |-- hooks/
|   |   |-- useBridge.ts         # Hook for webview communication
|   |   |-- useProject.ts        # Hook for project state
|   |   |-- useLoading.ts        # Hook for loading states
|   |
|   |-- context/
|   |   |-- ProjectContext.tsx   # React context for project data
|   |   |-- AppContext.tsx       # React context for app state
|   |
|   |-- styles/
|   |   |-- globals.css          # Global styles (Tailwind imports)
|   |
|   |-- utils/
|       |-- formatters.ts        # Display formatters
|       |-- clipboard.ts         # Clipboard operations
|
|-- scripts/
|   |-- build-webview.js         # esbuild script for webview bundle
|   |-- package-extension.js     # vsce packaging script
|
|-- test/                        # Test files
|   |-- unit/
|   |   |-- pim.test.ts
|   |   |-- classifier.test.ts
|   |   |-- questionnaire.test.ts
|   |   |-- taskDag.test.ts
|   |   |-- export.test.ts
|   |   |-- validation.test.ts
|   |
|   |-- integration/
|   |   |-- extension.test.ts
|   |   |-- webview.test.ts
|   |
|   |-- fixtures/
|       |-- sample-projects.ts   # Sample project data for tests
|
|-- dist/                        # Build output (gitignored)
|   |-- extension.js             # Bundled extension code
|   |-- webview.js               # Bundled webview code
|
|-- .gitignore                   # Git ignore rules
|-- .vscodeignore                # VS Code packaging ignore rules
|-- package.json                 # NPM package manifest + extension manifest
|-- tsconfig.json                # TypeScript config (extension)
|-- tsconfig.webview.json        # TypeScript config (webview)
|-- tailwind.config.js           # Tailwind CSS config
|-- postcss.config.js            # PostCSS config (for Tailwind)
|-- README.md                    # Extension documentation
|-- CHANGELOG.md                 # Version history
|-- LICENSE.md                   # License file
|-- esbuild.config.js            # esbuild configuration
```

## File-by-File Details

### Root Configuration Files

#### package.json
- NPM package manifest
- VS Code extension manifest (contributes section)
- Dependencies and devDependencies
- Scripts (build, test, package)
- **Critical**: Must include all activation events, commands, views containers

#### tsconfig.json
- TypeScript config for extension host code
- Target: ES2022
- Module: CommonJS
- Strict mode: true
- Includes: src/**/*.ts
- Excludes: webview/**, node_modules, dist

#### tsconfig.webview.json
- TypeScript config for webview React code
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode: true
- Includes: webview/**/*.ts, webview/**/*.tsx

#### tailwind.config.js
- Content paths: webview/**/*.tsx
- Theme extensions (if needed)
- Plugins: forms, typography

#### postcss.config.js
- Plugins: tailwindcss, autoprefixer

### Extension Host Files (src/)

#### src/extension.ts
- **Purpose**: Entry point that VS Code calls on activation
- **Exports**: activate(context), deactivate()
- **Responsibilities**:
  1. Register commands (planNewApp, openSidebar, exportPlan)
  2. Register sidebar webview provider
  3. Load saved project from workspace (if exists)
  4. Initialize secrets API for API key storage

#### src/commands/planNewApp.ts
- **Purpose**: Main entry point for planning a new app
- **Trigger**: Command palette, sidebar button
- **Flow**: Creates new Project -> opens sidebar -> shows IdeaInput

#### src/commands/openSidebar.ts
- **Purpose**: Opens the planner sidebar
- **Trigger**: Command palette, extension icon click
- **Flow**: Shows webview with current state

#### src/commands/exportPlan.ts
- **Purpose**: Exports current plan to files
- **Trigger**: Export button in webview
- **Flow**: Detects AI tools -> renders files -> writes to workspace

#### src/core/pim.ts
- **Purpose**: PIM creation, update, serialization
- **Key functions**:
  - createProject(name, category): Project
  - updateProject(project, updates): Project
  - addRequirement(project, req): Project
  - addTask(project, task): Project
  - addDecision(project, decision): Project
  - serialize(project): string
  - deserialize(json): Project

#### src/core/classifier.ts
- **Purpose**: Classify app idea into category
- **Key functions**:
  - classifyIdea(idea: string): Promise<{category, confidence}>
- **Uses**: Claude API with classification prompt

#### src/core/questionnaire.ts
- **Purpose**: Manage questionnaire flow
- **Key functions**:
  - getQuestionsForCategory(category): Question[]
  - getNextQuestion(answers): Question | null
  - processAnswer(questionId, answer): void
  - getProgress(): {answered, total}

#### src/core/blueprint.ts
- **Purpose**: Generate blueprint from PIM + answers
- **Key functions**:
  - generateBlueprint(project): Promise<BlueprintResult>
- **Uses**: Claude API with blueprint prompt

#### src/core/taskDag.ts
- **Purpose**: Build task DAG from blueprint
- **Key functions**:
  - generateTasks(project): Promise<Task[]>
  - validateDag(tasks): boolean (no cycles)
  - topologicalSort(tasks): Task[] (build order)
  - getBlockedTasks(tasks): Task[]

#### src/core/contextPack.ts
- **Purpose**: Generate context packs for each task
- **Key functions**:
  - generateContextPack(project, task): ContextPack
  - generateAllContextPacks(project): ContextPack[]

#### src/core/decisionRegister.ts
- **Purpose**: Manage decision register
- **Key functions**:
  - addDecision(project, decision): Project
  - updateDecision(project, id, updates): Project
  - getDecision(project, id): Decision

#### src/llm/client.ts
- **Purpose**: Claude API client wrapper
- **Key functions**:
  - createMessage(params): Promise<AnthropicResponse>
  - streamMessage(params): AsyncGenerator
- **Handles**: API key retrieval, error handling, retries

#### src/llm/prompts.ts
- **Purpose**: All LLM prompt templates
- **Exports**:
  - CLASSIFICATION_PROMPT
  - BLUEPRINT_PROMPT
  - TASK_GENERATION_PROMPT
  - Each with system + user message structure

#### src/llm/parser.ts
- **Purpose**: Parse LLM responses into PIM structures
- **Key functions**:
  - parseClassification(response): {category, confidence}
  - parseBlueprint(response): BlueprintResult
  - parseTasks(response): Task[]
- **Handles**: JSON extraction, validation, error recovery

#### src/export/markdown.ts
- **Purpose**: Render PIM to markdown files
- **Key functions**:
  - renderOverview(project): string
  - renderArchitecture(project): string
  - renderSchema(project): string
  - renderTasks(project): string
  - renderDecisions(project): string

#### src/export/cursorrules.ts
- **Purpose**: Generate .cursorrules content
- **Key functions**:
  - generateCursorRules(project): string

#### src/export/claudemd.ts
- **Purpose**: Generate CLAUDE.md content
- **Key functions**:
  - generateClaudeMd(project): string

#### src/export/agentsmd.ts
- **Purpose**: Generate AGENTS.md content
- **Key functions**:
  - generateAgentsMd(project): string

#### src/webview/bridge.ts
- **Purpose**: Handle webview message passing
- **Key functions**:
  - sendMessageToWebview(panel, type, payload): void
  - handleWebviewMessage(message): void
  - createWebviewPanel(): WebviewPanel

#### src/webview/protocol.ts
- **Purpose**: Define message types
- **Exports**: TypeScript unions for all message types

#### src/utils/workspace.ts
- **Purpose**: VS Code workspace utilities
- **Key functions**:
  - getWorkspaceRoot(): string | null
  - fileExists(path): boolean
  - readFile(path): string
  - writeFile(path, content): void
  - detectAITools(): string[]

#### src/utils/fileIO.ts
- **Purpose**: File I/O utilities
- **Key functions**:
  - ensureDir(path): void
  - safeWriteFile(path, content): void
  - readJSON(path): any
  - writeJSON(path, data): void

#### src/utils/validation.ts
- **Purpose**: Input validation
- **Key functions**:
  - validateIdea(idea): {valid, error}
  - validateAnswer(question, answer): {valid, error}
  - validateProject(project): {valid, errors[]}

#### src/utils/idGenerator.ts
- **Purpose**: Generate sequential IDs
- **Key functions**:
  - nextRequirementId(project): string
  - nextTaskId(project): string
  - nextDecisionId(project): string
  - nextEntityId(project): string
  - nextRuleId(project): string

#### src/types/pim.ts
- **Purpose**: TypeScript interfaces (from PLAN_03)
- **Exports**: All PIM interfaces and types

#### src/types/messages.ts
- **Purpose**: Webview message type definitions
- **Exports**: All message type unions

#### src/types/constants.ts
- **Purpose**: Constants used throughout
- **Exports**: Categories, default values, question banks

### Webview Files (webview/)

#### webview/index.html
- HTML shell for webview
- Loads bundled webview.js
- Minimal markup (React renders everything)

#### webview/index.tsx
- React entry point
- Renders App component into #root
- Sets up context providers

#### webview/App.tsx
- Root component
- Manages current view (idea_input, questionnaire, blueprint, tasks, export)
- Renders appropriate child component

#### webview/components/*.tsx
- Each component file exports a single React component
- Components are functional (not class-based)
- Use hooks for state management

#### webview/hooks/useBridge.ts
- Hook for sending/receiving messages to/from extension host
- Returns { sendMessage, lastMessage, connectionStatus }

#### webview/hooks/useProject.ts
- Hook for accessing project data from context
- Returns { project, updateProject, isLoading }

#### webview/hooks/useLoading.ts
- Hook for managing loading states
- Returns { isLoading, error, startLoading, stopLoading, setError }

#### webview/context/ProjectContext.tsx
- React context for project data
- Provider wraps App, consumes messages from host

#### webview/context/AppContext.tsx
- React context for app-level state (view, loading, error)

#### webview/styles/globals.css
- Tailwind imports (@tailwind base, components, utilities)
- Custom CSS variables for theming

### Test Files (test/)

#### test/unit/*.test.ts
- Unit tests for pure functions
- No VS Code dependencies
- Use Node.js assert or light test framework

#### test/integration/extension.test.ts
- Integration tests using VS Code test harness
- Tests command registration, activation

#### test/fixtures/sample-projects.ts
- Sample project data for tests
- Used across multiple test files

## Dependencies Between Files

### Dependency Graph (Simplified)
```
extension.ts
  |-- commands/*
  |     |-- core/*
  |     |-- llm/*
  |     |-- webview/*
  |     |-- utils/*
  |-- core/*
  |     |-- types/*
  |     |-- llm/*
  |     |-- utils/*
  |-- llm/*
  |     |-- utils/*
  |-- export/*
  |     |-- types/*
  |-- webview/*
  |     |-- utils/*
  |-- utils/*
  |-- types/*
```

### Import Rules
1. types/ can be imported by anyone
2. utils/ can be imported by anyone
3. core/ can import from llm/, utils/, types/
4. commands/ can import from core/, webview/, llm/, utils/, types/
5. extension.ts can import from commands/, webview/, utils/, types/
6. webview/ React code imports from webview/ only (no src/ imports)

## Build Output

### dist/extension.js
- Bundled extension host code (from src/)
- Generated by esbuild
- Single file, CommonJS format

### dist/webview.js
- Bundled webview React code (from webview/)
- Generated by esbuild
- Single file, IIFE format
- Includes React, React Flow, Tailwind styles
