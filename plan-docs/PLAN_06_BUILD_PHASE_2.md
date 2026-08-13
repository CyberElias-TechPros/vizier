# PLAN 06: Build Phase 2 - Category Classifier

## Goal of This Phase
Build the category classifier: a single LLM call that takes the user's idea text and returns one of six app categories (saas, mobile, cli_tool, browser_ext, game, internal_tool) with a confidence score.

## Why This Phase Second?
The classifier is the first real feature. It is small, self-contained, and unblocks the questionnaire system (Phase 3) which depends on knowing the category. It also validates our LLM pipeline early.

## What We Are Building

### Input
- A string: the user's idea (1-3 sentences, e.g., "I want to build a habit tracker app")

### Output
- A ProjectCategory (one of six values)
- A confidence score (0.0 to 1.0)
- If confidence < 0.7, we ask the user to confirm

### Architecture
```
User Idea Text
      |
      v
[classifier.ts] -- constructs prompt
      |
      v
[client.ts] -- calls Claude API
      |
      v
[parser.ts] -- extracts JSON from response
      |
      v
{category, confidence}
```

## Step-by-Step Instructions

### Step 2.1: Create the LLM Client

**File:** src/llm/client.ts

**Purpose:** Wrap the Anthropic SDK with our configuration (API key, model, retries).

**Functions:**
- getClient(): Returns configured Anthropic client
- createMessage(params): Makes a non-streaming API call
- handleError(error): Consistent error handling

**Key implementation details:**
- API key comes from VS Code secrets API (secure storage)
- Model defaults to claude-sonnet-4-20250514
- Max retries: 3 with exponential backoff
- Timeout: 30 seconds

### Step 2.2: Create Prompt Templates

**File:** src/llm/prompts.ts

**Purpose:** Store all LLM prompt templates in one place.

**Classification prompt structure:**
- System message: Defines the classification task and categories
- User message: Contains the idea text
- Response format: JSON with category and confidence

**Prompt design principles:**
- Be explicit about what each category means
- Provide examples of ideas that map to each category
- Request JSON output for reliable parsing
- Keep system prompt under 1000 tokens

### Step 2.3: Create Response Parser

**File:** src/llm/parser.ts

**Purpose:** Parse Claude API responses into our TypeScript types.

**Functions:**
- parseClassification(response): Extracts {category, confidence} from response
- extractJSON(text): Pulls JSON object from text (handles markdown code blocks)
- validateCategory(value): Ensures value is a valid ProjectCategory

**Error handling:**
- If JSON extraction fails, throw ParseError
- If category is invalid, throw ValidationError
- If confidence is missing, default to 0.5

### Step 2.4: Create the Classifier

**File:** src/core/classifier.ts

**Purpose:** Orchestrate the classification flow.

**Main function:**
- classifyIdea(idea: string): Promise<ClassificationResult>

**Flow:**
1. Validate input (non-empty, under 500 chars)
2. Get LLM client
3. Construct prompt from template
4. Call Claude API
5. Parse response
6. Return result

### Step 2.5: Define Types

**File:** src/types/pim.ts (add to existing)

**New types:**
- ClassificationResult: {category, confidence, reasoning}
- The ProjectCategory type (already defined in PLAN_03)

### Step 2.6: Add Constants

**File:** src/types/constants.ts

**New constants:**
- CLASSIFICATION_CATEGORIES: Array of {value, label, description}
- CLASSIFICATION_EXAMPLES: Map of category -> example ideas

### Step 2.7: Wire to Extension

**File:** Update src/commands/planNewApp.ts

**Changes:**
- After user submits idea, call classifier
- Store result in PIM
- If confidence < 0.7, show quick pick for user to confirm
- Proceed to questionnaire with confirmed category

### Step 2.8: Add API Key Configuration

**File:** Update src/extension.ts

**Changes:**
- On activation, check if API key is configured
- If not, prompt user to enter it
- Store key in VS Code secrets API

**User flow for API key:**
1. Extension activates
2. Check secrets API for vibePlanner.anthropicApiKey
3. If missing, show input box: "Enter your Anthropic API key"
4. Validate key format (starts with sk-ant-)
5. Store in secrets API
6. Confirm: "API key saved"

## Testing the Classifier

### Manual Test Ideas
Test with these inputs and verify correct classification:
1. "A task management app for teams" -> saas
2. "A mobile app for tracking workouts" -> mobile
3. "A CLI tool for converting markdown to PDF" -> cli_tool
4. "A Chrome extension for saving bookmarks" -> browser_ext
5. "A 2D platformer game" -> game
6. "An internal dashboard for tracking KPIs" -> internal_tool

### Edge Cases to Test
- Very short idea: "blog" (should still classify)
- Very long idea: 3-4 sentences (should handle)
- Ambiguous idea: "an app" (should have low confidence, ask user)
- Non-English idea: handle gracefully
- Empty idea: show validation error

## Phase 2 Deliverables

1. src/llm/client.ts - Claude API client wrapper
2. src/llm/prompts.ts - Prompt templates including classification
3. src/llm/parser.ts - Response parser
4. src/core/classifier.ts - Category classifier
5. src/types/pim.ts - Updated with ClassificationResult type
6. src/types/constants.ts - Category definitions and examples
7. Updated src/commands/planNewApp.ts - Integration
8. Updated src/extension.ts - API key handling

## Common Issues and Fixes

### Issue: API key not found
**Fix:** Prompt user to enter key, store in secrets API.

### Issue: LLM returns non-JSON
**Fix:** Parser should handle markdown code blocks, retry with error feedback.

### Issue: Classification is wrong
**Fix:** Improve prompt with better examples, consider few-shot prompting.

### Issue: Slow classification
**Fix:** Use faster model (Haiku) for classification, Sonnet for generation.

## What Comes Next
Phase 3: Questionnaire System - We will build the category-aware slot-filling questionnaire.
