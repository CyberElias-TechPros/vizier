# Contributing to Vizier

Thank you for your interest in contributing to Vizier! We welcome contributions from the community.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- VS Code 1.85.0 or higher
- TypeScript 5.x
- Git

### Setup Development Environment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CyberElias-TechPros/vizier.git
   cd vizier
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Start development mode (watch):**
   ```bash
   npm run watch:all
   ```

### Opening in VS Code

1. Open the `vibecoder` folder in VS Code
2. Press `F5` to launch the extension in debug mode
3. A new VS Code window will open with the extension running
4. Set breakpoints in TypeScript files and they will hit in debug mode

---

## Project Structure

```
src/
  extension.ts              — Extension entry point
  commands/                 — Command handlers
  core/                     — Planning pipeline stages
  llm/                      — LLM provider implementations
  export/                   — Export to files
  errors.ts                 — Error handling
  validation.ts             — Input validation
  monitor/                  — Progress tracking
  tracking/                 — Tracker sync
  types/                    — Type definitions
  utils/                    — Utilities

webview/
  App.tsx                   — Main React component
  components/               — UI components
  hooks/                    — Custom hooks
  styles/                   — CSS styles
  utils/                    — Utilities
  types.ts                  — Type definitions

test/
  unit/                     — Unit tests
  integration/              — Integration tests
  fixtures/                 — Test data

scripts/
  build-webview.js          — Webview build script
  make-icon.js              — Icon generation
  eval.ts                   — Evaluation utilities
```

---

## Development Workflow

### Building

```bash
# Build extension and webview
npm run build

# Watch for changes
npm run watch:all

# Build specific parts
npm run build:ext          # Extension only
npm run build:webview      # Webview only
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "validation"

# Run with coverage
npm test -- --coverage

# Run single test
npm test -- test/unit/validation.test.ts
```

### Debugging

1. **Extension Code:**
   - Set breakpoints in TypeScript files in `src/`
   - Press `F5` to debug
   - Breakpoints will hit in the debug window

2. **Webview Code:**
   - In the debug window, right-click on the webview
   - Select "Inspect Element"
   - Use Chrome DevTools to debug React components

3. **LLM Calls:**
   - Check VS Code output panel (View → Output → Vizier)
   - Look for request/response logs with trace IDs

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write code following the existing style
   - Add tests for new functionality
   - Run `npm test` to ensure tests pass
   - Run `npm run build` to verify compilation

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: describe your change"
   ```

4. **Push and create a PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Code Style & Standards

### TypeScript
- Use TypeScript for all code
- Use strict mode (`"strict": true` in tsconfig.json)
- Avoid `any` types — use proper typing
- Use interfaces for component props
- Document complex functions with JSDoc comments

### React Components
- Use functional components with hooks
- Use TypeScript interfaces for props
- Add ARIA labels and semantic roles
- Ensure keyboard navigation support
- Use inline styles or CSS modules (avoid global styles)

### Error Handling
- Use error codes from `src/errors.ts`
- Throw `VizierError` for user-facing errors
- Log errors with trace IDs
- Provide actionable error messages

### Testing
- Write tests for new features
- Aim for >80% code coverage
- Test both happy path and error cases
- Use descriptive test names
- Test accessibility features

### Naming Conventions
- Components: PascalCase (`QuestionPanel.tsx`)
- Functions: camelCase (`handleSubmitIdea()`)
- Constants: UPPER_SNAKE_CASE (`ERROR_MESSAGE`)
- Files: kebab-case or PascalCase (for components)

---

## Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

body (optional)

footer (optional)
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Code style (formatting, semicolons, etc.)
- `refactor:` — Code refactor without feature change
- `perf:` — Performance improvement
- `test:` — Test changes
- `chore:` — Build, dependencies, etc.

**Examples:**
```
feat(blueprint): add support for perspectives

fix(validation): redact secrets from error logs

docs(getting-started): update provider setup steps

test(validation): add edge case for whitespace normalization
```

---

## Pull Request Process

1. **Before submitting:**
   - ✅ Run `npm test` and ensure all tests pass
   - ✅ Run `npm run build` and verify no errors
   - ✅ Update CHANGELOG.md if adding features
   - ✅ Check that code follows style guidelines
   - ✅ Ensure accessibility (ARIA labels, keyboard nav)

2. **Create PR with:**
   - Descriptive title following Conventional Commits
   - Clear description of changes
   - Link to related issues
   - Screenshots/videos if UI changes
   - Test instructions if needed

3. **Review expectations:**
   - At least one approval required
   - Address feedback promptly
   - Keep commits clean (consider rebasing)
   - All CI checks must pass

---

## Bug Reports

### Before Submitting

1. Check [existing issues](https://github.com/CyberElias-TechPros/vizier/issues)
2. Search GitHub discussions
3. Try updating to latest version
4. Enable debug logging in VS Code output panel

### Submitting a Bug Report

Use the bug report template and include:

1. **Describe the bug:**
   - What did you expect?
   - What actually happened?

2. **Reproduction steps:**
   - Minimal steps to reproduce
   - Code or screenshots if applicable

3. **Environment:**
   - VS Code version
   - Vizier version
   - LLM provider (Anthropic, OpenAI, Ollama, omniroute)
   - Node.js version
   - OS (Windows, macOS, Linux)

4. **Error logs:**
   - Check VS Code output panel (View → Output → Vizier)
   - Include trace ID if available
   - Include error message and stack trace

5. **Additional context:**
   - How often does it happen?
   - Does it happen with all providers?
   - Workaround if known

---

## Feature Requests

### Submitting a Feature Request

1. Search [existing discussions](https://github.com/CyberElias-TechPros/vizier/discussions)
2. Use the feature request template:
   - **Problem:** What problem does this solve?
   - **Solution:** How should it work?
   - **Alternatives:** Other approaches considered
   - **Examples:** Use cases or mockups

---

## Documentation

### Updating Docs

1. **User Documentation:**
   - Update `GETTING_STARTED.md` for user-facing features
   - Update `DISCLAIMERS.md` for privacy/security changes
   - Update `ERROR_HANDLING_GUIDE.md` for error handling changes

2. **Code Documentation:**
   - Add JSDoc comments for public functions/exports
   - Document complex algorithms
   - Add inline comments for non-obvious logic

3. **Changelog:**
   - Update `CHANGELOG.md` with changes under `[Unreleased]`
   - Follow [Keep a Changelog](https://keepachangelog.com) format

---

## Testing Guidelines

### Unit Tests

Location: `test/unit/`

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAndSanitizeIdea } from "../../src/validation";

test("validateAndSanitizeIdea - accepts valid idea", () => {
  const result = validateAndSanitizeIdea("A mobile app for tracking habits");
  assert.equal(typeof result, "string");
});

test("validateAndSanitizeIdea - rejects too short", () => {
  assert.throws(
    () => validateAndSanitizeIdea("short"),
    { code: "INPUT_EMPTY" }
  );
});
```

### Integration Tests

Location: `test/integration/`

```typescript
// Test extension lifecycle, message routing, etc.
```

### Running Tests

```bash
npm test                          # All tests
npm test -- --grep "validation"   # Specific pattern
npm test -- test/unit/file.ts     # Specific file
```

---

## Performance Guidelines

- **LLM calls:** Expect 15–30 seconds per generation
- **Repo scanning:** Should complete in <5 seconds for typical repos
- **UI updates:** Keep webview responsive during LLM calls
- **Logging:** Avoid logging large objects; summarize instead

---

## Security Guidelines

1. **Secrets:**
   - Never log API keys or tokens
   - Use `redactSensitivePatterns()` before logging
   - Store secrets in VS Code Secret Storage, not settings

2. **Input Validation:**
   - Validate all user input before processing
   - Use `validateAndSanitizeIdea()` for ideas
   - Use `validateQuestionnaireAnswer()` for answers

3. **LLM Prompts:**
   - Add warnings about untrusted context
   - Don't let embedded instructions override primary task
   - Be explicit about what LLM should and shouldn't do

4. **Code Privacy:**
   - Never transmit source code to LLM
   - Only scan `package.json`, `README`, agent rule files
   - Respect `vizier.codePrivacyMode` setting

---

## Accessibility Guidelines

All UI changes must be accessible (WCAG 2.1 AA):

1. **ARIA:**
   - Add `aria-label` to buttons without text
   - Add `aria-expanded` to collapsible sections
   - Add `role` attributes for semantic meaning

2. **Keyboard Navigation:**
   - Tab/Shift+Tab to navigate
   - Enter/Space to activate buttons
   - Arrow keys for selection
   - Escape to close dialogs

3. **Screen Readers:**
   - Use semantic HTML (button, input, etc.)
   - Add `aria-live` for dynamic updates
   - Add `aria-describedby` for context

4. **Visual:**
   - Maintain focus indicators (outline or border)
   - Ensure sufficient color contrast
   - Don't rely on color alone

5. **Testing:**
   - Test with keyboard only
   - Test with screen reader (NVDA, JAWS)
   - Check with axe or similar tool

---

## Questions?

- 💬 Ask in [GitHub Discussions](https://github.com/CyberElias-TechPros/vizier/discussions)
- 🐛 Report issues on [GitHub Issues](https://github.com/CyberElias-TechPros/vizier/issues)
- 📖 Read [Getting Started Guide](GETTING_STARTED.md)

---

## Code of Conduct

Be respectful and constructive. We're all here to improve Vizier together.

---

**Happy coding! 🚀**
