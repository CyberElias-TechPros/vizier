# PLAN 13: Deployment and Publishing

## Goal of This Document
Step-by-step guide to package the extension and publish it to the VS Code Marketplace and Open VSX Registry so users can install it.

## Pre-Deployment Checklist

Before publishing, verify:
- All unit tests pass (npm test)
- TypeScript compiles without errors (npm run typecheck)
- Extension loads in development host
- All three test scenarios pass end-to-end
- README.md is complete
- LICENSE.md is present
- icon.png exists (128x128px minimum)
- CHANGELOG.md has version entry
- No console.log statements in production code (or they are intentional)
- API key is NOT hardcoded anywhere
- No sensitive data in the codebase

## Step 13.1: Create Publisher Account

**What to do:**
1. Go to https://marketplace.visualstudio.com/
2. Sign in with Microsoft account
3. Create a publisher profile
4. Note your publisher ID (used in package.json)
5. Get an Azure DevOps access token

**Why:**
- Publisher ID uniquely identifies you
- Access token is needed for vsce to publish

## Step 13.2: Prepare Extension Icon

**Specifications:**
- Format: PNG
- Size: 128x128 pixels minimum
- Background: Transparent or solid
- Style: Simple, recognizable at small sizes

**Tools:**
- Use Figma, Canva, or any image editor
- Keep it simple (avoid text, use shapes)

## Step 13.3: Write README.md

**Required sections:**
1. **What it does** - One paragraph description
2. **Features** - Bullet list of key features
3. **Requirements** - API key needed
4. **Installation** - How to install (marketplace link)
5. **Usage** - Step-by-step usage guide
6. **Configuration** - Settings description
7. **FAQ** - Common questions
8. **Contributing** - How to contribute (if open source)
9. **License** - License type

**Important:** README is shown on the marketplace listing. Make it clear and compelling.

## Step 13.4: Write CHANGELOG.md

**Format:**
```
# Changelog

## [0.1.0] - 2025-01-15
### Added
- Initial release
- Category classifier for SaaS, Mobile, CLI Tool
- Category-aware questionnaire
- Blueprint generator (PRD, architecture, schema)
- Task DAG with dependency visualization
- Context pack generation
- Export to .cursorrules, CLAUDE.md, AGENTS.md
```

## Step 13.5: Choose and Add License

**Recommended:** MIT License (permissive, simple)

**Why MIT:**
- Allows commercial use
- Allows modification
- Simple and well-understood
- Compatible with VS Code Marketplace

**File:** LICENSE.md

## Step 13.6: Update package.json for Release

**Verify:**
- version: "0.1.0" (semver)
- publisher: your publisher ID
- icon: "icon.png"
- galleryBanner: { theme: "dark", color: "#1e1e1e" } (optional)
- repository: { type: "git", url: "https://github.com/..." }

## Step 13.7: Build Production Bundle

**What to do:**
```bash
npm run clean
NODE_ENV=production npm run build:all
npm run typecheck
npm test
```

**Verify:**
- dist/extension.js exists and is minified
- dist/webview.js exists and is minified
- No source maps in production (or they are separate .map files)
- No console errors

## Step 13.8: Package Extension

**What to do:**
```bash
npm run package
```

**Result:** vibe-planner-0.1.0.vsix file

**What is .vsix?**
- VS Code Extension package format
- Essentially a ZIP file with specific structure
- Can be installed manually or uploaded to marketplace

## Step 13.9: Test .vsix Installation

**What to do:**
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click "..." menu -> "Install from VSIX..."
4. Select vibe-planner-0.1.0.vsix
5. Verify extension loads and works

**Why:** Catches packaging issues before publishing.

## Step 13.10: Publish to VS Code Marketplace

**What to do:**
```bash
vsce publish
```

**Or manually:**
1. Go to https://marketplace.visualstudio.com/manage
2. Click "New Extension" -> "Visual Studio Code"
3. Upload the .vsix file
4. Wait for review (usually automatic, fast)

**After publishing:**
- Extension appears in marketplace search
- Users can install directly from VS Code
- You can view install counts, ratings, reviews

## Step 13.11: Publish to Open VSX Registry

**Why also Open VSX?**
- Open-source alternative to Microsoft Marketplace
- Required for Cursor, Windsurf, VSCodium users
- More discoverable in open-source community

**What to do:**
1. Go to https://open-vsx.org/
2. Sign in with GitHub account
3. Create namespace
4. Get access token
5. Install ovsx CLI: npm install -g ovsx
6. Publish: ovsx publish -p YOUR_TOKEN

## Step 13.12: Post-Publishing

**Announce:**
- Post on Reddit (r/vscode, r/webdev)
- Share on Twitter/X
- Write a blog post
- Submit to VS Code extension showcases
- Share in Discord communities (Cursor, VS Code)

**Monitor:**
- Check for user feedback and bug reviews
- Respond to questions
- Track install count and uninstalls

**Maintain:**
- Fix bugs quickly
- Add features based on user feedback
- Update dependencies regularly
- Keep README current

## Version Numbering (Semver)

- MAJOR: Breaking changes (1.0.0 -> 2.0.0)
- MINOR: New features (0.1.0 -> 0.2.0)
- PATCH: Bug fixes (0.1.0 -> 0.1.1)

**For V1 development:**
- 0.1.0: First public release
- 0.1.1: Bug fixes
- 0.2.0: New category (browser_ext or game)
- 1.0.0: Stable, feature-complete V1

## Updating Published Extension

```bash
# Make changes
npm version patch  # Updates package.json version
npm run build:all
vsce publish
```

## Unpublishing (if needed)

```bash
vsce unpublish publisher.extension-name
```

**Warning:** Unpublishing removes it for all users. Only do this for serious issues.
