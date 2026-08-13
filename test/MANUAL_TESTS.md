# Manual Test Scenarios

## Test Scenario 1: SaaS App (Full Flow)

**Idea:** "A project management tool for remote teams with kanban boards and time tracking"

**Expected Flow:**
1. Enter idea → Click "Plan This App"
2. Category classified as "saas" (confidence > 0.8)
3. Answer 10 SaaS questions (or skip some)
4. Blueprint generated with:
   - Next.js + PostgreSQL + Prisma + NextAuth recommended
   - Entities: User, Project, Task, TimeEntry, Team
   - 12-16 tasks with proper dependencies
   - Decision register with 5-8 decisions
5. View tasks → Mark some as done
6. Export → Files written to /plan/ folder
7. .cursorrules or AGENTS.md created in workspace

**Verification:**
- [ ] All 10 questions shown and different from mobile/CLI
- [ ] Blueprint has all sections populated
- [ ] Tasks have valid dependency chain (no cycles)
- [ ] Export creates files without errors
- [ ] Total time < 5 minutes

---

## Test Scenario 2: Mobile App

**Idea:** "A workout tracking app that lets users log exercises and track progress with charts"

**Expected Flow:**
1. Category classified as "mobile"
2. 8 mobile-specific questions (framework, offline, push, camera, auth, state, monetization)
3. Blueprint: React Native + Expo + Firebase recommended
4. Entities: User, Workout, Exercise, ProgressEntry

**Verification:**
- [ ] Questions differ from SaaS (framework, offline, push notifications)
- [ ] Architecture recommends React Native or Flutter
- [ ] Tasks include mobile-specific setup (Expo, navigation)

---

## Test Scenario 3: CLI Tool

**Idea:** "A command-line tool that converts markdown files to beautifully formatted PDFs"

**Expected Flow:**
1. Category classified as "cli_tool"
2. 8 CLI-specific questions (distribution, interaction, config, output, plugins, network, filesystem, logging)
3. Blueprint: Node.js + Commander + pdfkit recommended
4. Entities: fewer entities (config-focused)

**Verification:**
- [ ] Questions differ from SaaS/Mobile (distribution, config format)
- [ ] Architecture recommends Node.js/Python CLI tools
- [ ] Tasks include CLI-specific setup (Commander, argument parsing)

---

## Test Scenario 4: Ambiguous Idea (Low Confidence)

**Idea:** "an app"

**Expected Flow:**
1. Classification returns low confidence (< 0.7)
2. System asks: "Is this closer to a SaaS app or an internal tool?"
3. User picks category manually
4. Flow continues normally from questionnaire

**Verification:**
- [ ] Low confidence triggers user confirmation
- [ ] User can pick category manually
- [ ] Flow continues without errors

---

## Test Scenario 5: API Error Handling

**Setup:** Invalid API key or no internet

**Expected Flow:**
1. Enter idea → classification fails
2. System shows user-friendly error
3. User can retry or pick category manually
4. No crash, no raw error exposed

**Verification:**
- [ ] Error message is user-friendly
- [ ] "Try Again" button works
- [ ] Manual category selection works as fallback

---

## Test Scenario 6: Export and File Verification

**Prerequisite:** Complete Test Scenario 1

**Steps:**
1. Navigate to Export view
2. Click "Export to Files"
3. Wait for export to complete
4. Open workspace and verify files

**Expected Files:**
```
plan/
  overview.md
  architecture.md
  schema.md
  tasks.md
  decisions.md
  context/
    TASK-001.md
    TASK-002.md
    ...
.cursorrules (or CLAUDE.md or AGENTS.md)
```

**Verification:**
- [ ] All files created
- [ ] Markdown is well-formatted
- [ ] .cursorrules has architecture constraints
- [ ] Context packs have scoped content

---

## Performance Benchmarks

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Extension load | < 500ms | ___ | ☐ |
| Classification | < 3s | ___ | ☐ |
| Full blueprint | < 30s | ___ | ☐ |
| Export to files | < 2s | ___ | ☐ |
| Total flow (idea → export) | < 5 min | ___ | ☐ |
