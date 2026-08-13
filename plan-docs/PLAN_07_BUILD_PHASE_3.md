# PLAN 07: Build Phase 3 - Questionnaire System

## Goal of This Phase
Build the category-aware questionnaire engine: a structured slot-filling system that asks 6-10 questions based on the classified category, with sane defaults, skip options, and tooltips explaining why each question matters.

## Why This Phase Third?
The questionnaire is WEDGE FEATURE #1. It is what makes the plan feel tailored, not templated. It must feel dramatically different for SaaS vs Mobile vs CLI Tool.

## What We Are Building

### Input
- ProjectCategory (from Phase 2)
- Existing answers (for resuming)

### Output
- Complete set of answers stored in PIM
- Each answer mapped to a specific slot in the questionnaire

### Architecture
```
Category
    |
    v
[questionnaire.ts] -- selects question bank for category
    |
    v
[Webview: QuestionPanel] -- renders question + input
    |
    v
[User answer] -- sent back to host
    |
    v
[questionnaire.ts] -- stores answer, selects next question
    |
    v
Repeat until all questions answered
```

## Question Bank Design

### SaaS Questions (10 questions)
1. **auth_strategy** - How should users log in?
   - Options: email/password, OAuth (Google/GitHub), magic link, SSO
   - Default: email/password + Google OAuth
   - Why: "Auth affects your database schema and session handling"

2. **multi_tenancy** - Do organizations need separate workspaces?
   - Options: single-tenant, multi-tenant (shared DB), multi-tenant (isolated)
   - Default: single-tenant
   - Why: "Multi-tenancy significantly impacts your database design"

3. **billing** - Will you charge users?
   - Options: free, one-time purchase, subscription, usage-based
   - Default: free (add later)
   - Why: "Billing requires payment provider integration and webhooks"

4. **real_time** - Do you need real-time features?
   - Options: none, live updates (WebSockets), notifications, full real-time
   - Default: none
   - Why: "Real-time adds infrastructure complexity (WebSockets, Redis)"

5. **target_scale** - How many users do you expect?
   - Options: personal (<100), small (100-1000), medium (1000-10000), large (10000+)
   - Default: small
   - Why: "Scale affects caching, database, and hosting choices"

6. **admin_panel** - Do you need an admin dashboard?
   - Options: no, yes (basic analytics), yes (full management)
   - Default: yes (basic analytics)
   - Why: "Admin panels add CRUD screens and role-based access"

7. **api_exposure** - Will third-party developers use your API?
   - Options: no, yes (API keys), yes (OAuth apps)
   - Default: no
   - Why: "Public APIs need rate limiting, docs, and versioning"

8. **file_uploads** - Will users upload files?
   - Options: no, images only, any file type
   - Default: no
   - Why: "File uploads need storage (S3) and processing infrastructure"

9. **search** - How will users find content?
   - Options: none, basic (SQL LIKE), full-text (Postgres), external (Algolia/Meilisearch)
   - Default: basic
   - Why: "Search complexity ranges from simple queries to dedicated search engines"

10. **deployment** - Where will you host?
    - Options: Vercel, AWS, self-hosted, not sure yet
    - Default: Vercel
    - Why: "Hosting affects CI/CD, environment variables, and scaling options"

### Mobile Questions (8 questions)
1. **platforms** - Which platforms?
   - Options: iOS, Android, both
   - Default: both
   - Why: "Cross-platform vs native affects your framework choice"

2. **framework** - Which framework?
   - Options: React Native, Flutter, native (Swift/Kotlin)
   - Default: React Native
   - Why: "Framework determines language, ecosystem, and performance"

3. **offline** - Does it work offline?
   - Options: no, partial (cached data), yes (full offline)
   - Default: partial
   - Why: "Offline requires local database and sync logic"

4. **push_notifications** - Do you need push notifications?
   - Options: no, yes (basic), yes (rich with actions)
   - Default: no
   - Why: "Push requires Firebase/APNs setup and token management"

5. **camera_media** - Will you use camera or media?
   - Options: no, camera, photo library, both
   - Default: no
   - Why: "Camera/media requires permissions and native modules"

6. **authentication** - How do users sign in?
   - Options: email/password, social login, phone OTP, biometrics
   - Default: email/password
   - Why: "Auth affects onboarding flow and data security"

7. **state_management** - How will you manage app state?
   - Options: Context/Redux, Zustand, MobX, Riverpod
   - Default: Context
   - Why: "State management affects app architecture and testability"

8. **monetization** - How will you make money?
   - Options: free, paid app, in-app purchases, subscriptions, ads
   - Default: free
   - Why: "Monetization affects store integration and receipt validation"

### CLI Tool Questions (8 questions)
1. **distribution** - How will users install it?
   - Options: npm, Homebrew, standalone binary, cargo
   - Default: npm
   - Why: "Distribution affects versioning and update mechanisms"

2. **interactive_vs_flags** - How do users interact?
   - Options: flags only, interactive prompts, both
   - Default: both
   - Why: "Interactive prompts need TUI libraries (inquirer, prompts)"

3. **config_format** - How is it configured?
   - Options: CLI flags only, config file (JSON/YAML/TOML), both
   - Default: both (JSON config file)
   - Why: "Config files need parsing, validation, and schema"

4. **output_format** - What does it output?
   - Options: plain text, JSON, colored/formatted, silent (exit codes)
   - Default: colored/formatted
   - Why: "Output format affects parsing for scripting vs human reading"

5. **plugin_system** - Will it support plugins/extensions?
   - Options: no, yes (built-in), yes (community)
   - Default: no
   - Why: "Plugins need an API, loading system, and versioning"

6. **network_does_it_need_network** - Does it make network requests?
   - Options: no, yes (API calls), yes (heavy data transfer)
   - Default: no
   - Why: "Network needs error handling, retries, and auth"

7. **filesystem** - Does it read/write files?
   - Options: no, read only, read+write, complex operations
   - Default: read+write
   - Why: "File operations need path handling, permissions, error handling"

8. **logging** - How verbose should output be?
   - Options: silent, errors only, normal, verbose/debug
   - Default: normal
   - Why: "Logging level affects debugging experience"

## Implementation Steps

### Step 3.1: Define Question Types

**File:** src/types/pim.ts (add to existing)

**New types:**
- Question: {id, type, text, options[], default, tooltip, required}
- QuestionType: 'select' | 'multi_select' | 'text' | 'boolean'
- Answer: {questionId, value, skipped}

### Step 3.2: Create Question Bank

**File:** src/types/constants.ts (add to existing)

**Add:**
- QUESTION_BANKS: Record<ProjectCategory, Question[]>
- Each category has its full question array

### Step 3.3: Create Questionnaire Engine

**File:** src/core/questionnaire.ts

**Functions:**
- getQuestionsForCategory(category): Question[]
- getCurrentQuestion(answers): Question | null
- processAnswer(answers, questionId, value): Answers
- getProgress(answers): {answered, total, percentage}
- shouldSkipQuestion(question, answers): boolean

### Step 3.4: Create QuestionPanel Component

**File:** webview/components/QuestionPanel.tsx

**Renders:**
- Question text
- Tooltip icon (shows explanation on hover)
- Appropriate input based on question type:
  - select: dropdown or radio buttons
  - multi_select: checkboxes
  - text: text input
  - boolean: toggle switch
- "Skip" button (uses default)
- "Next" button (enabled when answered or skipped)

### Step 3.5: Create ProgressBar Component

**File:** webview/components/ProgressBar.tsx

**Renders:**
- Progress bar (answered / total)
- Question counter ("Question 3 of 10")

### Step 3.6: Wire to Planning Flow

**File:** Update webview/App.tsx

**Changes:**
- After classification, show questionnaire view
- Render QuestionPanel for current question
- On answer, send ANSWER_QUESTION to host
- On last question, trigger blueprint generation

### Step 3.7: Handle Skip Logic

**File:** src/core/questionnaire.ts

**Logic:**
- If user clicks Skip, store the default value
- Some questions may be conditional (skip if previous answer was X)
- Track which questions were skipped vs answered

## Testing the Questionnaire

### Test Flow
1. Classify idea as SaaS
2. Verify SaaS questions appear
3. Answer all questions
4. Verify progress updates
5. Skip some questions
6. Verify defaults are stored
7. Verify questionnaire completion triggers blueprint generation

### Category Differentiation Test
1. Run same idea through all 3 categories
2. Verify questions are noticeably different
3. Verify options and defaults make sense for each category

## Phase 3 Deliverables

1. src/types/pim.ts - Updated with Question, Answer types
2. src/types/constants.ts - Question banks for 3 categories
3. src/core/questionnaire.ts - Questionnaire engine
4. webview/components/QuestionPanel.tsx - Question UI
5. webview/components/ProgressBar.tsx - Progress indicator
6. Updated webview/App.tsx - Questionnaire flow integration

## What Comes Next
Phase 4: Blueprint Generator - We will build the PRD, architecture, and schema generator using Claude API.
