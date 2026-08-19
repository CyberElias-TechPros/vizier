/**
 * Vizier AST Engine — Parser Engine
 *
 * Uses web-tree-sitter (WASM build) + tree-sitter-wasms (prebuilt grammar
 * .wasm files), NOT the native `tree-sitter` npm package + native grammar
 * addons the architecture doc lists. Same reasoning as Phase 1: zero
 * native compilation, works identically on every platform `npm install`
 * works on.
 *
 * IMPORTANT BUILD NOTE: the .wasm grammar files under
 * node_modules/tree-sitter-wasms/out/ are data files, not JS — your
 * bundler (esbuild/webpack) will NOT pick them up automatically. They
 * must be copied into the extension's output directory as part of the
 * build (e.g. an esbuild `copy` plugin or a postbuild script), and
 * `initParserEngine()` below must be given the real on-disk path to
 * that copied directory at runtime.
 */

// NOTE: pinned to web-tree-sitter 0.20.8 + tree-sitter-wasms 0.1.13 —
// these versions were verified against each other (grammar ABI match).
// Bumping either independently can break Language.load() with an
// "Incompatible language version" error; if you bump one, bump/test both.
import Parser from "web-tree-sitter";
import * as path from "path";

export type SupportedLanguage = "javascript" | "typescript" | "python";

const GRAMMAR_FILENAMES: Record<SupportedLanguage, string> = {
  javascript: "tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript.wasm",
  python: "tree-sitter-python.wasm"
};

const LANGUAGE_BY_EXT: Record<string, SupportedLanguage> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python"
};

export function languageForPath(filePath: string): SupportedLanguage | null {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  return LANGUAGE_BY_EXT[ext] || null;
}

let initialized = false;
const loadedLanguages = new Map<SupportedLanguage, Parser.Language>();
let grammarsDir: string | null = null;

export interface CachedTree {
  tree: Parser.Tree;
  language: SupportedLanguage;
  version: number; // bumped on every reparse; callers can use this to detect staleness
  text: string;
}

const astCache = new Map<string, CachedTree>();

/**
 * Initialize the parser engine. Must be called once before parseFile().
 * `wasmGrammarsDir` is the on-disk directory containing the grammar
 * .wasm files (see build note above).
 */
export async function initParserEngine(wasmGrammarsDir: string): Promise<void> {
  if (initialized) return;
  await Parser.init();
  grammarsDir = wasmGrammarsDir;
  initialized = true;
}

async function getLanguage(language: SupportedLanguage): Promise<Parser.Language> {
  const cached = loadedLanguages.get(language);
  if (cached) return cached;

  if (!initialized || !grammarsDir) {
    throw new Error("[Vizier AST] initParserEngine() must be called before parsing.");
  }

  const wasmPath = path.join(grammarsDir, GRAMMAR_FILENAMES[language]);
  const lang = await Parser.Language.load(wasmPath);
  loadedLanguages.set(language, lang);
  return lang;
}

/**
 * Parse a file's text and cache the resulting tree. If the file was
 * already cached, uses Tree-sitter's incremental reparse when possible
 * (falls back to a full reparse — incremental edit tracking is the
 * caller's responsibility if they want true incremental parsing; for
 * Phase 2 we always do a full reparse, which is fast enough for
 * source-file-sized inputs).
 */
export async function parseFile(filePath: string, text: string): Promise<CachedTree> {
  const language = languageForPath(filePath);
  if (!language) {
    throw new Error(`[Vizier AST] Unsupported file type: ${filePath}`);
  }

  const lang = await getLanguage(language);
  const parser = new Parser();
  parser.setLanguage(lang);
  const tree = parser.parse(text);

  const prevVersion = astCache.get(filePath)?.version ?? 0;
  const entry: CachedTree = { tree, language, version: prevVersion + 1, text };
  astCache.set(filePath, entry);
  return entry;
}

/** Parse a raw code string without touching the cache (used by validate_syntax on unsaved code). */
export async function parseSnippet(code: string, language: SupportedLanguage): Promise<Parser.Tree> {
  const lang = await getLanguage(language);
  const parser = new Parser();
  parser.setLanguage(lang);
  return parser.parse(code);
}

export function getCachedTree(filePath: string): CachedTree | undefined {
  return astCache.get(filePath);
}

export function invalidateCache(filePath: string): void {
  astCache.delete(filePath);
}

export function getAllCachedFiles(): string[] {
  return Array.from(astCache.keys());
}

// --- Shared symbol classification, used by every tool below --------------

const DECLARATION_NODE_KINDS: Record<string, string> = {
  // JS/TS
  function_declaration: "function",
  class_declaration: "class",
  method_definition: "method",
  interface_declaration: "interface",
  type_alias_declaration: "type",
  enum_declaration: "enum",
  // Python
  function_definition: "function",
  class_definition: "class"
};

export function declarationKind(node: Parser.SyntaxNode): string | null {
  return DECLARATION_NODE_KINDS[node.type] ?? null;
}

/** Unwrap `export`/`export default` wrappers to get at the real declaration node. */
export function unwrapExport(node: Parser.SyntaxNode): Parser.SyntaxNode {
  if (node.type === "export_statement") {
    const decl = node.childForFieldName("declaration");
    if (decl) return decl;
  }
  return node;
}

export function symbolName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName("name");
  return nameNode ? nameNode.text : null;
}

export interface SimpleRange {
  startLine: number; // 1-indexed, matches editor conventions
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export function nodeRange(node: Parser.SyntaxNode): SimpleRange {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column
  };
}

/** Find the smallest named node whose range contains the given 0-indexed row/column. */
export function nodeAtPosition(root: Parser.SyntaxNode, row: number, column: number): Parser.SyntaxNode | null {
  if (
    row < root.startPosition.row ||
    row > root.endPosition.row ||
    (row === root.startPosition.row && column < root.startPosition.column) ||
    (row === root.endPosition.row && column > root.endPosition.column)
  ) {
    return null;
  }

  for (const child of root.namedChildren) {
    const hit = nodeAtPosition(child, row, column);
    if (hit) return hit;
  }
  return root;
}

/** Walk up from a node to the nearest enclosing declaration (function/class/method/etc). */
export function nearestDeclaration(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  let current: Parser.SyntaxNode | null = node;
  while (current) {
    if (declarationKind(current)) return current;
    current = current.parent;
  }
  return null;
}

/** Extract a leading comment block immediately above a node as its docstring, if present. */
export function leadingDocComment(node: Parser.SyntaxNode, sourceLines: string[]): string | null {
  const startLine = node.startPosition.row; // 0-indexed
  const commentLines: string[] = [];
  let i = startLine - 1;
  while (i >= 0) {
    const line = sourceLines[i].trim();
    if (line === "") { i--; continue; }
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*") || line.startsWith("#")) {
      commentLines.unshift(sourceLines[i]);
      i--;
    } else {
      break;
    }
  }
  return commentLines.length > 0 ? commentLines.join("\n").trim() : null;
}