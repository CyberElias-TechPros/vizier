# UPGRADE: Existing Repo Analysis + Model-Agnostic Planning

## Two New Capabilities

This document defines two major upgrades to the V1 plan:
1. **Repo Analysis Mode** — Study an existing codebase and plan next steps
2. **Model-Agnostic Planning** — Works with any model, degrades gracefully

Both are designed to fit into the existing V1 architecture without requiring a rewrite.

---

## UPGRADE 1: Existing Repo Analysis Mode

### The Concept
User opens a project in VS Code, runs "Understand This Project," and the extension:
1. Scans the file tree
2. Detects technologies, frameworks, patterns
3. Maps the architecture (frontend -> backend -> database)
4. Generates a project map
5. User can then say "plan adding subscriptions" and it generates a plan that fits existing architecture

### Why This Matters
- Doubles your market: not just new ideas, but existing codebases
- Users with 80,000-line messy projects are desperate for this
- It is what turns the extension from a "planning tool" into "project intelligence"

### Technical Architecture

```
[User clicks "Understand This Project"]
              |
              v
[Workspace Scanner] - walks file tree, classifies files
              |
              v
[Technology Detector] - reads package.json, imports, configs
              |
              v
[Architecture Mapper] - constructs layer diagram
              |
              v
[Symbol Analyzer] - extracts exports, functions, classes
              |
              v
[LLM Interpreter] - converts scan results into PIM
              |
              v
[Project Map UI] - visual representation of codebase
```

### New Entry Point

**Command:** `vibePlanner.understandProject`

**Two modes now exist:**
1. `Plan New App` — idea -> questionnaire -> blueprint
2. `Understand This Project` — repo scan -> project map -> feature planning

### New Files Needed

```
src/
  core/
    scanner.ts          # File tree walker and classifier
    techDetector.ts     # Technology/framework detection
    architectureMapper.ts # Construct architecture from scan
    symbolAnalyzer.ts   # Extract symbols from source files
  commands/
    understandProject.ts # New command entry point

webview/
  components/
    ProjectMap.tsx      # Visual codebase map
    TechBadge.tsx       # Technology indicator
    ModuleCard.tsx      # Module/component display
```

### Scanner Design (Local, No LLM)

**File classification rules:**
- `package.json` → dependencies, scripts, metadata
- `*.tsx`, `*.jsx` → frontend components
- `*.ts`, `*.js` (in src/) → business logic
- `*.prisma`, `*.sql` → database schemas
- `*.test.ts`, `*.spec.ts` → test files
- `*.config.*` → configuration
- `*.md` → documentation

**Technology detection:**
- React: find `react` in package.json + `*.tsx` files
- Next.js: find `next` in package.json + `pages/` or `app/` directory
- Express: find `express` in + `app.get/post/put/delete` patterns
- Prisma: find `prisma` in + `*.prisma` files
- Tailwind: find `tailwindcss` in + `tailwind.config.*`
- PostgreSQL: find `pg` or `@prisma/client` with postgres provider
- MongoDB: find `mongoose` or `mongodb` package
- JWT: find `jsonwebtoken` or `jose` package
- Stripe: find `stripe` or `@stripe/stripe-js`

**Architecture mapping:**
- Group files by directory structure
- Detect layers: routes -> controllers -> services -> models
- Find entry points: `index.ts`, `app.ts`, `server.ts`
- Map API endpoints from route files
- Identify shared modules vs feature modules

### Feature Planning on Existing Codebase

After scanning, user says: "I want to add subscription billing."

The system:
1. Reads existing architecture (e.g., Next.js + PostgreSQL + NextAuth)
2. Knows existing entities (e.g., User, Team)
3. Generates plan that FITS existing patterns:
   - Uses existing auth (NextAuth), not introducing new auth
   - Uses existing DB (PostgreSQL), not introducing MongoDB
   - Follows existing file structure
   - References existing entities

This is dramatically more powerful than planning from scratch.

### PIM Extensions for Repo Analysis

```typescript
interface Project {
  // ... existing V1 fields ...
  
  // Repo analysis additions
  codebase?: {
    root_path: string;
    scanned_at: string;
    files: FileEntry[];
    modules: Module[];
    technologies: Technology[];
    entry_points: string[];
    api_endpoints: ApiEndpoint[];
    dependencies: Dependency[];
  };
}

interface FileEntry {
  path: string;
  type: 'component' | 'service' | 'model' | 'route' | 'config' | 'test' | 'util';
  framework?: string;
  imports: string[];
  exports: string[];
  lines: number;
}

interface Module {
  name: string;
  path: string;
  type: 'feature' | 'shared' | 'core' | 'config';
  files: string[];
  dependencies: string[];  // other modules this imports
}

interface Technology {
  name: string;
  version: string;
  category: 'frontend' | 'backend' | 'database' | 'auth' | 'testing' | 'deployment';
  confidence: number;  // 0-1, how sure we are
}
```

### When to Build This

**Option A: Include in V1** — Adds 1-2 weeks, but makes V1 dramatically more compelling
**Option B: Ship as V1.5** — After V1 is stable, add this as first update
**Option C: Full V2** — Original roadmap placement

**Recommendation: Option B (V1.5)** — Ship core planning first, get users, then add repo analysis as the first major update. The PIM schema already accommodates it.

---

## UPGRADE 2: Model-Agnostic Planning with Graceful Degradation

### The Concept
The extension works with ANY LLM — Claude, GPT-4, Gemini, local models, older models — and adapts its prompting strategy to get the best possible output from each.

### Why This Matters
- Users are not locked into one provider
- If Anthropic changes pricing or availability, you are not dead
- Some users prefer local models for privacy
- Future-proof: when new models come out, you just add a profile

### The Architecture: Prompt Complexity Tiers

```
Model Capability Assessment
              |
    +---------+---------+
    |         |         |
  Tier 1    Tier 2    Tier 3
  (Strong)  (Medium)  (Basic)
    |         |         |
  Single    Multi-    Template-
  prompt    stage     fill
```

### Tier 1: Strong Models (Claude Sonnet 4, GPT-4o, Gemini Pro)

**Strategy:** Single comprehensive prompt, expect structured JSON output.

```
System: "You are a senior software architect. Generate a blueprint."
User: [full idea + answers]
Output: Complete JSON with product, requirements, architecture, entities
```

**Characteristics:**
- One LLM call for full blueprint
- Expects complex nested JSON
- Can handle ambiguity and make good defaults
- Output is reliable with minimal retries

### Tier 2: Medium Models (Claude Haiku, GPT-3.5, Gemini Flash)

**Strategy:** Multi-stage generation, each stage produces one section.

```
Stage 1: Extract requirements only (smaller output, focused)
Stage 2: Generate architecture based on requirements
Stage 3: Generate entities based on architecture
Stage 4: Generate tasks based on all previous
```

**Characteristics:**
- Multiple LLM calls, each with smaller output
- Each stage has more explicit instructions
- Less ambiguity per prompt
- Higher reliability per stage
- Total latency: similar (calls can be parallel where possible)

### Tier 3: Basic/Older Models (Small local models, very old APIs)

**Strategy:** Template-filling with constrained choices.

```
Step 1: System detects category (SaaS)
Step 2: System presents tech stack options:
        "Frontend framework: [Next.js / Remix / Astro]"
        User picks: Next.js
Step 3: System presents database options:
        "Database: [PostgreSQL / MySQL / MongoDB]"
        User picks: PostgreSQL
Step 4: System assembles blueprint from templates
Step 5: LLM only generates task descriptions (text, not structure)
```

**Characteristics:**
- Minimal LLM usage (mostly templating)
- User makes explicit choices at each step
- Output quality is "good enough" not "excellent"
- Still better than no tool at all
- Can use very cheap/local models

### Model Capability Detection

**Approach 1: User-selected tier**
User picks their model, system knows the tier from a lookup table.

**Approach 2: Auto-detection**
After first LLM call, assess output quality:
- Valid JSON? → Tier 1
- Partial JSON, needs retry? → Tier 2
- Failed JSON, needs fallback? → Tier 3

**Approach 3: Adaptive (best)**
Start with Tier 1 prompt. If it fails, retry with Tier 2. If that fails, fall back to Tier 3. The user never needs to know about tiers.

### Implementation: Model Adapter Layer

```typescript
// src/llm/modelAdapter.ts

interface ModelProfile {
  id: string;                    // "claude-sonnet-4-20250514"
  name: string;                  // "Claude Sonnet 4"
  tier: 1 | 2 | 3;              // Capability tier
  maxTokens: number;             // Max output tokens
  supportsJSON: boolean;         // Native JSON mode
  supportsStreaming: boolean;    // Streaming responses
  maxContextWindow: number;      // Input context limit
  preferredPromptStyle: 'compact' | 'verbose' | 'template';
}

interface PromptStrategy {
  type: 'single' | 'multi_stage' | 'template_fill';
  stages?: PromptStage[];
  fallback?: PromptStrategy;
}

interface PromptStage {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  maxTokens: number;
  required: boolean;  // Can this stage be skipped?
}

// Model registry
const MODEL_PROFILES: Record<string, ModelProfile> = {
  'claude-sonnet-4-20250514': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    tier: 1,
    maxTokens: 8192,
    supportsJSON: true,
    supportsStreaming: true,
    maxContextWindow: 200000,
    preferredPromptStyle: 'compact',
  },
  'claude-3-5-sonnet-20241022': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    tier: 1,
    maxTokens: 8192,
    supportsJSON: true,
    supportsStreaming: true,
    maxContextWindow: 200000,
    preferredPromptStyle: 'compact',
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    tier: 1,
    maxTokens: 4096,
    supportsJSON: true,
    supportsStreaming: true,
    maxContextWindow: 128000,
    preferredPromptStyle: 'verbose',
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    tier: 2,
    maxTokens: 4096,
    supportsJSON: false,
    supportsStreaming: true,
    maxContextWindow: 16000,
    preferredPromptStyle: 'verbose',
  },
  'claude-3-haiku-20240307': {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    tier: 2,
    maxTokens: 4096,
    supportsJSON: true,
    supportsStreaming: true,
    maxContextWindow: 200000,
    preferredPromptStyle: 'verbose',
  },
};
```

### Prompt Strategy Implementation

```typescript
function getPromptStrategy(modelProfile: ModelProfile): PromptStrategy {
  switch (modelProfile.tier) {
    case 1:
      return { type: 'single' };
    case 2:
      return {
        type: 'multi_stage',
        stages: [
          { name: 'requirements', ... },
          { name: 'architecture', ... },
          { name: 'entities', ... },
          { name: 'tasks', ... },
        ],
      };
    case 3:
      return { type: 'template_fill' };
  }
}

async function generateBlueprintWithFallback(
  project: Project,
  modelProfile: ModelProfile
): Promise<BlueprintResult> {
  const strategy = getPromptStrategy(modelProfile);
  
  try {
    switch (strategy.type) {
      case 'single':
        return await generateSinglePrompt(project, modelProfile);
      case 'multi_stage':
        return await generateMultiStage(project, modelProfile);
      case 'template_fill':
        return await generateTemplateFill(project, modelProfile);
    }
  } catch (error) {
    // Adaptive fallback: try next tier down
    if (modelProfile.tier > 1) {
      const fallbackProfile = { ...modelProfile, tier: (modelProfile.tier - 1) as 1|2|3 };
      return await generateBlueprintWithFallback(project, fallbackProfile);
    }
    throw error;
  }
}
```

### User Experience

**Settings:**
```
vibePlanner.aiProvider: "anthropic" | "openai" | "google" | "custom"
vibePlanner.modelId: "claude-sonnet-4-20250514" (dropdown of known models)
vibePlanner.fallbackEnabled: true (auto-degrade if model fails)
```

**UI indicator:**
- Green dot: "Using Claude Sonnet 4 (Tier 1 — Full capability)"
- Yellow dot: "Using GPT-3.5 (Tier 2 — Multi-stage generation)"
- Orange dot: "Using local model (Tier 3 — Template-assisted)"

### Supported Providers for V1

| Provider | Models | API | Notes |
|----------|--------|-----|-------|
| Anthropic | Sonnet 4, 3.5 Sonnet, Haiku 3 | @anthropic-ai/sdk | Best quality, default |
| OpenAI | GPT-4o, GPT-3.5 | openai | Popular alternative |
| Google | Gemini Pro, Flash | @google/generative-ai | Cost-effective |
| Custom | Any OpenAI-compatible API | Generic | For local models, OpenRouter |

### LLM Client Refactor

```typescript
// src/llm/client.ts becomes provider-agnostic

interface LLMProvider {
  id: string;
  name: string;
  createMessage(params: LLMRequest): Promise<LLMResponse>;
  streamMessage(params: LLMRequest): AsyncGenerator<string>;
  supportsJSONMode(): boolean;
  getMaxTokens(): number;
}

class AnthropicProvider implements LLMProvider { ... }
class OpenAIProvider implements LLMProvider { ... }
class GoogleProvider implements LLMProvider { ... }
class CustomProvider implements LLMProvider { ... }  // OpenAI-compatible

class LLMClient {
  private provider: LLMProvider;
  
  constructor(providerId: string, apiKey: string) { }
  
  async createMessage(params: LLMRequest): Promise<LLMResponse> {
    return this.provider.createMessage(params);
  }
}
```

### Output Quality Assurance

Regardless of model, validate output:
- Requirements must have valid IDs (REQ-001 format)
- Architecture must have all sections
- Entities must have at least one field
- Tasks must have valid dependencies (no cycles, all references valid)

If validation fails, retry with more explicit instructions. If still failing, fall back to template mode.

---

## Combined Impact on V1 Scope

### What Changes
1. **New command:** "Understand This Project"
2. **New files:** Scanner, tech detector, architecture mapper (~8 new files)
3. **LLM refactor:** Provider-agnostic client (~3 files changed)
4. **New UI:** Project map, tech badges, model selector (~5 new files)
5. **PIM extensions:** codebase field, technology field

### What Does NOT Change
- Core planning flow (idea -> questionnaire -> blueprint) stays the same
- PIM core structure stays the same (just extended)
- Export system stays the same (just more data to export)

### Recommended Build Order (Updated)

```
Phase 1: Foundation (unchanged)
Phase 2: Category Classifier (unchanged)
Phase 3: Questionnaire (unchanged)
Phase 4: Blueprint Generator (add model-agnostic prompting)
Phase 5: Task DAG (unchanged)
Phase 6: Context Packs + Export (add provider support)
Phase 7: UI Polish (add model selector)
Phase 8: Repo Scanner (NEW - understand existing projects)
Phase 9: Testing + Deployment
```

### Effort Estimate

| Component | Additional Effort |
|-----------|-------------------|
| Model-agnostic LLM client | +2 days |
| Multi-stage prompting | +1 day |
| Template-fill fallback | +1 day |
| Model selector UI | +0.5 days |
| Workspace scanner | +2 days |
| Technology detector | +1 day |
| Architecture mapper | +2 days |
| Project map UI | +1.5 days |
| Existing-project planning flow | +1 day |
| Testing | +2 days |
| **Total additional effort** | **~14 days** |

### Why This Is Worth It

1. **Existing repo mode** = 2x market (greenfield + brownfield)
2. **Model-agnostic** = not locked into one provider
3. **Graceful degradation** = works on cheap hardware, future-proofs the product
4. **Combined** = "Understand any codebase, plan next steps, with any AI" is a dramatically stronger pitch

---

## Decision Time

**Option A: Add both to V1**
- V1 becomes ~6 weeks instead of ~4 weeks
- Much more compelling product at launch
- Risk: delays shipping

**Option B: Model-agnostic in V1, Repo scan in V1.5**
- V1 ships in ~5 weeks (model-agnostic is +3 days)
- Repo scan ships 2-3 weeks after V1
- Risk: less compelling initial launch

**Option C: Repo scan in V1, model-agnostic in V1.5**
- V1 ships in ~6 weeks (repo scan is bigger)
- Model-agnostic added shortly after
- Risk: still locked to Claude at launch

**Recommendation: Option B** — Get model-agnostic in V1 (its only +3 days because the architecture already supports it), ship V1, then immediately build repo scan as the headline V1.5 feature.
