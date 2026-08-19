/**
 * Vizier build step — copy Tree-sitter WASM data files into dist/wasm/.
 *
 * esbuild bundles JS only; the .wasm grammar files under
 * node_modules/tree-sitter-wasms/out and web-tree-sitter's runtime
 * (tree-sitter.wasm) are data files and must be copied as-is. The
 * extension reads them from `path.join(__dirname, "wasm")` at runtime.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "dist", "wasm");

const SOURCES = [
  ["tree-sitter-wasms", "out/tree-sitter-javascript.wasm"],
  ["tree-sitter-wasms", "out/tree-sitter-typescript.wasm"],
  ["tree-sitter-wasms", "out/tree-sitter-python.wasm"],
  ["web-tree-sitter", "tree-sitter.wasm"]
];

fs.mkdirSync(outDir, { recursive: true });

let missing = false;
for (const [pkg, rel] of SOURCES) {
  const src = path.join(root, "node_modules", pkg, rel);
  if (!fs.existsSync(src)) {
    console.error(`[copy-wasm] MISSING ${src}`);
    missing = true;
    continue;
  }
  const dest = path.join(outDir, path.basename(rel));
  fs.copyFileSync(src, dest);
  console.log(`[copy-wasm] ${path.basename(rel)} (${fs.statSync(dest).size} bytes) -> dist/wasm/`);
}

if (missing) {
  process.exit(1);
}

console.log("[copy-wasm] done.");