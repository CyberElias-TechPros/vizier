# PLAN 14: V2 to V5 Future Roadmap

## Purpose of This Document
This document outlines the long-term vision for the extension beyond V1. It is NOT a commitment to build all of this immediately. It is a roadmap showing where the product can go, informed by the architecture we build in V1.

## Critical Principle

**V1 architecture MUST anticipate V5.**

The PIM schema, the adapter pattern, the task graph, the ID system — these are not just for V1. They are the foundation that every future version builds on. If we design V1 correctly, we do not throw it away for V5. V1 becomes the first client of the same underlying engine.

## V2: Codebase Intelligence

### Core Idea
"I already have a project. Understand it for me."

### What Changes
- Add a second entry point: "Understand This Project" alongside "Plan New App"
- Scan existing repositories and generate a project map
- Map actual code to the PIM structure

### New Features

#### V2.1: Workspace Scanner
- File discovery (walk directory tree)
- File classification (source, config, test, doc)
- Dependency analysis (parse package.json, imports)
- Symbol extraction (functions, classes, interfaces)
- Relationship extraction (call graphs, imports)

#### V2.2: Technology Detection
- Detect frameworks (React, Next.js, Express, etc.)
- Detect databases (PostgreSQL, MongoDB, etc.)
- Detect authentication (JWT, sessions, OAuth)
- Detect testing frameworks (Vitest, Jest, Playwright)
- Flag version mismatches

#### V2.3: Architecture Discovery
- Construct architecture map (frontend -> backend -> DB)
- Identify layers (API, service, data access)
- Detect circular dependencies
- Map module boundaries

#### V2.4: Project Map UI
- Visual map of the codebase structure
- Click on module to see details
- Highlight relationships between modules

#### V2.5: Existing Project Planning
- "Add subscriptions" to existing project
- System scans current architecture
- Generates plan that fits existing patterns
- No need to start from scratch

### PIM Extensions for V2

```typescript
interface Project {
  // ... V1 fields ...
  
  // V2 additions
  codebase?: {
    files: string[];
    modules: Module[];
    detected_technologies: Technology[];
    last_scan: string;
  };
}

interface Module {
  name: string;
  path: string;
  files: string[];
  imports: string[];
  exports: string[];
  type: 'feature' | 'shared' | 'config' | 'test';
}
```

### Why V2 Matters
- Second market: existing codebases (not just new ideas)
- Users with messy projects can get them documented
- Foundation for drift detection (V3)

## V3: Drift and Project Governance

### Core Idea
"Keep the plan and code synchronized."

### What Changes
- Continuous monitoring of the codebase
- Detection of divergence from the plan
- Automatic generation of fix tasks

### New Features

#### V3.1: Continuous Repository Monitoring
- Watch file changes (debounced)
- Local analysis (no AI for every change)
- AI analysis only for significant changes
- Impact assessment for each change

#### V3.2: Drift Detection Types
- **Architecture drift**: Plan says PostgreSQL, code has MongoDB
- **Requirement drift**: Plan says owner-only edit, code allows any auth user
- **Schema drift**: Field added in code but not in plan
- **API drift**: Route renamed or missing
- **Dependency drift**: New dependency not in plan

#### V3.3: Drift Severity Classification
- CRITICAL: Security issue, data loss risk
- HIGH: Functional breakage, major divergence
- MEDIUM: Inconsistency, should fix
- LOW: Cosmetic, can ignore

#### V3.4: Change Impact Analysis
- "You changed X. This affects Y requirements, Z tasks."
- Visual impact graph
- Apply or reject change options

#### V3.5: Plan Diff
- v1.3 -> v1.4: What changed?
- Visual diff of blueprint versions
- Git-friendly plan history

#### V3.6: Decision Governance
- Detected drift becomes a decision
- User approves or rejects
- Accepted changes update the plan
- Full audit trail

#### V3.7: Project Health Dashboard
- Requirements: X% implemented
- Architecture: Y% consistent
- Tests: Z% coverage
- Overall: N% health score

### PIM Extensions for V3

```typescript
interface Project {
  // ... V2 fields ...
  
  // V3 additions
  drift_incidents?: DriftIncident[];
  plan_versions?: PlanVersion[];
}

interface DriftIncident {
  id: string;
  type: 'architecture' | 'requirement' | 'schema' | 'api' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  expected: string;
  actual: string;
  detected_at: string;
  status: 'open' | 'acknowledged' | 'fixed' | 'accepted';
  affected_tasks: string[];
  affected_requirements: string[];
}
```

### Why V3 Matters
- Turns one-time tool into always-on companion
- Prevents "the plan is fiction" problem
- Foundation for verification (V4)

## V4: Verification and Quality Intelligence

### Core Idea
"Dont just know what should exist. Prove that it works."

### What Changes
- Tests are derived from requirements (not generated randomly)
- Coverage is measured by requirement (not just code)
- Security is analyzed in context of the plan

### New Features

#### V4.1: Requirements to Tests
- REQ-042 "Only owners can edit" generates:
  - TEST-042-A: Owner can edit (positive)
  - TEST-042-B: Non-owner cannot edit (negative)
  - TEST-042-C: Unauthenticated cannot edit (negative)
  - TEST-042-D: Admin override works (edge case)

#### V4.2: Acceptance Criteria Engine
- Each task has acceptance criteria
- Each criterion maps to a test
- Verification passes only when all tests pass

#### V4.3: Test Generation
- Unit tests (Vitest/Jest)
- Integration tests (API tests)
- E2E tests (Playwright/Cypress)
- System chooses based on detected tech

#### V4.4: Test Mapping (Graph)
```
REQ -> FEATURE -> TASK -> CODE -> TEST
```
- Traceability from requirement to test
- "Which tests prove this requirement?"

#### V4.5: Requirement Coverage
- Not just code coverage
- "Authentication: 100% tested"
- "Payments: 61% tested"
- Identifies under-tested areas

#### V4.6: Security Verification
- Auth checks on all endpoints
- Input validation present
- No secrets in code
- Dependency vulnerabilities

#### V4.7: Production Readiness Gate
- Requirements: 96% complete
- Critical tests: passing
- Critical drift: 0
- Security issues: 2 HIGH
- Verdict: READY WITH WARNINGS

### PIM Extensions for V4

```typescript
interface Project {
  // ... V3 fields ...
  
  // V4 additions
  tests?: TestCase[];
  coverage?: RequirementCoverage[];
}

interface TestCase {
  id: string;
  requirement_id: string;
  task_id: string;
  type: 'unit' | 'integration' | 'e2e';
  description: string;
  file_path?: string;
  status: 'pending' | 'passing' | 'failing';
}
```

### Why V4 Matters
- Closes the loop: plan -> build -> verify
- Generates tests that actually matter
- Foundation for orchestration (V5)

## V5: AI Development Control Plane

### Core Idea
Coordinate the entire AI development lifecycle.

### What Changes
- The extension becomes an orchestrator
- AI agents are first-class citizens
- Human approval gates for risky operations
- Team collaboration features

### New Features

#### V5.1: AI Orchestrator
- Manages the development workflow
- Task unlocks -> context generated -> prompt created -> user confirms -> AI implements -> tests run -> task done
- User remains in control at all times

#### V5.2: Agent Selection
- Architecture tasks -> reasoning model
- Simple refactor -> fast model
- Large implementation -> coding agent
- Testing -> verification agent

#### V5.3: Agent Sessions
- Every AI coding session is tracked
- Session-1042: Task AUTH-031, Claude Code, 17 files changed, 22/23 tests passed
- Full development history

#### V5.4: Agent Memory
- Next agent knows what previous agents did
- "Previous work: AUTH-031. Do not rewrite authentication."
- Solves AI forgetfulness problem

#### V5.5: Human Approval Gates
- SAFE: Formatting, docs, tests (auto)
- NORMAL: Feature implementation (auto)
- HIGH RISK: DB migration, auth, security (approval required)

#### V5.6: Natural Language Control
- "What is left to finish?"
- "Why isnt this production ready?"
- "Build business reviews" -> full impact analysis -> approval -> execution

#### V5.7: Team Collaboration
- Shared projects
- Roles and permissions
- Comments and approvals
- Team engineering rules

#### V5.8: Development Analytics
- Tasks completed: 184
- AI sessions: 96
- AI-generated code: 71%
- Task success rate: 91%
- Rework rate: 13%

#### V5.9: Production Feedback Loop
- Production incident -> related requirements -> affected tasks -> fix task created
- Connects production reality back to development plan

### PIM Extensions for V5

```typescript
interface Project {
  // ... V4 fields ...
  
  // V5 additions
  sessions?: AgentSession[];
  team?: TeamMember[];
  analytics?: ProjectAnalytics;
}

interface AgentSession {
  id: string;
  task_id: string;
  agent: string;
  started_at: string;
  files_changed: string[];
  tests_run: number;
  tests_passed: number;
  status: 'in_progress' | 'needs_review' | 'completed';
}
```

### Why V5 Matters
- Becomes infrastructure for AI development
- Moat: the graph connecting everything
- Business model: enterprise AI governance

## The Ultimate Loop

```
IDEA -> DISCOVERY -> PLAN -> ARCHITECT -> BUILD GRAPH -> CONTEXT -> AI CODING -> CODE -> TEST -> VERIFY -> RELEASE -> PRODUCTION -> OBSERVABILITY -> PROJECT INTELLIGENCE -> DRIFT -> NEW TASK -> BUILD
```

## Feature Matrix

| Capability | V1 | V2 | V3 | V4 | V5 |
|---|---|---|---|---|---|
| Idea planning | Y | Y | Y | Y | Y |
| Adaptive interview | Y | Y | Y | Y | Y |
| Task DAG | Y | Y | Y | Y | Y |
| Context engine | Y | Y | Y | Y | Y |
| Decision register | Y | Y | Y | Y | Y |
| Codebase scanning | - | Y | Y | Y | Y |
| Architecture discovery | - | Y | Y | Y | Y |
| Existing-project planning | - | Y | Y | Y | Y |
| Drift detection | - | - | Y | Y | Y |
| Requirement traceability | - | - | Y | Y | Y |
| Change impact analysis | - | - | Y | Y | Y |
| AI test generation | - | - | - | Y | Y |
| Requirement verification | - | - | - | Y | Y |
| Security analysis | - | - | - | Y | Y |
| AI orchestration | - | - | - | - | Y |
| Agent sessions | - | - | - | - | Y |
| Team collaboration | - | - | - | - | Y |
| Production feedback | - | - | - | - | Y |

## What NOT to Build (Ever, Probably)

Some ideas from the original brainstorming that should probably never be built:

- **Auto-deploy to production** - Too risky, users wont trust it
- **Autonomous coding without human review** - Dangerous
- **Replacing developers** - Wrong value proposition
- **Full project management (Jira replacement)** - Different product
- **Code review replacement** - Use specialized tools

## When to Build What

**Build V2 when:** V1 has 100+ active users requesting codebase scanning
**Build V3 when:** Users complain "my plan doesnt match my code"
**Build V4 when:** Users ask "how do I know my tests cover my plan?"
**Build V5 when:** Teams ask "can we share this across our team?"

**Do not build any of this before V1 ships and has users.**
