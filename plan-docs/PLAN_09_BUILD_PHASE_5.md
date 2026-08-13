# PLAN 09: Build Phase 5 - Task DAG

## Goal of This Phase
Build the Task DAG system: an LLM-powered task generator that creates dependency-aware build tasks, and a React Flow visualization that shows the task dependency graph in the sidebar.

## Why This Phase Fifth?
The Task DAG is WEDGE FEATURE #2. It transforms the blueprint from a static document into an actionable, ordered build plan. The visualization makes dependencies clear and helps users understand what to build first.

## What We Are Building

### Input
- Blueprint (product, requirements, architecture, entities from Phase 4)

### Output
- Tasks[]: 10-20 tasks, each with:
  - Title, description, dependencies, status
  - Acceptance criteria, expected files, linked requirements
- DAG: Valid dependency graph (no cycles)
- Build order: Topological sort of tasks

### Architecture
```
Blueprint
    |
    v
[taskDag.ts] -- constructs task generation prompt
    |
    v
[client.ts] -- calls Claude API
    |
    v
[parser.ts] -- parses task JSON
    |
    v
[taskDag.ts] -- validates DAG (no cycles)
    |
    v
[taskDag.ts] -- topological sort for build order
    |
    v
[Webview: TaskDagView] -- React Flow canvas
```

## Task Design Principles

### Task Granularity
Each task should be "one AI coding session" sized:
- NOT "Build the backend" (too big)
- NOT "Create the User model" (too small)
- YES "Build authentication flow with session context" (just right)

### Task Structure
Every task has:
- **id**: TASK-001, TASK-002, etc.
- **title**: Short, actionable ("Set up Prisma schema and migrations")
- **description**: What to build in detail (2-3 sentences)
- **depends_on**: Task IDs that must be done first
- **acceptance_criteria**: How to verify (3-5 bullet points)
- **files_expected**: What files this task creates
- **requirement_ids**: Which requirements this satisfies
- **status**: not_started/in_progress/done

### Dependency Rules
1. Database setup must come before API routes
2. Auth must come before protected features
3. Core entities must come before features using them
4. Parallel tasks are possible (independent features)
5. No circular dependencies (validated by DAG algorithm)

## Implementation Steps

### Step 5.1: Create Task Generation Prompt

**File:** src/llm/prompts.ts (add to existing)

**New export:** TASK_GENERATION_PROMPT

**System message:** "You are a senior developer breaking down a blueprint into actionable build tasks..."

**User message template:**
- Blueprint summary (product, architecture, entities)
- Task design principles (granularity guide)
- Expected output format (JSON array of tasks)

### Step 5.2: Create Task DAG Builder

**File:** src/core/taskDag.ts

**Functions:**
- generateTasks(project): Promise<Task[]>
- validateDag(tasks): DagValidationResult
- topologicalSort(tasks): Task[] (build order)
- getBlockedTasks(tasks, doneIds): Task[]
- getNextTasks(tasks, doneIds): Task[]
- calculateProgress(tasks): {total, done, percentage}

### Step 5.3: Implement Cycle Detection

**File:** src/core/taskDag.ts (internal function)

**Algorithm:** Depth-first search to detect back edges
- If cycle detected, throw error with cycle path
- Report to user which tasks form the cycle
- Request LLM to regenerate with corrected dependencies

### Step 5.4: Create Task DAG View

**File:** webview/components/TaskDagView.tsx

**Layout:**
- Left: React Flow canvas (interactive DAG)
- Right: Task detail panel
- Bottom: Flat task list (checklist view)

### Step 5.5: Create React Flow Canvas

**File:** webview/components/TaskDagView.tsx (internal)

**Node design:**
- Rectangle with task title
- Status color (gray=not started, yellow=in progress, green=done)
- Click to select and show details

**Edge design:**
- Arrow from dependency to dependent
- Animated dashed lines for pending dependencies

### Step 5.6: Create Task List

**File:** webview/components/TaskList.tsx

**Features:**
- Flat ordered list (respects dependencies)
- Checkboxes for marking done
- Expandable to show details
- Filters: all, not started, in progress, done, blocked

### Step 5.7: Create Task Detail

**File:** webview/components/TaskDetail.tsx

**Shows when task is selected:**
- Full description
- Dependencies (clickable to navigate)
- Acceptance criteria
- Expected files
- "Generate Context" button (leads to Phase 6)

### Step 5.8: Handle Task Status Updates

**File:** src/core/taskDag.ts

**Functions:**
- markTaskDone(project, taskId): Project
- markTaskInProgress(project, taskId): Project
- recalculateBlockedTasks(project): Task[]

**Status flow:**
- not_started -> in_progress -> done
- Marking done triggers recalculation of blocked tasks
- Unblocked tasks become available

### Step 5.9: Wire to Planning Flow

**File:** Update webview/App.tsx

**Changes:**
- After blueprint review, show "Generate Tasks" button
- On click, send GENERATE_TASKS to host
- Show loading state
- On TASK_DAG_READY, show TaskDagView
- User can explore DAG, mark tasks done

## Testing the Task DAG

### Test Cases
1. **SaaS project** - Should generate 12-18 tasks
   - First task: "Initialize Next.js project with TypeScript"
   - Last task: "Polish UI and error boundaries"
   - Dependencies: auth before features, schema before API

2. **Mobile project** - Should generate 10-15 tasks
   - First task: "Set up Expo project"
   - Dependencies: navigation before screens, API client before data screens

3. **CLI project** - Should generate 8-12 tasks
   - First task: "Initialize Node.js CLI with Commander"
   - Dependencies: config before features, tests for each command

### DAG Validation Test
1. Verify no cycles in generated tasks
2. Verify topological sort is correct
3. Verify all dependency references are valid task IDs
4. Verify marking done unblocks dependent tasks

## Phase 5 Deliverables

1. src/llm/prompts.ts - Updated with TASK_GENERATION_PROMPT
2. src/core/taskDag.ts - Task DAG builder with validation and sorting
3. src/llm/parser.ts - Updated with parseTasks
4. webview/components/TaskDagView.tsx - DAG visualization container
5. webview/components/TaskList.tsx - Flat task checklist
6. webview/components/TaskDetail.tsx - Task detail panel
7. Updated webview/App.tsx - Task DAG flow integration

## What Comes Next
Phase 6: Context Packs and Export - We will build per-task context generation and agent-specific export files.
