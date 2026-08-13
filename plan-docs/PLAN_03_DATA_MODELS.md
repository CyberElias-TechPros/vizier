# PLAN 03: PIM Data Models (Project Intelligence Model)

## Overview
This document defines every TypeScript interface, type, and data structure used in the extension. The PIM is the internal source of truth. All LLM outputs are parsed INTO these structures. All exports are rendered FROM these structures.

## Why TypeScript Interfaces (Not Classes)?
- **Serialization**: Interfaces serialize directly to JSON (for file storage)
- **No runtime overhead**: Interfaces are compile-time only
- **Flexibility**: Easy to add optional fields without breaking changes
- **LLM-friendly**: JSON output from Claude maps directly to interfaces

## Core Types

### ProjectCategory
The six possible app categories. V1 ships with 3 fully fleshed out (SaaS, Mobile, CLI_Tool).

```typescript
type ProjectCategory =
  | 'saas'           // Web application with users, billing, dashboards
  | 'mobile'         // iOS/Android app (React Native, Flutter, native)
  | 'cli_tool'       // Command-line utility or tool
  | 'browser_ext'    // Browser extension (Chrome, Firefox)
  | 'game'           // Game (2D, 3D, web, mobile)
  | 'internal_tool'; // Internal business tool, dashboard, admin panel
```

### Priority
Used for requirements classification (MoSCoW method).

```typescript
type Priority = 'must' | 'should' | 'could';
```

### TaskStatus
The three states a task can be in for V1.

```typescript
type TaskStatus = 'not_started' | 'in_progress' | 'done';
```

### DecisionStatus
Decisions can be proposed, approved, or superseded by a later decision.

```typescript
type DecisionStatus = 'proposed' | 'approved' | 'superseded';
```

### RuleCategory
Organizes rules by area of concern.

```typescript
type RuleCategory = 'architecture' | 'style' | 'security' | 'performance';
```

## Main Interfaces

### Project (Root Object)
The top-level object that contains everything.

```typescript
interface Project {
  id: string;                    // UUID v4, generated on creation
  name: string;                  // Project name (derived from idea or user input)
  category: ProjectCategory;     // Classified category
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp (on every change)
  version: string;               // Semantic version of the plan (1.0.0)
  product: Product;              // Product definition
  requirements: Requirement[];   // All requirements
  features: Feature[];           // All features
  architecture: Architecture;    // Tech stack choices
  entities: Entity[];            // Data model entities
  tasks: Task[];                 // Task DAG nodes
  decisions: Decision[];         // Decision register
  rules: Rule[];                 // Coding rules/constraints
  context_packs: ContextPack[];  // Per-task context packs
}
```

### Product
Describes what the app is and who it is for.

```typescript
interface Product {
  vision: string;                // One-sentence value proposition
  target_audience: string;       // Who will use this
  mvp_scope: string;             // What is included in MVP
  phase2_scope: string;          // What is deferred to Phase 2
  core_workflows: string[];      // 3-5 step user journeys
}
```

### Requirement
A single, testable requirement for the product.

```typescript
interface Requirement {
  id: string;                    // Format: REQ-001, REQ-002, etc.
  text: string;                  // The requirement statement
  priority: Priority;            // must/should/could
  source: string;                // Which question produced this (for traceability)
}
```

### Feature
A cohesive feature made up of requirements.

```typescript
interface Feature {
  id: string;                    // Format: FEAT-001, FEAT-002, etc.
  name: string;                  // Short feature name
  description: string;           // One paragraph description
  requirement_ids: string[];     // Links to REQ ids
}
```

### Architecture
Complete tech stack specification with rationale.

```typescript
interface Architecture {
  frontend: {
    framework: string;           // e.g., "Next.js 15"
    ui_library: string;          // e.g., "Tailwind CSS + Shadcn"
    state_management: string;    // e.g., "React Server Components + Context"
    routing: string;             // e.g., "App Router"
  };
  backend: {
    runtime: string;             // e.g., "Node.js"
    framework: string;           // e.g., "Next.js Route Handlers"
    api_style: string;           // e.g., "REST" or "GraphQL" or "Server Actions"
  };
  database: {
    type: string;                // e.g., "PostgreSQL"
    orm: string;                 // e.g., "Prisma"
    hosting: string;             // e.g., "Supabase"
  };
  auth: {
    strategy: string;            // e.g., "Session-based"
    provider: string;            // e.g., "NextAuth.js v5"
  };
  storage: {
    provider: string;            // e.g., "S3" or "Supabase Storage"
    type: string;                // e.g., "Object storage"
  };
  infrastructure: {
    hosting: string;             // e.g., "Vercel"
    ci_cd: string;               // e.g., "GitHub Actions"
  };
  rationale: {                   // WHY each choice was made
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    storage: string;
    infrastructure: string;
  };
}
```

### Entity (Data Model)
A database table or collection.

```typescript
interface Entity {
  id: string;                    // Format: ENT-001, ENT-002, etc.
  name: string;                  // e.g., "User", "Business", "Review"
  fields: Field[];               // Columns/fields
  relationships: Relationship[]; // Foreign keys, associations
}

interface Field {
  name: string;                  // e.g., "id", "email", "created_at"
  type: string;                  // e.g., "string", "number", "boolean", "datetime"
  required: boolean;             // NOT NULL
  unique: boolean;               // UNIQUE constraint
  indexed: boolean;              // Has database index
  default?: string;              // Default value
  description?: string;          // What this field stores
}

interface Relationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  target_entity: string;         // Name of the related entity
  foreign_key?: string;          // Field that holds the reference
  description?: string;          // Nature of the relationship
}
```

### Task (DAG Node)
A single build task sized for one AI coding session.

```typescript
interface Task {
  id: string;                    // Format: TASK-001, TASK-002, etc.
  title: string;                 // Short, actionable title
  description: string;           // What to build
  depends_on: string[];          // IDs of tasks that must be done first
  status: TaskStatus;            // not_started/in_progress/done
  acceptance_criteria: string[]; // How to verify this is done
  files_expected: string[];      // Files this task should create/modify
  requirement_ids: string[];     // Which requirements this task satisfies
  estimated_effort: string;      // "small" | "medium" | "large" (for UX only)
}
```

### Decision (Decision Register Entry)
A documented architectural decision.

```typescript
interface Decision {
  id: string;                    // Format: DEC-001, DEC-002, etc.
  topic: string;                 // What decision was made
  options: Option[];             // Alternatives considered
  chosen: string;                // Which option was selected
  rationale: string;             // Why this option was chosen
  impacts: string[];             // What areas this affects
  status: DecisionStatus;        // proposed/approved/superseded
}

interface Option {
  name: string;                  // e.g., "PostgreSQL"
  pros: string[];                // Advantages
  cons: string[];                // Disadvantages
}
```

### Rule (Coding Constraint)
A constraint or convention for the AI coding agent.

```typescript
interface Rule {
  id: string;                    // Format: RULE-001, RULE-002, etc.
  category: RuleCategory;        // architecture/style/security/performance
  text: string;                  // The rule statement
  rationale: string;             // Why this rule exists
}
```

### Context Pack
A scoped subset of the blueprint relevant to a single task.

```typescript
interface ContextPack {
  task_id: string;               // Which task this is for
  summary: string;               // One-paragraph context summary
  requirements: Requirement[];   // Only requirements relevant to this task
  entities: Entity[];            // Only entities this task touches
  decisions: Decision[];         // Only decisions that affect this task
  rules: Rule[];                 // Only rules this task must follow
  files: string[];               // Expected file paths
  do_not: string[];              // Things this task must NOT do
}
```

## ID Generation Rules

IDs are sequential within each type, zero-padded to 3 digits:
- REQ-001, REQ-002, ... (Requirements)
- FEAT-001, FEAT-002, ... (Features)
- ENT-001, ENT-002, ... (Entities)
- TASK-001, TASK-002, ... (Tasks)
- DEC-001, DEC-002, ... (Decisions)
- RULE-001, RULE-002, ... (Rules)

The ID prefix tells you what kind of object it is. The number is unique within that type only.

## State Management

### Extension Host State
The extension host maintains:
1. **Current Project** (Project object or null)
2. **Current Step** (enum: idea_input, questionnaire, blueprint, tasks, export)
3. **Questionnaire Progress** (current question index, answers so far)
4. **Webview Connection Status** (connected/disconnected)

### Webview State
The React app maintains:
1. **View** (enum: idea_input, questionnaire, blueprint, tasks, export)
2. **Project Data** (subset of Project relevant to current view)
3. **UI State** (loading, error, selected tab, selected task)
4. **Messages** (chat history for questionnaire)

### State Synchronization
- Extension host is the authority
- Webview requests state on mount (GET_STATE)
- Host pushes updates after every change (STATE_UPDATE)
- Webview never mutates state directly (sends commands)

## Validation Rules

### Project Validation
- id must be a valid UUID
- name must be 1-100 characters
- category must be one of the 6 valid categories
- product.vision must be 1-200 characters

### Task Validation
- depends_on must reference valid task IDs
- depends_on must not create circular dependencies (validated by DAG algorithm)
- acceptance_criteria must have at least 1 item

### Entity Validation
- name must be PascalCase
- fields must include at least an id field
- relationships must reference valid entity names

### Decision Validation
- options must have at least 2 entries
- chosen must match one of the option names

## Serialization

### To JSON (for internal storage)
```typescript
function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}
```

### From JSON (for loading)
```typescript
function deserializeProject(json: string): Project {
  const data = JSON.parse(json);
  // Validation happens here
  return data as Project;
}
```

### To Markdown (for export)
Each interface has a corresponding render function (see PLAN_10 for details).

## Type Guards

TypeScript type guards for runtime validation:

```typescript
function isProject(obj: any): obj is Project {
  return obj && obj.id && obj.name && obj.category && obj.product;
}

function isTask(obj: any): obj is Task {
  return obj && obj.id && obj.title && Array.isArray(obj.depends_on);
}

function isEntity(obj: any): obj is Entity {
  return obj && obj.id && obj.name && Array.isArray(obj.fields);
}
```

## Future Extensions (V2-V5)

These fields are NOT used in V1 but the schema accommodates them:

```typescript
interface Project {
  // ... V1 fields ...
  
  // V2: Codebase Intelligence
  codebase?: {
    files: string[];
    modules: string[];
    detected_technologies: string[];
    last_scan: string;
  };
  
  // V3: Drift Detection
  drift_incidents?: DriftIncident[];
  
  // V4: Verification
  tests?: TestCase[];
  
  // V5: Team
  team?: TeamMember[];
}
```
