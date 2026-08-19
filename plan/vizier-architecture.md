# Vizier — Multi-Layered Memory & Structural Tool Architecture

> A VS Code Extension that embeds SQLite+vector storage, a Tree-sitter AST engine, and a local MCP server bridge over HTTP/SSE, giving external coding agents (Claude Code, Cursor, Copilot, etc.) deep structural access to any workspace.

---

## Executive Summary

This plan builds on the existing Vizier extension scaffold (VS Code extension host, webview panel, settings system, command palette, toast notifications, sidebar icon, and export pipeline) and adds three major subsystems:

1. **6-Layer Memory Engine** — SQLite with vector search (sqlite-vec), chunked semantic/verbatim storage, identity layer, and shared cross-tool memory.
2. **12 Structural AST Tools** — Tree-sitter powered code analysis, graph/hierarchy resolution, and safe structural edit primitives exposed as callable tools.
3. **MCP Bridge Server** — A local HTTP/SSE MCP host (Express on `localhost:3000`) that registers all tools and resources so any external agent can consume them.

The existing UI chrome (sidebar icon, activity bar, status bar, webview panel) is reused and extended with new views for memory inspection, AST exploration, and MCP connection status.

---

## Phase 1 — Memory Layer (6 Layers)

### 1.1 Storage Engine

| Concern | Implementation |
|---------|---------------|
| Database | Embed `better-sqlite3` (native Node addon) in the extension package. Bundle a prebuilt `.node` binary for win32-x64, linux-x64, and darwin-arm64. |
| Vector extension | Use `sqlite-vec` (C extension loaded at runtime via `better-sqlite3`'s `loadExtension()`). If sqlite-vec is unavailable, fall back to a pure-JS HNSW index stored in a separate JSON file. |
| Schema | Three core tables: `chunks(id, layer, file_path, start_line, end_line, content, language, symbol_name, symbol_kind, parent_id, created_at)`, `embeddings(chunk_id, vector BLOB)`, `identity_rules(path, content_hash, content, updated_at)`. |
| Initialization | On `activate()`, call `initDatabase(context.globalStorageUri.fsPath)` which creates the DB file at `~/.v3code/memory.db`. Run migrations synchronously before the first webview message. |

### 1.2 Identity Layer — Auto-Sync via File System Watchers

The identity layer detects and parses project-level rule files (`v3code.md`, `.clauderc`, `.cursorrules`, `.github/copilot-instructions.md`) the moment a developer saves changes. It uses VS Code's `FileSystemWatcher` API to trigger background re-indexing automatically.

```typescript
// src/core/memory/identity-layer.ts

import * as vscode from "vscode";
import * as crypto from "crypto";
import { getDb } from "./database";

/** Glob patterns for identity rule files across the workspace. */
const IDENTITY_GLOBS = [
  "**/v3code.md",
  "**/.clauderc",
  "**/.cursorrules",
  "**/.github/copilot-instructions.md",
  "**/AGENTS.md",
];

export function initIdentityLayer(context: vscode.ExtensionContext): void {
  // 1. Initial full scan — parse every matching file on activation.
  scanIdentityFiles();

  // 2. Create watchers for each glob pattern.
  const watchers: vscode.FileSystemWatcher[] = [];

  for (const pattern of IDENTITY_GLOBS) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    // File created or content changed → upsert into identity_rules table.
    watcher.onDidChange(async (uri) => {
      console.log(`[Vizier] Identity file changed: ${uri.fsPath}`);
      await upsertIdentityRule(uri);
    });

    // File created → parse and store.
    watcher.onDidCreate(async (uri) => {
      console.log(`[Vizier] Identity file created: ${uri.fsPath}`);
      await upsertIdentityRule(uri);
    });

    // File deleted → remove from identity_rules table.
    watcher.onDidDelete(async (uri) => {
      console.log(`[Vizier] Identity file deleted: ${uri.fsPath}`);
      await deleteIdentityRule(uri.fsPath);
    });

    watchers.push(watcher);
  }

  // 3. Clean up watchers when extension deactivates.
  context.subscriptions.push(
    ...watchers,
    { dispose: () => watchers.forEach((w) => w.dispose()) }
  );
}

/**
 * Full scan on activation: find all identity files and index them.
 * Only re-indexes files whose content_hash has changed since the last scan.
 */
async function scanIdentityFiles(): Promise<void> {
  const uris = await Promise.all(
    IDENTITY_GLOBS.map((g) => vscode.workspace.findFiles(g))
  );
  const allFiles = uris.flat();

  for (const uri of allFiles) {
    await upsertIdentityRule(uri);
  }
  console.log(`[Vizier] Identity scan complete: ${allFiles.length} files indexed.`);
}

/**
 * Read a single identity file, hash its content, and upsert it into the DB.
 * If the content hash has not changed, the DB write is skipped (no-op).
 */
async function upsertIdentityRule(uri: vscode.Uri): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const content = doc.getText();
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");

    const db = getDb();

    // Check if we already have this exact content.
    const existing = db.prepare(
      "SELECT content_hash FROM identity_rules WHERE path = ?"
    ).get(uri.fsPath) as { content_hash: string } | undefined;

    if (existing && existing.content_hash === contentHash) {
      return; // No change — skip DB write.
    }

    // Upsert: insert or replace.
    db.prepare(
      `INSERT INTO identity_rules (path, content_hash, content, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(path) DO UPDATE SET
         content_hash = excluded.content_hash,
         content = excluded.content,
         updated_at = excluded.updated_at`
    ).run(uri.fsPath, contentHash, content);

    // Also re-index any semantic chunks from this file (if it's a source file).
    console.log(`[Vizier] Identity rule upserted: ${uri.fsPath} (${contentHash.slice(0, 8)})`);
  } catch (err) {
    console.error(`[Vizier] Failed to upsert identity rule: ${uri.fsPath}`, err);
  }
}

/**
 * Remove an identity rule from the DB when the file is deleted.
 */
async function deleteIdentityRule(filePath: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM identity_rules WHERE path = ?").run(filePath);
  console.log(`[Vizier] Identity rule deleted: ${filePath}`);
}

/**
 * Query: return all active identity rules as structured JSON.
 */
export function getIdentityRules(): Array<{
  path: string;
  content: string;
  updated_at: string;
}> {
  const db = getDb();
  return db.prepare("SELECT path, content, updated_at FROM identity_rules").all() as any[];
}
```

**How it works:**

1. On activation, `scanIdentityFiles()` runs `findFiles` for every glob and calls `upsertIdentityRule` for each hit.
2. Each `FileSystemWatcher` fires on save/create/delete events in real time.
3. `upsertIdentityRule` reads the file, hashes the content with SHA-256, and compares against the stored hash. If unchanged, it skips the DB write entirely — zero wasted I/O.
4. On delete, `deleteIdentityRule` removes the row.
5. All watchers are registered in `context.subscriptions` so VS Code disposes them when the extension deactivates.

### 1.3 Semantic Layer

- On workspace open and on file-save events, run Tree-sitter to chunk each source file into semantic blocks: functions, classes, methods, interfaces, type definitions.
- Each chunk gets metadata: `symbol_name`, `symbol_kind` (function/class/method/interface/enum/struct), `parent_id` (the enclosing class/module), `language`, `file_path`, `start_line`, `end_line`.
- Store the raw source text in `chunks.content`.
- Generate embeddings via a local ONNX-backed model (Xenova/Transformers.js running in the extension host with `onnxruntime-node`). Use `Xenova/all-MiniLM-L6-v2` (384-dim) for initial version.
- Store vectors in the `embeddings` table as binary blobs.
- Query: `semanticSearch(queryText, topK=10)` → embed the query, run approximate nearest neighbor via sqlite-vec, return ranked chunks.

### 1.4 Verbatim Layer

- In addition to semantic chunks, store raw character ranges for exact text recall.
- A verbatim chunk is simply a `chunks` row with `layer='verbatim'` and no embedding — it is retrieved by file path + line range, not by vector similarity.
- Useful for agents that need exact reproduction of code blocks.

### 1.5 Episodic Layer

- Log every tool invocation, file edit, and agent interaction into an `episodes` table: `episodes(id, timestamp, tool_name, file_path, summary, diff_snapshot)`.
- This gives agents access to a history of what has happened in the workspace.
- Queryable via `getRecentEpisodes(limit=20)` or `getEpisodesForFile(filePath)`.

### 1.6 Shared Cross-Tool Memory

- Write a `shared_memory.json` file to `~/.vizier/shared_memory.json` that mirrors key facts from the semantic and identity layers.
- Use a file lock (`proper-lockfile` or manual `.lock` file) to prevent concurrent writes.
- External terminal-based tools (Claude Code CLI, Cursor background processes) can read this file directly without going through the MCP bridge.
- Update the file on every significant memory mutation (new chunks indexed, rules changed, episodes logged).

### Memory Layer File Map

```
src/core/memory/
├── database.ts          # SQLite init, migrations, connection pool
├── schema.ts            # Table DDL, migration scripts
├── identity-layer.ts    # Find + watch v3code.md, .clauderc, etc.
├── semantic-layer.ts    # Chunk code, generate embeddings, store
├── verbatim-layer.ts    # Raw text block storage & retrieval
├── episodic-layer.ts    # Tool invocation logging
├── shared-memory.ts     # Write shared_memory.json with locking
├── embedding-engine.ts  # ONNX Transformer.js wrapper
└── vector-search.ts     # sqlite-vec ANN query wrapper
```

---

## Phase 2 — 12 Structural AST Tools

### 2.1 Parser Engine

- Bundle `tree-sitter` (npm: `tree-sitter`) and language grammars: `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-rust`, `tree-sitter-go`, `tree-sitter-html`, `tree-sitter-css`, `tree-sitter-json`, `tree-sitter-markdown`.
- On activation, compile grammars in a background thread (Worker) so the UI thread is never blocked.
- Maintain an in-memory AST cache: `Map<filePath, { tree, language, version }>`. Invalidate on file-change events.
- Fallback: For languages without a bundled grammar, fall back to VS Code's built-in Language Server Protocol via `vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri)` and `vscode.executeDefinitionProvider`.

### 2.2 The 12 Tools

Each tool is a pure function that takes a JSON argument schema and returns a structured JSON payload.

| # | Tool Name | Description | Input | Output |
|---|-----------|-------------|-------|--------|
| 1 | `get_symbol_at_position` | Return the symbol (name, kind, range, docstring) at a given file+line+col. | `{file, line, column}` | `{name, kind, range, docstring, signature}` |
| 2 | `get_function_hierarchy` | For a given function/method, return its call graph: what it calls (callees) and what calls it (callers), up to depth N. | `{file, line, depth=2}` | `{symbol, callers: [...], callees: [...]}` |
| 3 | `get_class_hierarchy` | For a given class, return its parent classes, child classes, and implemented interfaces. | `{file, line}` | `{name, parents: [...], children: [...], interfaces: [...]}` |
| 4 | `get_file_structure` | Return the full structural outline of a file: all top-level symbols with their kinds, ranges, and nesting. | `{file}` | `{symbols: [{name, kind, range, children: [...]}]}` |
| 5 | `get_references` | Find all references to a symbol across the workspace. | `{symbolName, file, line}` | `{references: [{file, line, column, context}]}` |
| 6 | `get_dependencies` | For a file, return all imports/requires and what symbols are imported. | `{file}` | `{imports: [{source, symbols: [...], kind}]}` |
| 7 | `get_type_info` | Resolve the inferred or declared type of an expression at a position. | `{file, line, column}` | `{type, spread: [{name, type}]}` |
| 8 | `rename_symbol` | Perform a safe rename across all references. Returns a WorkspaceEdit preview without applying it. | `{file, line, column, newName}` | `{edits: [{file, range, newText}], affectedFiles: [...]}` |
| 9 | `insert_code_block` | Insert a new function/class/method at a specified location. Returns a WorkspaceEdit preview. | `{file, afterLine, code, language}` | `{edit: {file, range, newText}, parseErrors: [...]}` |
| 10 | `replace_code_range` | Replace a specific code range with new code. Respects indentation. | `{file, startLine, endLine, newCode}` | `{edit: {file, range, newText}, parseErrors: [...]}` |
| 11 | `extract_symbol` | Extract a code block into a new function/method. Returns the refactored edit. | `{file, startLine, endLine, newName}` | `{edit, usagesUpdated: [...]}` |
| 12 | `validate_syntax` | Parse a file or code string and return any syntax errors. | `{file? OR code, language}` | `{valid: boolean, errors: [{line, column, message}]}` |

### 2.3 Graph & Hierarchy Resolution

- Build a workspace-wide call graph on activation: parse all source files, extract call sites, link them to definitions.
- Store the graph in memory as an adjacency list: `Map<symbolId, { callers: Set<symbolId>, callees: Set<symbolId> }>`.
- Update incrementally on file-save (re-parse only changed files, diff the call edges).
- Expose the graph through `get_function_hierarchy` (tool #2) and `get_class_hierarchy` (tool #3).

### 2.4 AST Modification Layer

- Never do raw text insertion for structural edits.
- Use `vscode.WorkspaceEdit` + `vscode.workspace.applyEdit()` for all modifications.
- Before applying, run `validate_syntax` on the proposed new code to catch parse errors.
- Respect workspace formatting settings via `vscode.commands.executeCommand('vscode.executeFormatDocument', ...)` after applying edits.
- Record every applied edit in the episodic layer.

### AST Tools File Map

```
src/core/ast/
├── parser-engine.ts       # Tree-sitter init, grammar loading, AST cache
├── symbol-at-position.ts  # Tool 1
├── function-hierarchy.ts  # Tool 2 + call graph builder
├── class-hierarchy.ts     # Tool 3
├── file-structure.ts      # Tool 4
├── references.ts          # Tool 5
├── dependencies.ts        # Tool 6
├── type-info.ts           # Tool 7
├── rename.ts              # Tool 8
├── insert-code.ts         # Tool 9
├── replace-range.ts       # Tool 10
├── extract-symbol.ts      # Tool 11
├── validate-syntax.ts     # Tool 12
├── workspace-graph.ts     # Global call graph + class graph
└── edit-utils.ts          # WorkspaceEdit helpers, indent detection
```

---

## Phase 3 — MCP Bridge Server (HTTP/SSE)

### 3.1 Server Transport

The Vizier extension runs a local MCP server using the official `@modelcontextprotocol/sdk`. On activation, the extension spins up an Express instance on `localhost:3000` and exposes an SSE endpoint that any MCP-compatible client can connect to.

```typescript
// src/extension.ts — Production-ready activation boilerplate

import * as vscode from "vscode";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

let mcpServer: Server | undefined;
let statusBarItem: vscode.StatusBarItem;

/**
 * Activates the Vizier VS Code extension.
 * Runs automatically when the workspace opens or a trigger command fires.
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log("[Vizier] Initializing memory & AST architecture...");

  // ── 1. Status Bar ──────────────────────────────────────────────
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(sync~spin) Vizier: Starting...";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  try {
    // ── 2. MCP Server ────────────────────────────────────────────
    mcpServer = new Server(
      { name: "vizier-mcp-bridge", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    // ── 3. Register Tools ────────────────────────────────────────
    registerMcpTools(mcpServer);

    // ── 4. Express + SSE Transport ───────────────────────────────
    const app = express();
    let transport: SSEServerTransport | undefined;

    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      await mcpServer!.connect(transport);
      statusBarItem.text = "$(check) Vizier: Connected";
      statusBarItem.backgroundColor = undefined;
    });

    app.post("/messages", async (req, res) => {
      if (transport) {
        await transport.handleMessage(req, res);
      }
    });

    const serverInstance = app.listen(3000, () => {
      console.log("[Vizier] MCP Bridge listening on port 3000");
      statusBarItem.text = "$(link) Vizier: Port 3000";
    });

    context.subscriptions.push({
      dispose: () => {
        serverInstance.close();
        mcpServer?.close();
      },
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Vizier Bridge failed to start: ${error}`
    );
    statusBarItem.text = "$(alert) Vizier: Failed";
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground"
    );
  }
}

/**
 * Maps all 12 AST tools + 6 memory tools to MCP tool registrations.
 */
function registerMcpTools(server: Server) {
  // ── Handler 1: List available tools ────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // ── Memory Tools ─────────────────────────────────────────
        {
          name: "query_semantic_index",
          description:
            "Search the Vizier vector store by semantic meaning (not filenames).",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Conceptual search query.",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_identity_rules",
          description:
            "Return all active project identity rules (v3code.md, .clauderc, etc.).",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_recent_episodes",
          description:
            "Return recent tool invocations and file edit history.",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", default: 20 },
            },
          },
        },
        {
          name: "get_file_context",
          description:
            "Return combined context for a file: structure + rules + recent episodes.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string", description: "Absolute file path." },
            },
            required: ["file"],
          },
        },
        {
          name: "get_shared_memory",
          description:
            "Return the full contents of the shared memory store.",
          inputSchema: { type: "object", properties: {} },
        },
        // ── AST Tools ────────────────────────────────────────────
        {
          name: "get_symbol_at_position",
          description:
            "Return the symbol (name, kind, range, docstring) at a file/line/column.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              line: { type: "number" },
              column: { type: "number" },
            },
            required: ["file", "line", "column"],
          },
        },
        {
          name: "get_caller_hierarchy",
          description:
            "Return the call graph for a function: what calls it and what it calls.",
          inputSchema: {
            type: "object",
            properties: {
              functionName: { type: "string" },
              filePath: { type: "string" },
            },
            required: ["functionName", "filePath"],
          },
        },
        {
          name: "get_class_hierarchy",
          description:
            "Return parent classes, child classes, and interfaces for a class.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              line: { type: "number" },
            },
            required: ["file", "line"],
          },
        },
        {
          name: "get_file_structure",
          description:
            "Return the full structural outline of a file (all symbols, kinds, ranges).",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
            },
            required: ["file"],
          },
        },
        {
          name: "get_references",
          description:
            "Find all references to a symbol across the workspace.",
          inputSchema: {
            type: "object",
            properties: {
              symbolName: { type: "string" },
              file: { type: "string" },
              line: { type: "number" },
            },
            required: ["symbolName", "file", "line"],
          },
        },
        {
          name: "get_dependencies",
          description:
            "Return all imports/requires in a file and what symbols are imported.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
            },
            required: ["file"],
          },
        },
        {
          name: "rename_symbol",
          description:
            "Perform a safe rename across all references. Returns a WorkspaceEdit preview.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              line: { type: "number" },
              column: { type: "number" },
              newName: { type: "string" },
            },
            required: ["file", "line", "column", "newName"],
          },
        },
        {
          name: "insert_code_block",
          description:
            "Insert a new function/class/method at a specified location.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              afterLine: { type: "number" },
              code: { type: "string" },
              language: { type: "string" },
            },
            required: ["file", "afterLine", "code"],
          },
        },
        {
          name: "replace_code_range",
          description:
            "Replace a specific code range with new code, respecting indentation.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              startLine: { type: "number" },
              endLine: { type: "number" },
              newCode: { type: "string" },
            },
            required: ["file", "startLine", "endLine", "newCode"],
          },
        },
        {
          name: "extract_symbol",
          description:
            "Extract a code block into a new function/method.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              startLine: { type: "number" },
              endLine: { type: "number" },
              newName: { type: "string" },
            },
            required: ["file", "startLine", "endLine", "newName"],
          },
        },
        {
          name: "validate_syntax",
          description:
            "Parse a file or code string and return any syntax errors.",
          inputSchema: {
            type: "object",
            properties: {
              file: { type: "string" },
              code: { type: "string" },
              language: { type: "string" },
            },
          },
        },
      ],
    };
  });

  // ── Handler 2: Execute tools ───────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      // ── Memory tools ───────────────────────────────────────────
      case "query_semantic_index": {
        const query = String(args?.query);
        const results = await semanticSearch(query, 10);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
      case "get_identity_rules": {
        const rules = getIdentityRules();
        return {
          content: [{ type: "text", text: JSON.stringify(rules, null, 2) }],
        };
      }
      case "get_recent_episodes": {
        const limit = Number(args?.limit) || 20;
        const episodes = getRecentEpisodes(limit);
        return {
          content: [{ type: "text", text: JSON.stringify(episodes, null, 2) }],
        };
      }
      case "get_file_context": {
        const file = String(args?.file);
        const context = await getFileContext(file);
        return {
          content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
        };
      }
      case "get_shared_memory": {
        const memory = getSharedMemory();
        return {
          content: [{ type: "text", text: JSON.stringify(memory, null, 2) }],
        };
      }

      // ── AST tools ──────────────────────────────────────────────
      case "get_symbol_at_position": {
        const result = await getSymbolAtPosition(
          String(args?.file),
          Number(args?.line),
          Number(args?.column)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      case "get_caller_hierarchy": {
        const hierarchy = await getCallerHierarchy(
          String(args?.functionName),
          String(args?.filePath)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(hierarchy, null, 2) }],
        };
      }
      case "get_class_hierarchy": {
        const hierarchy = await getClassHierarchy(
          String(args?.file),
          Number(args?.line)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(hierarchy, null, 2) }],
        };
      }
      case "get_file_structure": {
        const structure = await getFileStructure(String(args?.file));
        return {
          content: [{ type: "text", text: JSON.stringify(structure, null, 2) }],
        };
      }
      case "get_references": {
        const refs = await getReferences(
          String(args?.symbolName),
          String(args?.file),
          Number(args?.line)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(refs, null, 2) }],
        };
      }
      case "get_dependencies": {
        const deps = await getDependencies(String(args?.file));
        return {
          content: [{ type: "text", text: JSON.stringify(deps, null, 2) }],
        };
      }
      case "rename_symbol": {
        const edit = await renameSymbol(
          String(args?.file),
          Number(args?.line),
          Number(args?.column),
          String(args?.newName)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(edit, null, 2) }],
        };
      }
      case "insert_code_block": {
        const edit = await insertCodeBlock(
          String(args?.file),
          Number(args?.afterLine),
          String(args?.code),
          args?.language ? String(args.language) : undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(edit, null, 2) }],
        };
      }
      case "replace_code_range": {
        const edit = await replaceCodeRange(
          String(args?.file),
          Number(args?.startLine),
          Number(args?.endLine),
          String(args?.newCode)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(edit, null, 2) }],
        };
      }
      case "extract_symbol": {
        const edit = await extractSymbol(
          String(args?.file),
          Number(args?.startLine),
          Number(args?.endLine),
          String(args?.newName)
        );
        return {
          content: [{ type: "text", text: JSON.stringify(edit, null, 2) }],
        };
      }
      case "validate_syntax": {
        const result = await validateSyntax(
          args?.file ? String(args.file) : undefined,
          args?.code ? String(args.code) : undefined,
          args?.language ? String(args.language) : undefined
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  });
}

/**
 * Cleans up when VS Code shuts down the extension.
 */
export function deactivate() {
  if (mcpServer) {
    mcpServer.close();
  }
}
```

### 3.2 How It Works Under the Hood

1. **Activation**: When VS Code loads the Vizier extension, `activate()` fires, initializes the memory database, starts the Tree-sitter parser engine, and launches an Express server on `localhost:3000`.
2. **External Integration**: Any MCP-compatible client (Claude Code CLI, Cursor, Copilot) connects to `http://localhost:3000/sse`.
3. **Tool Routing**: When an agent calls `get_caller_hierarchy` or `query_semantic_index`, the request hits the `CallToolRequestSchema` handler, which routes it to the corresponding internal function.
4. **VS Code API Access**: Because the MCP server runs inside the Extension Host process, every tool handler has full access to `vscode.workspace`, `vscode.window`, Language Server Commands, and the file system.

### 3.3 Exposing Context (MCP Resources)

```typescript
// Register MCP resources so agents can pull context summaries.
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "vizier://identity",
        name: "Project Identity Rules",
        mimeType: "application/json",
      },
      {
        uri: "vizier://shared-memory",
        name: "Shared Memory Store",
        mimeType: "application/json",
      },
    ],
  };
});
```

### 3.4 MCP Prompts

| Prompt | Description |
|--------|-------------|
| `analyze_file` | Returns a prompt asking the agent to analyze a file using structural tools |
| `refactor_symbol` | Returns a prompt with context for refactoring a specific symbol |
| `explain_hierarchy` | Returns a prompt asking the agent to explain call/class hierarchies |

### MCP Bridge File Map

```
src/core/mcp/
├── server.ts            # MCP server init, Express + SSE setup
├── tool-registry.ts     # Register all tools with Zod schemas
├── resource-registry.ts # Register MCP resources
├── prompt-registry.ts   # Register MCP prompt templates
├── transport-sse.ts     # SSE transport (Express /sse + /messages)
└── session-manager.ts   # Track connected agents, manage lifecycle
```

---

## Phase 4 — UI Integration

### 4.1 Activity Bar & Sidebar

- Reuse the existing Vizier sidebar view container.
- Add new tree data providers:
  - **Memory Browser**: Shows indexed semantic facts grouped by file, with search capability.
  - **AST Explorer**: Shows the structural outline of the active editor, with symbol kinds and ranges.
  - **MCP Connections**: Shows active external agent connections, their tool call history, and connection status.

### 4.2 Status Bar

- Persistent status bar item showing:
  - MCP server status: `$(radio-tower) Vizier: Connected` (green) or `Vizier: Indexing...` (spinner) or `Vizier: Offline` (gray).
  - Click opens the Vizier dashboard webview.
  - Right-click menu: Restart MCP Server, Force Re-index, Open Settings.

### 4.3 Webview Dashboard

- Extend the existing Vizier webview panel with new tabs/views:
  - **Memory Dashboard**: Browse indexed chunks, run semantic search queries, view embedding quality metrics.
  - **AST Viewer**: Visual representation of the AST for the active file, with interactive node selection.
  - **MCP Monitor**: Real-time log of tool invocations from connected agents, with request/response inspection.
  - **Settings**: Configure MCP port, embedding model, memory retention policies, grammar selection.

### 4.4 Commands

| Command | ID | Description |
|---------|----|-------------|
| Vizier: Index Workspace | `vizier.indexWorkspace` | Trigger full workspace indexing |
| Vizier: Rebuild AST Cache | `vizier.rebuildAst` | Rebuild the Tree-sitter AST cache for all open files |
| Vizier: Start MCP Server | `vizier.startMcp` | Start the MCP bridge server |
| Vizier: Stop MCP Server | `vizier.stopMcp` | Stop the MCP bridge server |
| Vizier: Show Dashboard | `vizier.showDashboard` | Open the Vizier webview dashboard |
| Vizier: Search Memory | `vizier.searchMemory` | Quick-pick semantic search from the command palette |
| Vizier: Get Symbol Info | `vizier.symbolInfo` | Show symbol info at the current cursor position |
| Vizier: Open Shared Memory | `vizier.openSharedMemory` | Open shared_memory.json in the editor |

### UI File Map

```
src/ui/
├── sidebar/
│   ├── memory-browser.ts      # TreeDataProvider for memory
│   ├── ast-explorer.ts        # TreeDataProvider for AST
│   └── mcp-connections.ts     # TreeDataProvider for MCP status
├── status-bar.ts              # Status bar item manager
├── commands.ts                # Command registration & handlers
└── webview/
    └── panels/
        ├── memory-dashboard.ts
        ├── ast-viewer.ts
        └── mcp-monitor.ts
```

---

## Phase 5 — Extension Lifecycle & Integration

### 5.1 Activation Sequence

```
activate(context)
  ├── 1. initDatabase(context.globalStorageUri)       // Phase 1
  ├── 2. initIdentityLayer(context)                    // Phase 1 — file watchers start here
  ├── 3. initParserEngine()                            // Phase 2
  ├── 4. buildWorkspaceGraph(workspaceFolders)         // Phase 2
  ├── 5. indexWorkspace(workspaceFolders)              // Phase 1+2
  ├── 6. startMcpServer(app, settings)                 // Phase 3 — Express + SSE
  ├── 7. registerStatusBar()                           // Phase 4
  ├── 8. registerCommands(context)                     // Phase 4
  └── 9. registerSidebarProviders(context)             // Phase 4
```

### 5.2 Workspace Indexing Pipeline

On workspace open (or manual trigger):

1. Find all source files matching configured languages.
2. For each file:
   a. Parse with Tree-sitter → extract semantic chunks + AST.
   b. Store chunks in SQLite (`semantic` layer).
   c. Store raw blocks in SQLite (`verbatim` layer).
   d. Generate embeddings via ONNX model → store in `embeddings` table.
   e. Extract call edges → update workspace graph.
3. Write `shared_memory.json` summary.
4. Update status bar: indexing complete.

### 5.3 Incremental Updates

- On `onDidSaveTextDocument`: re-parse the saved file, diff chunks against previous version, update only changed entries in SQLite.
- On `onDidDeleteFiles`: remove chunks for deleted files.
- On `onDidRenameFiles`: move chunks to new file paths.
- Debounce all updates by 500ms to avoid thrashing during rapid edits.

### 5.4 Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `vizier.mcp.port` | `number` | `3000` | MCP server port |
| `vizier.memory.embeddingModel` | `string` | `"Xenova/all-MiniLM-L6-v2"` | ONNX embedding model |
| `vizier.memory.maxChunks` | `number` | `50000` | Maximum chunks in database |
| `vizier.ast.languages` | `string[]` | `["typescript","javascript","python"]` | Languages to index |
| `vizier.ast.enableIncremental` | `boolean` | `true` | Incremental re-indexing on save |
| `vizier.ui.showStatusBar` | `boolean` | `true` | Show status bar indicator |
| `vizier.identity.watchPatterns` | `string[]` | `["**/v3code.md","**/.clauderc","**/.cursorrules"]` | Identity file patterns |

---

## Dependency Manifest (Additions to package.json)

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "tree-sitter": "^0.22.0",
    "tree-sitter-javascript": "^0.21.0",
    "tree-sitter-typescript": "^0.21.0",
    "tree-sitter-python": "^0.21.0",
    "onnxruntime-node": "^1.18.0",
    "@xenova/transformers": "^2.17.0",
    "proper-lockfile": "^4.1.2",
    "express": "^4.21.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.90.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.21",
    "@types/proper-lockfile": "^4.1.2"
  }
}
```

---

## Execution Order

| Step | Phase | Deliverable | Est. Effort |
|------|-------|-------------|-------------|
| 1 | Phase 1 | SQLite schema + database init | 1 day |
| 2 | Phase 1 | Identity layer (file watchers + auto-sync) | 1 day |
| 3 | Phase 1 | Semantic layer (chunking + ONNX embeddings + sqlite-vec) | 3 days |
| 4 | Phase 1 | Verbatim layer + episodic layer | 1 day |
| 5 | Phase 1 | Shared cross-tool memory (JSON + locking) | 0.5 day |
| 6 | Phase 2 | Tree-sitter parser engine + grammar bundling | 2 days |
| 7 | Phase 2 | 12 AST tools (implementation) | 4 days |
| 8 | Phase 2 | Workspace call graph + incremental updates | 2 days |
| 9 | Phase 3 | MCP server (Express + SSE transport) | 2 days |
| 10 | Phase 3 | Tool + resource + prompt registration | 1 day |
| 11 | Phase 4 | Sidebar tree views (memory, AST, MCP) | 2 days |
| 12 | Phase 4 | Status bar + commands | 0.5 day |
| 13 | Phase 4 | Webview dashboard (memory, AST, MCP monitor) | 2 days |
| 14 | Phase 5 | Lifecycle integration + incremental indexing | 1.5 days |
| 15 | — | Tests + packaging + documentation | 2 days |

**Total estimated effort: ~25 days**

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| `better-sqlite3` native addon fails to build on some platforms | High | Ship prebuilt binaries via `prebuild-install`; provide WASM fallback via `sql.js` |
| Tree-sitter grammar bundling increases VSIX size significantly | Medium | Lazy-load grammars; ship only top 5 languages by default, download others on demand |
| ONNX runtime memory usage in Extension Host | Medium | Run embedding model in a Worker thread; cap concurrent embeddings |
| Express port 3000 already in use | Low | Auto-increment port; surface error in status bar |
| Vector search accuracy with small codebases | Low | Fall back to TF-IDF keyword search when chunk count < 100 |

---

*Generated by Vizier — your royal architect.*
