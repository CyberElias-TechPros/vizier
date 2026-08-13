# PLAN 11: Build Phase 7 - UI/Webview Polish

## Goal of This Phase
Polish the complete sidebar interface: integrate all components, add loading states, error handling, responsive layout, and ensure the entire user flow from idea to export feels smooth and professional.

## Why This Phase Last (Before Testing)?
All the backend logic is built in Phases 2-6. Phase 7 focuses on making the UI polished, intuitive, and bug-free before we test end-to-end.

## What We Are Building

### Complete User Flow
1. User opens sidebar -> sees IdeaInput
2. User types idea -> clicks "Plan This"
3. Loading spinner -> CategoryBadge appears
4. Questions appear one at a time -> user answers/skips
5. Progress bar updates
6. After last question -> "Generate Blueprint" button
7. Loading spinner -> Blueprint tabs appear
8. User reviews blueprint -> clicks "Generate Tasks"
9. Loading spinner -> Task DAG appears
10. User explores tasks -> clicks "Export"
11. Export panel -> files written -> success confirmation

### UI Polish Items
- Consistent spacing and typography
- Smooth transitions between states
- Clear error messages
- Loading indicators for all async operations
- Responsive layout (sidebar can be narrow)
- Keyboard navigation support
- Accessibility (ARIA labels, focus management)

## Implementation Steps

### Step 7.1: Create Header Component

**File:** webview/components/Header.tsx

**Renders:**
- Extension name/icon
- Current project name (if set)
- Step indicator (Planning / Blueprint / Tasks / Export)

### Step 7.2: Create Error Message Component

**File:** webview/components/ErrorMessage.tsx

**Renders:**
- Error icon
- Error message text
- "Retry" button (if applicable)
- "Dismiss" button

**Used for:**
- API errors (LLM call failed)
- Network errors
- Validation errors
- Parse errors

### Step 7.3: Refine IdeaInput Component

**File:** webview/components/IdeaInput.tsx

**Features:**
- Textarea for idea input
- Placeholder text with examples
- Character counter (max 500)
- "Plan This" button (disabled if empty)
- Keyboard shortcut (Enter to submit)

### Step 7.4: Refine CategoryBadge Component

**File:** webview/components/CategoryBadge.tsx

**Features:**
- Category icon
- Category label
- Confidence indicator (if < 100%)
- "Change" button (lets user pick different category)

### Step 7.5: Create View Container

**File:** Update webview/App.tsx

**State machine:**
- view: 'idea_input' | 'questionnaire' | 'blueprint' | 'tasks' | 'export' | 'complete'
- Transition between views based on user actions
- Each view renders its component

### Step 7.6: Add View Transitions

**File:** webview/App.tsx

**CSS transitions:**
- Fade in/out between views
- Slide in for new questions
- Scale in for task nodes

### Step 7.7: Implement Keyboard Navigation

**File:** webview/components/QuestionPanel.tsx

**Keyboard support:**
- Enter to submit answer
- Tab to move between options
- Escape to skip question
- Number keys 1-4 for quick option selection

### Step 7.8: Add Accessibility

**All components:**
- aria-label on all interactive elements
- role attributes (button, dialog, progressbar)
- Focus management (focus first input on view change)
- Screen reader announcements for state changes

### Step 7.9: Handle Edge Cases

**File:** webview/App.tsx

**Edge cases:**
- Empty idea submitted -> show validation error
- API key missing -> prompt for key
- LLM timeout -> show retry option
- Truncated response -> show partial results with warning
- Network offline -> show offline message

### Step 7.10: Add Persistence

**File:** src/webview/bridge.ts

**Features:**
- Save PIM to workspace state on every change
- Restore state on webview reconnect
- Handle VS Code restart (reload from file)

### Step 7.11: Create Completion Screen

**File:** webview/components/CompletionScreen.tsx

**Renders:**
- Success checkmark
- "Your plan is ready!" message
- Summary of what was generated
- "Open plan/ folder" button
- "Start New Plan" button

### Step 7.12: Final Integration Test

**Manual test:**
1. Open sidebar
2. Type idea: "A habit tracking app for mobile"
3. Click Plan This
4. Verify category classified as "mobile"
5. Answer all 8 mobile questions
6. Click Generate Blueprint
7. Wait for blueprint (verify all 3 tabs have content)
8. Click Generate Tasks
9. Wait for task DAG (verify nodes render)
10. Click a task, verify detail panel
11. Click Export
12. Verify files created in workspace
13. Open .cursorrules, verify content

## Phase 7 Deliverables

1. webview/components/Header.tsx
2. webview/components/ErrorMessage.tsx
3. webview/components/CompletionScreen.tsx
4. Refined all existing components
5. Updated webview/App.tsx with full state machine
6. Keyboard navigation throughout
7. Accessibility attributes
8. Persistence for state recovery
9. Edge case handling

## What Comes Next
Testing and Deployment - We will test end-to-end, fix bugs, and publish to the marketplace.
