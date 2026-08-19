# PLAN 05: Build Phase 1 - Foundation Setup

## Goal of This Phase
Set up the complete project scaffolding, install dependencies, configure TypeScript, and create the minimal extension that loads in VS Code. At the end of this phase, you will have a "Hello World" extension that activates and shows an empty sidebar.

## Why This Phase First?
Before writing any feature code, we need:
1. A working build pipeline (edit -> build -> test cycle)
2. Proper TypeScript configuration
3. The extension manifest correctly set up
4. The webview bundling pipeline working
5. All dependencies installed and verified

Without this foundation, every subsequent phase would be fighting tooling instead of building features.

## Step-by-Step Instructions

### Step 1.1: Initialize the Project Directory

**What to do:**
1. Open terminal in the vibecoder directory
2. Run: npm init -y
3. This creates a basic package.json

**Why:**
We need a package.json before installing any dependencies. npm init -y creates sensible defaults we will edit later.

**Expected result:** A package.json file with default values.

### Step 1.2: Install Dependencies

**What to do:** Run the following commands in order:

```
# Core dependencies (needed at runtime)
npm install @anthropic-ai/sdk uuid

# Dev dependencies (needed for building)
npm install --save-dev typescript @types/node @types/vscode @types/uuid
npm install --save-dev esbuild rimraf npm-run-all
npm install --save-dev @vscode/vsce

# Webview dependencies (bundled into webview.js)
npm install react react-dom @xyflow/react
npm install --save-dev @types/react @types/react-dom
npm install --save-dev tailwindcss postcss autoprefixer
```

**Why each dependency:**
- @anthropic-ai/sdk: Claude API client for making LLM calls
- uuid: Generate UUIDs for project/task IDs
- typescript: TypeScript compiler
- @types/*: TypeScript type definitions
- esbuild: Fast bundler for extension and webview code
- rimraf: Cross-platform rm -rf (for clean builds)
- npm-run-all: Run multiple npm scripts in parallel/sequence
- @vscode/vsce: VS Code Extension CLI for packaging/publishing
- react, react-dom: UI framework for webview
- @xyflow/react: React Flow for DAG visualization
- tailwindcss, postcss, autoprefixer: CSS styling for webview

**Expected result:** node_modules/ directory created, package.json updated, package-lock.json created.

### Step 1.3: Configure TypeScript (Extension)

**What to do:** Create tsconfig.json in the project root.

**Why these settings:**
- target ES2022: Modern JavaScript features
- module CommonJS: VS Code extensions use CommonJS
- strict: Catch type errors early
- outDir dist: Compiled JS goes here
- rootDir src: Source lives in src/

See PLAN_04_FILE_STRUCTURE.md for the complete tsconfig.json content.

### Step 1.4: Configure TypeScript (Webview)

**What to do:** Create tsconfig.webview.json.

**Why separate config:**
- Webview uses ESNext modules (bundled by esbuild)
- Webview needs DOM lib (browser APIs)
- Webview uses JSX (React)
- Extension uses CommonJS (Node.js)

### Step 1.5: Configure Tailwind CSS

**What to do:** Create tailwind.config.js and postcss.config.js.

**Why VS Code CSS variables:**
- Extension automatically matches VS Code theme
- Works in dark mode, light mode, high contrast
- No hardcoded colors needed

### Step 1.6: Create .vscodeignore

**What to do:** Create .vscodeignore to control what gets packaged into the .vsix.

**Why:** We exclude source files (only dist/ goes in the package) and dev dependencies.

### Step 1.7: Create .gitignore

**What to do:** Create .gitignore with standard Node.js ignores plus our specific exclusions.

### Step 1.8: Update package.json (Extension Manifest)

**What to do:** Replace the contents of package.json with the complete extension manifest.

**Critical sections:**
- publisher: Create at https://marketplace.visualstudio.com/
- activationEvents: Tells VS Code when to load our extension
- main: Points to the bundled extension.js
- contributes/commands: Commands shown in command palette
- contributes/viewsContainers: Sidebar icon
- contributes/views: Webview panel in sidebar
- contributes/configuration: Settings the user can change
- scripts: Build, watch, test, package commands

### Step 1.9: Create esbuild Config

**What to do:** Create esbuild.config.js to define how extension and webview are bundled.

### Step 1.10: Create Extension Entry Point

**What to do:** Create src/extension.ts with activate/deactivate functions and command registration.

### Step 1.11: Create Webview Files

**What to do:** Create webview/index.html, webview/index.tsx, webview/App.tsx, webview/styles/globals.css.

### Step 1.12: Create VS Code Debug Config

**What to do:** Create .vscode/launch.json and .vscode/tasks.json for F5 debugging.

### Step 1.13: Build and Test

**What to do:**
1. Run: npm install
2. Run: npm run build:all
3. Check that dist/extension.js and dist/webview.js were created
4. Press F5 in VS Code to launch Extension Development Host
5. In the new window, open command palette (Ctrl+Shift+P)
6. Type "Vizier: Plan New App"
7. You should see the information message

**Verification checklist:**
- Extension activates without errors
- Commands appear in command palette
- Commands show information messages when clicked
- No errors in VS Code developer tools console

## Phase 1 Deliverables

At the end of Phase 1, you should have:
1. Complete project structure with all config files
2. All dependencies installed
3. TypeScript compilation working
4. esbuild bundling working
5. Extension loads in VS Code Extension Development Host
6. All three commands registered and responding
7. Empty webview showing in sidebar

## Common Issues and Fixes

### Issue: "Cannot find module vscode"
**Fix:** Make sure @types/vscode is installed and tsconfig includes it.

### Issue: "Extension not activating"
**Fix:** Check activationEvents in package.json match command IDs.

### Issue: "Webview is blank"
**Fix:** Check dist/webview.js exists, check browser console for React errors.

### Issue: "Build fails with esbuild errors"
**Fix:** Make sure esbuild is installed, check esbuild.config.js syntax.

## What Comes Next
Phase 2: Category Classifier - We will build the LLM-based idea classification system.
