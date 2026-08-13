# PLAN 08: Build Phase 4 - Blueprint Generator

## Goal of This Phase
Build the blueprint generator: an LLM-powered system that takes the user's idea + questionnaire answers and generates a complete blueprint consisting of PRD (product requirements), architecture (tech stack with rationale), and schema (data model with entities and relationships).

## Why This Phase Fourth?
The blueprint is the core output of the planning tool. It takes the raw idea + structured answers and transforms them into a professional, actionable specification. This is the "magic moment" where the user sees the value.

## What We Are Building

### Input
- User's original idea (string)
- Category (ProjectCategory)
- Questionnaire answers (Answer[])

### Output
- Product: vision, target audience, MVP scope, phase 2 scope
- Requirements: 10-20 structured requirements with priorities
- Architecture: complete tech stack with rationale for each choice
- Entities: 5-10 database entities with fields and relationships

### Architecture
```
Idea + Answers
      |
      v
[blueprint.ts] -- constructs blueprint prompt
      |
      v
[client.ts] -- calls Claude API (Sonnet 4)
      |
      v
[parser.ts] -- parses JSON response
      |
      v
[pim.ts] -- populates PIM with results
      |
      v
[Webview: BlueprintView] -- displays tabs
```

## Blueprint Generation Prompt Design

### System Message
Defines the role (senior software architect), the task (generate blueprint), and the output format (JSON).

### User Message
Contains:
1. The users idea
2. The classified category
3. The questionnaire answers (formatted)
4. Instructions for generating the blueprint

### Response Format
Structured JSON with sections for product, requirements, architecture, and entities.

### Prompt Engineering Principles
1. **Be specific about output structure** - Claude performs better with explicit format
2. **Provide examples** - Show what a good blueprint looks like
3. **Request rationale** - Ask WHY for each choice, not just WHAT
4. **Set constraints** - Limit scope, prevent over-engineering
5. **Guide tech stack** - Suggest modern, popular choices

## Implementation Steps

### Step 4.1: Create Blueprint Prompt Template

**File:** src/llm/prompts.ts (add to existing)

**New export:** BLUEPRINT_PROMPT

**Structure:**
- System: "You are a senior software architect. Generate a blueprint..."
- User template: "Idea: {idea}\nCategory: {category}\nAnswers: {answers}"
- Expected response: JSON with product, requirements, architecture, entities

### Step 4.2: Create Blueprint Generator

**File:** src/core/blueprint.ts

**Main function:**
- generateBlueprint(project: Project): Promise<BlueprintResult>

**Flow:**
1. Validate project has required data (idea, category, answers)
2. Construct prompt from template
3. Call Claude API with larger token limit (4000+)
4. Parse response into BlueprintResult
5. Update PIM with results
6. Return updated project

### Step 4.3: Extend Response Parser

**File:** src/llm/parser.ts (add to existing)

**New function:**
- parseBlueprint(response): BlueprintResult

**Parses:**
- Product section (vision, audience, scope)
- Requirements array (id, text, priority, source)
- Architecture object (frontend, backend, database, auth, storage, infra)
- Entities array (id, name, fields, relationships)

### Step 4.4: Create Blueprint View UI

**File:** webview/components/BlueprintView.tsx

**Tabs:**
1. OverviewTab - Shows PRD (vision, audience, scope)
2. ArchitectureTab - Shows tech stack with rationale
3. SchemaTab - Shows entities as tables

**OverviewTab renders:**
- Vision statement
- Target audience
- MVP scope (bulleted list)
- Phase 2 scope (bulleted list)
- Core workflows (numbered steps)

**ArchitectureTab renders:**
- Frontend section (framework, UI lib, state, routing)
- Backend section (runtime, framework, API style)
- Database section (type, ORM, hosting)
- Auth section (strategy, provider)
- Each with one-paragraph rationale

**SchemaTab renders:**
- Entity cards with field tables
- Relationship indicators
- Field types, required/unique flags

### Step 4.5: Update PIM Operations

**File:** src/core/pim.ts (add to existing)

**New functions:**
- setProduct(project, product): Project
- setRequirements(project, requirements): Project
- setArchitecture(project, architecture): Project
- setEntities(project, entities): Project

### Step 4.6: Handle Large Responses

**Challenge:** Blueprint generation produces large JSON responses.

**Solutions:**
1. Set max_tokens to 8000 in API call
2. Use streaming to show progress to user
3. If response is truncated, retry with "continue" prompt
4. Validate completeness after parsing

### Step 4.7: Add Loading States

**File:** webview/components/LoadingSpinner.tsx (new)

**Shows:**
- "Generating your blueprint..."
- Animated spinner
- Progress indicator (if streaming)

### Step 4.8: Wire to Planning Flow

**File:** Update webview/App.tsx

**Changes:**
- After questionnaire completion, show loading state
- Send GENERATE_BLUEPRINT to host
- On BLUEPRINT_READY, show BlueprintView
- User can review before proceeding to tasks

## Testing the Blueprint Generator

### Test Cases
1. **SaaS idea** - "Project management tool for remote teams"
   - Should generate: auth, multi-tenancy, real-time features
   - Should recommend: Next.js, PostgreSQL, Prisma, NextAuth

2. **Mobile idea** - "Workout tracking app"
   - Should generate: offline support, push notifications
   - Should recommend: React Native, Expo, Firebase

3. **CLI idea** - "Markdown to PDF converter"
   - Should generate: config file, output format options
   - Should recommend: Node.js/Commander, npm distribution

### Quality Checklist
- Vision is one clear sentence
- Requirements are testable (not vague)
- Architecture has rationale for each choice
- Entities have proper field types
- Relationships are defined
- MVP scope is realistic (not too broad)

## Phase 4 Deliverables

1. src/llm/prompts.ts - Updated with BLUEPRINT_PROMPT
2. src/core/blueprint.ts - Blueprint generator
3. src/llm/parser.ts - Updated with parseBlueprint
4. src/core/pim.ts - Updated with setters for product/requirements/architecture/entities
5. webview/components/BlueprintView.tsx - Blueprint display
6. webview/components/OverviewTab.tsx - PRD tab
7. webview/components/ArchitectureTab.tsx - Architecture tab
8. webview/components/SchemaTab.tsx - Schema tab
9. webview/components/LoadingSpinner.tsx - Loading indicator
10. Updated webview/App.tsx - Blueprint flow integration

## What Comes Next
Phase 5: Task DAG - We will build the dependency-aware task generation and visualization system.
