# PLAN 10: Build Phase 6 - Context Packs and Export

## Goal of This Phase
Build two systems:
1. **Context Packs**: Generate scoped context for each task (not the whole PRD)
2. **Export System**: Render the PIM to markdown files and agent-specific rules files

## Why This Phase Sixth?
Context packs are what make the plan actually usable when coding. Instead of dumping the entire PRD into Cursor, each task gets exactly the context it needs. The export system writes everything to files in the users repo.

## What We Are Building

### Context Packs
For each task, generate:
- Relevant requirements (subset)
- Relevant entities (subset)
- Relevant decisions (subset)
- Relevant rules (subset)
- Expected file paths
- "Do not" list (things this task must NOT do)

### Export System
Generate these files in the users repo:
```
plan/
  overview.md       - PRD
  architecture.md   - Tech stack with rationale
  schema.md         - Data model
  tasks.md          - Task DAG as checklist
  decisions.md      - Decision register
  context/
    TASK-001.md     - Context pack for task 1
    TASK-002.md     - Context pack for task 2
    ...
.cursorrules        - Agent rules for Cursor
CLAUDE.md           - Agent rules for Claude Code (if detected)
AGENTS.md           - Generic agent rules (fallback)
```

## Implementation Steps

### Step 6.1: Create Context Pack Generator

**File:** src/core/contextPack.ts

**Functions:**
- generateContextPack(project, task): ContextPack
- generateAllContextPacks(project): ContextPack[]
- getRelevantRequirements(task, allRequirements): Requirement[]
- getRelevantEntities(task, allEntities): Entity[]
- getRelevantDecisions(task, allDecisions): Decision[]
- getRelevantRules(task, allRules): Rule[]

### Step 6.2: Context Pack Algorithm

**Relevance scoring:**
1. Direct link: Task references requirement ID -> include
2. Entity usage: Task files reference entity -> include
3. Decision impact: Decision affects tasks area -> include
4. Rule category: Rule applies to task type -> include

**"Do not" list generation:**
- Things explicitly excluded from task scope
- Things handled by other tasks
- Architecture constraints that limit the task

### Step 6.3: Create Markdown Renderer

**File:** src/export/markdown.ts

**Functions:**
- renderOverview(project): string (markdown for PRD)
- renderArchitecture(project): string (markdown for architecture)
- renderSchema(project): string (markdown for data model)
- renderTasks(project): string (markdown for task DAG)
- renderDecisions(project): string (markdown for decision register)
- renderContextPack(pack): string (markdown for single context pack)

**Markdown formatting:**
- Use headings, lists, tables, code blocks
- Make it readable in any markdown viewer
- Include metadata (generated date, version)

### Step 6.4: Create Agent Rules Generators

**File:** src/export/cursorrules.ts

**Generates .cursorrules content:**
- Architecture constraints from PIM
- Coding style conventions
- Error handling patterns
- File organization rules
- "Do not" rules (prevent common AI mistakes)

**File:** src/export/claudemd.ts

**Generates CLAUDE.md content:**
- Same content as cursorrules but in Claude Code format
- Uses Claude-specific conventions (tool hints, context structure)

**File:** src/export/agentsmd.ts

**Generates AGENTS.md content:**
- Generic format that works with any AI agent
- Most compatible fallback format

### Step 6.5: Create Export Orchestrator

**File:** Update src/commands/exportPlan.ts

**Functions:**
- exportPlan(project): Promise<ExportResult>
- detectInstalledTools(workspacePath): string[]
- writeFiles(workspacePath, files): Promise<void>
- showExportSummary(result): void

### Step 6.6: Create Export Panel UI

**File:** webview/components/ExportPanel.tsx

**Features:**
- "Export to Files" button
- Agent selector (auto-detected, overridable)
- Preview of files to be written
- Success confirmation with file list

### Step 6.7: Create Decision Register UI

**File:** webview/components/DecisionLog.tsx
**File:** webview/components/DecisionCard.tsx

**Features:**
- List of all decisions with status
- Expandable to show options considered
- Rationale display
- Status indicator (proposed/approved/superseded)

### Step 6.8: Wire to Planning Flow

**File:** Update webview/App.tsx

**Changes:**
- After Task DAG, show "Review and Export" step
- Show DecisionLog
- Show ExportPanel
- On export, write files and show confirmation

## Testing Context Packs

### Test Case
1. Select a task (e.g., "Build authentication flow")
2. Verify context pack includes:
   - Auth-related requirements
   - User entity
   - Auth decision
   - Security rules
   - Expected auth files
3. Verify it does NOT include:
   - Payment requirements
   - Payment entity
   - UI styling rules

## Testing Export

### Test Case
1. Click "Export to Files"
2. Verify files created in workspace:
   - plan/overview.md exists and has content
   - plan/architecture.md exists and has content
   - plan/schema.md exists and has content
   - plan/tasks.md exists and has content
   - plan/decisions.md exists and has content
   - plan/context/TASK-001.md exists for each task
   - .cursorrules exists (if Cursor detected)
3. Open files and verify markdown is well-formatted
4. Drop .cursorrules into a real Cursor project and verify it loads

## Phase 6 Deliverables

1. src/core/contextPack.ts - Context pack generator
2. src/export/markdown.ts - Markdown renderer
3. src/export/cursorrules.ts - .cursorrules generator
4. src/export/claudemd.ts - CLAUDE.md generator
5. src/export/agentsmd.ts - AGENTS.md generator
6. Updated src/commands/exportPlan.ts - Export orchestrator
7. webview/components/ExportPanel.tsx - Export UI
8. webview/components/DecisionLog.tsx - Decision register UI
9. webview/components/DecisionCard.tsx - Single decision card
10. Updated webview/App.tsx - Export flow integration

## What Comes Next
Phase 7: UI/Webview - We will polish the complete sidebar interface with all components integrated.
