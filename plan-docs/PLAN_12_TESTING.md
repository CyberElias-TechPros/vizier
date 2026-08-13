# PLAN 12: Testing Strategy

## Goal of This Document
Define how to test every part of the extension, from unit tests to end-to-end manual tests. Testing ensures the extension actually works before we ship it to users.

## Testing Philosophy

### Test Pyramid
```
        /  E2E Manual  \          <- Few (3-5 scenarios)
       /----------------\
      / Integration Tests \        <- Some (10-15 tests)
     /--------------------\
    /    Unit Tests         \      <- Many (50+ tests)
   /------------------------\
```

### What to Unit Test
- Pure functions (no side effects)
- PIM operations (create, update, serialize)
- Validation functions
- ID generation
- DAG algorithms (cycle detection, topological sort)
- Markdown rendering
- Prompt construction

### What to Integration Test
- Extension activation
- Command registration
- Webview message passing
- File I/O operations
- LLM client (mocked API)

### What to Manually Test
- Complete user flows
- Cross-platform compatibility
- UI responsiveness
- Real LLM output quality
- Marketplace installation

## Unit Tests

### File: test/unit/pim.test.ts

**Tests:**
- createProject() returns valid Project with UUID
- updateProject() merges updates without mutating original
- addRequirement() appends with correct ID (REQ-001, REQ-002)
- serialize() produces valid JSON
- deserialize() restores identical object
- addTask() links dependencies correctly
- addDecision() adds with DEC-001 format

### File: test/unit/classifier.test.ts

**Tests:**
- classifyIdea() returns valid category
- classifyIdea() returns confidence between 0 and 1
- classifyIdea() with empty string throws error
- classifyIdea() with very long string truncates
- getClassificationPrompt() includes idea text

### File: test/unit/questionnaire.test.ts

**Tests:**
- getQuestionsForCategory(saas) returns 10 questions
- getQuestionsForCategory(mobile) returns 8 questions
- getQuestionsForCategory(cli_tool) returns 8 questions
- All questions have id, text, type, default
- getCurrentQuestion() returns null when all answered
- getProgress() calculates correct percentage
- processAnswer() stores value correctly

### File: test/unit/taskDag.test.ts

**Tests:**
- validateDag() passes for valid DAG
- validateDag() detects cycle (A->B->C->A)
- topologicalSort() returns correct order
- getBlockedTasks() identifies blocked tasks
- getNextTasks() returns available tasks
- markTaskDone() updates status
- markTaskDone() unblocks dependent tasks

### File: test/unit/export.test.ts

**Tests:**
- renderOverview() includes vision, audience, scope
- renderArchitecture() includes all sections with rationale
- renderSchema() includes entity tables
- renderTasks() includes dependency info
- renderDecisions() includes options and rationale
- generateCursorRules() includes architecture rules
- generateClaudeMd() includes tool-use hints

### File: test/unit/validation.test.ts

**Tests:**
- validateIdea() rejects empty string
- validateIdea() rejects >500 chars
- validateIdea() accepts valid idea
- validateAnswer() rejects invalid option
- validateProject() detects missing fields

### File: test/unit/idGenerator.test.ts

**Tests:**
- nextRequirementId() returns REQ-001 for empty project
- nextRequirementId() increments correctly (REQ-001 -> REQ-002)
- nextTaskId() returns TASK-001 for empty project
- All ID formats are correct (3-digit zero-padded)

## Integration Tests

### File: test/integration/extension.test.ts

**Setup:** VS Code test harness (vscode-test)

**Tests:**
- Extension activates successfully
- Commands are registered in VS Code
- Command execution shows expected messages
- Webview panel can be created
- Secrets API stores and retrieves API key

### File: test/integration/webview.test.ts

**Setup:** Mock webview, test message passing

**Tests:**
- sendMessageToWebview() delivers message
- handleWebviewMessage() processes START_PLANNING
- handleWebviewMessage() processes ANSWER_QUESTION
- STATE_UPDATE sends full project state
- Error messages are handled gracefully

### File: test/integration/fileIO.test.ts

**Setup:** Temporary workspace folder

**Tests:**
- writeFile() creates file with content
- readFile() reads file content
- ensureDir() creates nested directories
- fileExists() returns true for existing file
- detectAITools() finds .cursorrules
- detectAITools() finds .claude/ directory

## End-to-End Manual Tests

### Test Scenario 1: SaaS App

**Idea:** "A project management tool for remote teams with kanban boards and time tracking"

**Expected:**
- Category: saas (confidence > 0.8)
- Questions: 10 SaaS-specific questions
- Blueprint: Next.js + PostgreSQL + Prisma recommended
- Tasks: 12-16 tasks, auth before features
- Export: All files created, .cursorrules has auth rules

### Test Scenario 2: Mobile App

**Idea:** "A workout tracking app that lets users log exercises and track progress with charts"

**Expected:**
- Category: mobile (confidence > 0.8)
- Questions: 8 mobile-specific questions
- Blueprint: React Native + Expo + Firebase recommended
- Tasks: 10-14 tasks, navigation before screens
- Export: All files created, .cursorrules has RN rules

### Test Scenario 3: CLI Tool

**Idea:** "A command-line tool that converts markdown files to beautifully formatted PDFs"

**Expected:**
- Category: cli_tool (confidence > 0.8)
- Questions: 8 CLI-specific questions
- Blueprint: Node.js + Commander + pdfkit recommended
- Tasks: 8-12 tasks, core lib before CLI wrapper
- Export: All files created, .cursorrules has CLI rules

### Test Scenario 4: Ambiguous Idea

**Idea:** "an app"

**Expected:**
- Category: low confidence (< 0.7)
- Prompt: "Is this closer to a SaaS app or an internal tool?"
- User picks category, continues normally

### Test Scenario 5: API Error

**Setup:** Invalid API key

**Expected:**
- Error message: "API key invalid. Please check your key."
- Option to re-enter key
- No crash, graceful degradation

## Performance Tests

### Extension Load Time
- Measure: Time from command execution to sidebar visible
- Target: <500ms
- Tool: console.time() around activation

### Blueprint Generation Time
- Measure: Time from GENERATE_BLUEPRINT to BLUEPRINT_READY
- Target: <20 seconds
- Tool: console.time() around LLM call

### Task Generation Time
- Measure: Time from GENERATE_TASKS to TASK_DAG_READY
- Target: <15 seconds
- Tool: console.time() around LLM call

### Webview Bundle Size
- Measure: dist/webview.js file size
- Target: <500KB gzipped
- Tool: esbuild metafile analysis

## Regression Tests

After fixing a bug, write a test that would have caught it. Add to appropriate test file.

## Test Automation

### npm test script
Runs all unit tests using Node.js built-in test runner (node --test).

### Continuous Integration
(GitHub Actions - optional for V1)
- Run on every push
- Run npm run typecheck
- Run npm test
- Verify build succeeds
