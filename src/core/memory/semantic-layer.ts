/**
 * Vizier Memory Engine — Semantic Layer
 *
 * Chunks source files into function/class-ish blocks and stores them with
 * a term-frequency vector for semantic search.
 *
 * NOTE ON SCOPE: real structural chunking (accurate function/class
 * boundaries per language) is Phase 2's job via Tree-sitter. This layer
 * uses a deliberately simple, dependency-free brace/indent heuristic so
 * Phase 1 (storage + search + identity + episodic) is fully real and
 * testable now. Swapping in Tree-sitter later only changes chunkFile();
 * storage, vectors, and search stay the same.
 */

import * as crypto from "crypto";
import { run, queryAll } from "./database";
import { storeChunkVector } from "./vector-search";

export interface SemanticChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  symbolName: string | null;
  symbolKind: string | null;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python"
};

export function languageForPath(filePath: string): string | null {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  return LANGUAGE_BY_EXT[ext] || null;
}

// Matches top-level-ish function/class/method declarations for JS/TS/Python.
const JS_TS_DECL = /^\s*(export\s+)?(default\s+)?(async\s+)?(function\s+(\w+)|class\s+(\w+)|(\w+)\s*\([^;{]*\)\s*\{)/;
const JS_TS_METHOD = /^\s*(async\s+)?(?:(get|set)\s+)?(\w+)\s*\([^;{]*\)\s*\{/;
const JS_CONTROL_KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "function", "class"]);
const PY_DECL = /^\s*(class|def)\s+(\w+)/;

/**
 * Split a file's text into semantic chunks using brace/indent heuristics.
 * Deliberately simple and dependency-free; see module docstring.
 */
export function chunkFile(filePath: string, text: string, language: string): SemanticChunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: SemanticChunk[] = [];

  if (language === "python") {
    let i = 0;
    while (i < lines.length) {
      const match = lines[i].match(PY_DECL);
      if (match) {
        const startIndent = lines[i].match(/^\s*/)?.[0].length ?? 0;
        const kind = match[1] === "class" ? "class" : "function";
        const name = match[2];
        let end = i + 1;
        while (end < lines.length) {
          const line = lines[end];
          if (line.trim() === "") { end++; continue; }
          const indent = line.match(/^\s*/)?.[0].length ?? 0;
          if (indent <= startIndent) break;
          end++;
        }
        chunks.push(makeChunk(filePath, i + 1, end, lines.slice(i, end).join("\n"), language, name, kind));
        i = end;
      } else {
        i++;
      }
    }
    return chunks;
  }

  // JS/TS: brace-matching from a declaration line.
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(JS_TS_DECL);
    if (match) {
      const name = match[5] || match[6] || match[7] || "anonymous";
      const kind = match[0].includes("class ") ? "class" : "function";
      let depth = 0;
      let started = false;
      let end = i;
      for (; end < lines.length; end++) {
        for (const ch of lines[end]) {
          if (ch === "{") { depth++; started = true; }
          if (ch === "}") depth--;
        }
        if (started && depth <= 0) { end++; break; }
      }
      end = Math.max(end, i + 1);

      if (kind === "class") {
        // Recurse into the class body for method-level chunks first, so a
        // targeted query (e.g. "charge a credit card") ranks the specific
        // method above the whole-class blob.
        chunks.push(...extractMethods(filePath, lines, i + 1, end - 1, language, name));
      }

      chunks.push(makeChunk(filePath, i + 1, end, lines.slice(i, end).join("\n"), language, name, kind));
      i = end;
    } else {
      i++;
    }
  }
  return chunks;
}

/** Scan lines[start, end) inside a class body for method declarations. */
function extractMethods(
  filePath: string,
  lines: string[],
  start: number,
  end: number,
  language: string,
  className: string
): SemanticChunk[] {
  const methods: SemanticChunk[] = [];
  let i = start;
  while (i < end) {
    const match = lines[i].match(JS_TS_METHOD);
    const firstWord = lines[i].trim().split(/[\s(]/)[0];
    if (match && !JS_CONTROL_KEYWORDS.has(firstWord)) {
      const methodName = match[3];
      let depth = 0;
      let started = false;
      let methodEnd = i;
      for (; methodEnd < end; methodEnd++) {
        for (const ch of lines[methodEnd]) {
          if (ch === "{") { depth++; started = true; }
          if (ch === "}") depth--;
        }
        if (started && depth <= 0) { methodEnd++; break; }
      }
      methodEnd = Math.max(methodEnd, i + 1);
      methods.push(
        makeChunk(
          filePath,
          i + 1,
          methodEnd,
          lines.slice(i, methodEnd).join("\n"),
          language,
          `${className}.${methodName}`,
          "method"
        )
      );
      i = methodEnd;
    } else {
      i++;
    }
  }
  return methods;
}

function makeChunk(
  filePath: string,
  startLine: number,
  endLine: number,
  content: string,
  language: string,
  symbolName: string,
  symbolKind: string
): SemanticChunk {
  const id = crypto
    .createHash("sha1")
    .update(`${filePath}:${startLine}:${endLine}:${symbolName}`)
    .digest("hex")
    .slice(0, 16);
  return { id, filePath, startLine, endLine, content, language, symbolName, symbolKind };
}

/** Replace all stored semantic chunks for a file with freshly parsed ones. */
export function indexFile(filePath: string, text: string): SemanticChunk[] {
  const language = languageForPath(filePath);
  if (!language) return [];

  const chunks = chunkFile(filePath, text, language);

  run(`DELETE FROM chunks WHERE file_path = ? AND layer = 'semantic'`, [filePath]);

  for (const chunk of chunks) {
    run(
      `INSERT INTO chunks (id, layer, file_path, start_line, end_line, content, language, symbol_name, symbol_kind)
       VALUES (?, 'semantic', ?, ?, ?, ?, ?, ?, ?)`,
      [chunk.id, chunk.filePath, chunk.startLine, chunk.endLine, chunk.content, chunk.language, chunk.symbolName, chunk.symbolKind]
    );
    storeChunkVector(chunk.id, `${chunk.symbolName} ${chunk.content}`);
  }

  return chunks;
}

/** Remove all semantic (and verbatim) chunks for a deleted file. */
export function removeFileChunks(filePath: string): void {
  run(`DELETE FROM chunks WHERE file_path = ?`, [filePath]);
}

/** Move chunks from oldPath to newPath (on file rename). */
export function renameFileChunks(oldPath: string, newPath: string): void {
  run(`UPDATE chunks SET file_path = ? WHERE file_path = ?`, [newPath, oldPath]);
}

export function getChunksForFile(filePath: string): SemanticChunk[] {
  return queryAll<any>(
    `SELECT id, file_path as filePath, start_line as startLine, end_line as endLine,
            content, language, symbol_name as symbolName, symbol_kind as symbolKind
     FROM chunks WHERE file_path = ? AND layer = 'semantic' ORDER BY start_line`,
    [filePath]
  );
}
