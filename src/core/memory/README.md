# Vizier Phase 1 — Memory Engine

Real, working, verified implementation of the architecture doc's Phase 1
(6-layer memory). Everything here has been type-checked and run against
real data in this session — see "How this was verified" below.

## What's here

```
core/memory/
├── schema.ts            # DDL for chunks, chunk_vectors, identity_rules, episodes
├── database.ts           # sql.js (WASM SQLite) init/persist/query — NO native addon
├── identity-layer.ts     # FileSystemWatcher wiring (needs a real vscode host)
├── identity-queries.ts   # vscode-free read queries, used by shared-memory.ts
├── semantic-layer.ts     # Chunking (functions/classes/methods) + storage
├── verbatim-layer.ts     # Exact text-range storage/retrieval
├── episodic-layer.ts     # Tool-invocation / edit history log
├── vector-search.ts      # Pure-JS TF-IDF + cosine similarity search
└── shared-memory.ts       # Locked shared_memory.json writer for external tools

extension.ts               # Your extension.ts with the memory engine wired
                            # into activate() + 3 new commands
smoke-test.ts               # End-to-end test: schema, chunking, search, persistence
smoke-test-shared.ts        # Concurrent-write + JSON-output test for shared memory
```

## Deviations from the architecture doc, and why

| Doc says | This uses | Why |
|---|---|---|
| `better-sqlite3` (native addon, prebuilt binaries for 3 platforms) | `sql.js` (SQLite compiled to WASM) | You asked to avoid native deps. Zero compilation, zero per-platform binaries, works identically everywhere `npm install` works. |
| `sqlite-vec` (native vector extension) | Pure-JS TF-IDF + cosine similarity in `vector-search.ts` | No native extension needed. The doc's own risk register calls this out as the correct fallback for small/medium codebases. The `semanticSearch()` interface is the seam — swap in a real ANN index later without touching any caller. |
| ONNX embeddings (`onnxruntime-node` / `@xenova/transformers`, `Xenova/all-MiniLM-L6-v2`) | Not implemented yet | Same reasoning — these pull in native/WASM runtime weight for a first pass. `vectorize()` in `vector-search.ts` is the single seam to swap in real embeddings later; nothing else changes. |
| Tree-sitter chunking (Phase 2) | Regex/brace-matching heuristic in `semantic-layer.ts` | You explicitly prioritized Phase 1 over Phase 2. `chunkFile()` is the only function Phase 2's Tree-sitter integration needs to replace — storage, vectors, and search are all already real and don't change. |

Everything else — schema shape, identity-layer file-watching logic, episodic
logging, shared-memory locking, the command set — follows the doc as written.

## How this was verified (not just written)

1. **Full TypeScript type-check**, including the `vscode`-dependent
   `identity-layer.ts`, using real `@types/vscode`. Zero errors.
2. **`smoke-test.ts`** — compiled to JS and run with plain Node against real
   sample TypeScript source: chunks a class + methods + a standalone
   function, verifies re-indexing replaces (doesn't duplicate) chunks,
   runs two different semantic search queries and asserts the *correct*
   chunk ranks first for each, exercises verbatim storage, episodic
   logging, and — critically — **closes the database and reopens it from
   disk**, confirming real persistence rather than in-memory-only state.
3. **`smoke-test-shared.ts`** — fires 3 concurrent `writeSharedMemory()`
   calls and confirms the lock serializes them without corrupting the
   file, then validates the JSON shape.
4. **A real bug was caught and fixed during this process**: the initial
   chunker treated an entire class as one opaque blob, so a method-level
   query ranked the whole class above the specific method that actually
   answered it. Fixed by recursing into class bodies to extract
   method-level chunks (`extractMethods()` in `semantic-layer.ts`),
   re-verified by the smoke test.
5. **A real architecture bug was caught and fixed**: `shared-memory.ts`
   (which should be usable outside a live extension host) transitively
   imported `vscode` just to call `getIdentityRules()`. Split into
   `identity-queries.ts` (no vscode dependency) so shared-memory access
   doesn't require a running VS Code instance.

## How to run the tests yourself

```bash
npm install sql.js proper-lockfile
npm install -D typescript @types/node @types/vscode@1.90.0 @types/sql.js @types/proper-lockfile
npx tsc
node dist/smoke-test.js
node dist/smoke-test-shared.js
```

## Integrating into your project

1. Drop `core/memory/` into your `src/` alongside your existing `core/`.
2. Merge `extension.ts` — it's your existing file with:
   - `initDatabase()` + `initIdentityLayer()` + initial workspace indexing
     added to `activate()` (now `async`)
   - `onDidSaveTextDocument` / `onDidDeleteFiles` / `onDidRenameFiles`
     watchers for incremental re-indexing
   - Three new commands: `vizier.indexWorkspace`, `vizier.searchMemory`,
     `vizier.openSharedMemory`
   - `closeDatabase()` registered via `context.subscriptions`
3. Add to `package.json` dependencies: `sql.js`, `proper-lockfile`.
   Add to devDependencies: `@types/sql.js`, `@types/proper-lockfile`.
4. Add the 3 new commands to your `package.json` `contributes.commands`
   if you want them in the command palette with friendly titles.

## What's deliberately NOT here yet

- Real embeddings (swap into `vectorize()` when ready)
- Tree-sitter structural chunking (swap into `chunkFile()` — this is Phase 2)
- The MCP bridge server / standalone dashboard UI (Phase 3 + UI, next up)
- Sidebar tree views for Memory/AST/MCP (Phase 4)

Say the word when you want to move to the next phase.
