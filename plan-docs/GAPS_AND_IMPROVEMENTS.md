# GAPS AND IMPROVEMENTS — Industry Standard Additions

## Purpose
This document captures angles we are currently lacking compared to industry standards for production-grade VS Code extensions. Prioritized by impact-to-effort ratio.

---

## TIER 1: Add Before V1 Launch (High Impact, Low Effort)

These should be included in V1. They are low effort but significantly improve product quality, marketplace compliance, and user retention.

### 1. First-Time User Onboarding (FTUE)

**Current gap:** User opens extension to empty sidebar with no guidance. First impression is weak.

**What to add:**
- Welcome screen on first activation
- Example ideas they can click (not just empty textarea)
- Guided first run explaining each step
- Celebration/confirmation when first plan is generated
- "What's next?" guidance after export

**Implementation:**
```
First activation:
  Show welcome screen
    -> "Let's plan your first app!"
    -> 3 clickable example ideas:
       [SaaS] "A project management tool for remote teams"
       [Mobile] "A habit tracker with streaks and reminders"
       [CLI] "A markdown-to-PDF converter with syntax highlighting"
    -> "Or type your own idea below"
  On first idea submit:
    Show tooltip: "Great! I'll ask you a few questions to understand your app better."
  On questionnaire complete:
    Show tooltip: "Now I'll generate your blueprint. This takes about 15 seconds."
  On first plan generated:
    Celebration: "Your plan is ready! Open the /plan/ folder to start building."
    Button: [Open /plan/ folder] [Start building with AI]
```

**Effort:** +0.5 days
**Impact:** Determines whether users stick or uninstall after first try.

### 2. PIM Schema Versioning

**Current gap:** When PIM schema changes in V1.5, existing plans break.

**What to add:**
```typescript
interface Project {
  schemaVersion: "1.0.0";  // Add this field
  // ... rest of fields ...
}
```

**Migration strategy:**
```typescript
function migrateProject(project: any): Project {
  const version = project.schemaVersion || "0.0.0";
  
  // Migrate from 0.x to 1.0.0
  if (version < "1.0.0") {
    project = migrate_v0_to_v1(project);
  }
  
  // Future: migrate from 1.x to 2.0.0
  if (version < "2.0.0") {
    project = migrate_v1_to_v2(project);
  }
  
  return project as Project;
}
```

**Effort:** +0.5 days (just add the field now, migration logic later)
**Impact:** Prevents data loss when schema evolves.

### 3. Anonymous Opt-In Telemetry

**Current gap:** "No telemetry" is too restrictive. We need anonymous metrics to improve the product.

**What to add:**
- Anonymous usage events (no PII, no code, no plans)
- Opt-in only (ask user on first activation)
- Track only: activation, generation success/failure, feature usage, errors

**Implementation:**
```typescript
// src/telemetry.ts

interface TelemetryEvent {
  type: string;           // "activation", "generation_complete", "generation_error"
  timestamp: string;      // ISO 8601
  sessionId: string;      // Anonymous random ID (not user ID)
  properties?: Record<string, any>;  // No PII
}

const TELEMETRY_EVENTS = {
  ACTIVATION: 'activation',
  GENERATION_START: 'generation_start',
  GENERATION_COMPLETE: 'generation_complete',
  GENERATION_ERROR: 'generation_error',
  EXPORT_PLAN: 'export_plan',
  QUESTION_ANSWERED: 'question_answered',
  TASK_MARKED_DONE: 'task_marked_done',
} as const;

// User must opt-in
async function initTelemetry(context: vscode.ExtensionContext) {
  const consented = context.globalState.get<boolean>('telemetryConsent');
  
  if (consented === undefined) {
    // First run: ask for consent
    const choice = await vscode.window.showInformationMessage(
      'Help improve Vizier by sending anonymous usage data? No code or plans are ever sent.',
      'Yes, send anonymous data',
      'No, keep it private'
    );
    const allowed = choice === 'Yes, send anonymous data';
    await context.globalState.update('telemetryConsent', allowed);
  }
}
```

**What we track:**
| Event | Properties | Why |
|-------|-----------|-----|
| activation | platform, extension_version | Know active user count |
| generation_complete | category, duration_seconds, stages_completed | Measure quality/speed |
| generation_error | error_code, stage | Find failure patterns |
| export_plan | num_files, agent_format | Know which exports are used |
| task_marked_done | task_category | Know which tasks users complete |

**What we NEVER track:**
- User code
- User plans
- User ideas
- API keys
- Workspace paths
- Any PII

**Effort:** +0.5 days
**Impact:** Required to make data-driven product decisions.

### 4. Privacy Policy

**Current gap:** Required for VS Code Marketplace. We have not written one.

**What to write:**

```
# Vizier — Privacy Policy

Last updated: [Date]

## What We Collect
Vizier collects ONLY anonymous usage statistics (if you opt in):
- Feature usage (which commands you run)
- Generation success/failure rates
- Error rates (no error content, just error type)

## What We NEVER Collect
- Your code
- Your app ideas
- Your generated plans or blueprints
- Your API keys
- Your workspace paths or file names
- Any personally identifiable information

## How We Store Data
- Your plans are stored as files in YOUR repository.
- Your API key is stored in YOUR VS Code secrets (encrypted locally).
- Anonymous analytics (if enabled) are sent to [provider, e.g., PostHog].

## Third-Party Services
- Anthropic Claude API: We send your idea + questionnaire answers to generate
  plans. This data is subject to Anthropic's privacy policy.
- [If applicable] PostHog: Anonymous usage analytics.

## Contact
For privacy questions: [your email]
```

**Effort:** +0.5 days (write + review)
**Impact:** Required for marketplace publishing.

### 5. Offline/Cost Indicators

**Current gap:** No internet = broken experience with confusing error. No idea how much API calls cost.

**What to add:**

```typescript
// Check connectivity before generation
async function checkConnectivity(): Promise<boolean> {
  try {
    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'HEAD',
      // Just checking reachability, not making a real call
    });
    return true;
  } catch {
    return false;
  }
}

// Show estimated cost before generation
function estimateGenerationCost(): string {
  // Approximate: 5 stages, ~2000 tokens each, input + output
  // Claude Sonnet 4: $3/MTok input, $15/MTok output
  const estimatedTokens = 10000; // rough estimate
  const estimatedCost = (estimatedTokens / 1000000) * 15;
  return `~$${estimatedCost.toFixed(3)} per generation`;
}
```

**UI implementation:**
- If offline: show banner "No internet connection. Vizier requires internet to generate plans."
- Before generation: show "Estimated cost: ~$0.01 - $0.05" (based on model pricing)
- After generation: show actual token usage if available

**Effort:** +0.25 days
**Impact:** Prevents surprise bills, improves error messages.

---

## TIER 2: Add Before V1.5 (Medium Impact, Medium Effort)

### 6. User-Facing Documentation

**What:** Getting started guide, FAQ, examples.
**Format:** GitHub Pages / simple markdown site.
**Effort:** +2 days.

### 7. Crash Reporting (Sentry)

**What:** Automatic error reporting when extension crashes.
**Implementation:** Sentry SDK with opt-in consent.
**Effort:** +0.5 days.

### 8. "What's New" Update Popup

**What:** Show changelog after extension updates.
**Implementation:** Compare current version vs last shown version.
**Effort:** +0.25 days.

### 9. Settings Import/Export

**What:** Share extension settings across machines.
**Implementation:** JSON export/import of settings.
**Effort:** +0.5 days.

### 10. i18n Infrastructure

**What:** Externalize all user-facing strings.
**Implementation:** `src/locales/en.json`, `getLocale()` function.
**Effort:** +1 day.

### 11. Uninstall Feedback

**What:** Optional survey when user uninstalls.
**Implementation:** Link to form in the "why uninstall?" prompt.
**Effort:** +0.5 days.

---

## TIER 3: Add When Scaling (Lower Priority)

### 12. Public Roadmap
GitHub Projects board, "coming soon" section in extension.
**Effort:** +0.25 days.

### 13. Contribution Guidelines
CONTRIBUTING.md, issue templates, PR template.
**Effort:** +0.5 days.

### 14. Multi-Root Workspace Support
Handle multiple folders in VS Code workspace.
**Effort:** +1 day.

### 15. Rate Limiting
Max N generations per hour to prevent API abuse.
**Effort:** +1 day.

### 16. Remote Development Support
Test and support Remote SSH, Containers, WSL, Codespaces.
**Effort:** +2 days.

### 17. Settings Sync Integration
Sync API key via VS Code Settings Sync.
**Effort:** +0.5 days.

### 18. Community Space
Discord server or GitHub Discussions for user support.
**Effort:** +0.5 days setup, ongoing maintenance.

---

## Complete File Inventory

All plan documents in `/plan-docs/`:

| # | File | Status | Content |
|---|------|--------|---------|
| 0 | PLAN_README.md | Done | Master index, navigation |
| 1 | PLAN_01_CURRENT_STATE.md | Done | Where we are |
| 2 | PLAN_02_ARCHITECTURE.md | Done | Full architecture |
| 3 | PLAN_03_DATA_MODELS.md | Done | TypeScript interfaces |
| 4 | PLAN_04_FILE_STRUCTURE.md | Done | Directory tree |
| 5 | PLAN_05_BUILD_PHASE_1.md | Done | Foundation |
| 6 | PLAN_06_BUILD_PHASE_2.md | Done | Category classifier |
| 7 | PLAN_07_BUILD_PHASE_3.md | Done | Questionnaire |
| 8 | PLAN_08_BUILD_PHASE_4.md | Done | Blueprint generator |
| 9 | PLAN_09_BUILD_PHASE_5.md | Done | Task DAG |
| 10 | PLAN_10_BUILD_PHASE_6.md | Done | Context packs + export |
| 11 | PLAN_11_BUILD_PHASE_7.md | Done | UI/Webview |
| 12 | PLAN_12_TESTING.md | Done | Testing strategy |
| 13 | PLAN_13_DEPLOYMENT.md | Done | Publishing |
| 14 | PLAN_14_V2_V5_ROADMAP.md | Done | Future versions |
| 15 | UPGRADE_REPO_AND_MODEL.md | Done | Repo scan + model-agnostic |
| 16 | VIBEPLAN_V1_SCOPE.md | Done | Final unified scope |
| 17 | SUPPLEMENT_ERRORS_AND_PIPELINE.md | Done | Errors, retry, pipeline, gates |
| 18 | GAPS_AND_IMPROVEMENTS.md | This file | Industry standard additions |

---

## Updated Effort Estimate

| Component | Effort |
|-----------|--------|
| Original V1 (Phases 1-8) | ~5 weeks |
| Model-agnostic layer (Option B) | +3 days |
| Light workspace scanner stub | +1 day |
| **Tier 1 additions (this doc)** | **+2.25 days** |
| **Total V1 with all additions** | **~6 weeks** |

---

## Updated V1 Feature List (Final)

### Wedge Features (unchanged)
1. Category-Aware Questionnaire (SaaS/Mobile/CLI)
2. Task DAG (dependency-aware build graph)
3. Decision Register + Context Packs

### Supporting Features (updated)
4. Category Classifier
5. Blueprint Generator (5-stage pipeline)
6. Agent-Specific Export
7. Model Router + Prompt Strategy Tiers
8. Lightweight Workspace Scanner
9. **First-Time User Onboarding** (NEW)
10. **Anonymous Opt-In Telemetry** (NEW)
11. **PIM Schema Versioning** (NEW)
12. **Offline/Cost Indicators** (NEW)

### Documentation
13. Privacy Policy
14. All 18 plan-docs files
