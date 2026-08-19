/**
 * Vizier AST Engine — Tool 11: extract_symbol
 *
 * Extracts a range of code into a new function and returns the complete
 * refactoring as a pair of edits:
 *
 *   - `edit`           replaces the extracted range with a call to the
 *                      new function
 *   - `usagesUpdated`  contains the insertion of the new function right
 *                      after the enclosing declaration (or at end of
 *                      file). BOTH must be applied for the refactor to
 *                      be complete.
 *
 * Parameter discovery is heuristic: identifiers used inside the block
 * that are NOT declared inside it and are not keywords/globals become the
 * new function's parameters. This is approximate (no flow analysis);
 * review the returned edits before applying.
 */

import { CachedTree, nodeAtPosition, nearestDeclaration, parseSnippet } from "./parser-engine";
import { indentOfLine, reindent, makeRange, TextEdit } from "./edit-utils";
import { SyntaxError, collectErrors } from "./validate-syntax";

export interface ExtractSymbolResult {
  edit: TextEdit; // replaces the extracted range with a call
  usagesUpdated: TextEdit[]; // insertion of the new function (apply with `edit`)
  params: string[];
  parseErrors: SyntaxError[];
}

const RESERVED = new Set([
  "if", "else", "for", "while", "switch", "case", "break", "continue", "return",
  "function", "const", "let", "var", "class", "new", "this", "super", "import",
  "export", "from", "default", "await", "async", "try", "catch", "finally",
  "throw", "typeof", "instanceof", "in", "of", "void", "delete", "yield",
  "true", "false", "null", "undefined", "def", "lambda", "pass", "None", "not",
  "and", "or", "is", "with", "as", "assert", "raise", "except", "global", "nonlocal"
]);

export async function extractSymbol(
  filePath: string,
  cached: CachedTree,
  startLine: number,
  endLine: number,
  newName: string
): Promise<ExtractSymbolResult> {
  const lines = cached.text.split(/\r?\n/);
  const block = lines.slice(startLine - 1, endLine).join("\n");

  const outerIndent = indentOfLine(cached.text, startLine - 1);
  const params = discoverParams(block, newName);

  // Call edit: replace the extracted range with a call to the new function.
  const call = `${newName}(${params.join(", ")})`;
  const edit: TextEdit = {
    file: filePath,
    range: makeRange(startLine, 0, endLine, (lines[endLine - 1] ?? "").length),
    newText: reindent(call, outerIndent)
  };

  // New-function edit: insert after the enclosing declaration (or EOF).
  const leaf = nodeAtPosition(cached.tree.rootNode, startLine - 1, 0);
  const enclosing = leaf ? nearestDeclaration(leaf) : null;
  const enclosingIndent = enclosing ? indentOfLine(cached.text, enclosing.startPosition.row) : "";
  const bodyIndent = enclosingIndent + "  ";
  const newFunction = `${enclosingIndent}function ${newName}(${params.join(", ")}) {\n${reindent(block, bodyIndent)}\n${enclosingIndent}}`;

  const insertAfterLine = enclosing ? enclosing.endPosition.row + 1 : lines.length; // 1-indexed
  const atEof = insertAfterLine >= lines.length;
  const usagesUpdated: TextEdit[] = [
    {
      file: filePath,
      range: makeRange(insertAfterLine + 1, 0, insertAfterLine + 1, 0),
      newText: atEof ? `\n${newFunction}\n` : `${newFunction}\n`
    }
  ];

  // Validate: the function alone must parse, and the file with the call
  // substitution must parse.
  const parseErrors: SyntaxError[] = [];
  try {
    const fnTree = await parseSnippet(newFunction, cached.language);
    collectErrors(fnTree.rootNode, parseErrors);
  } catch (err) {
    parseErrors.push({ line: startLine, column: 0, message: `Failed to parse extracted function: ${err}` });
  }

  const spliced = [...lines.slice(0, startLine - 1), call, ...lines.slice(endLine)].join("\n");
  const fileTree = await parseSnippet(spliced, cached.language);
  collectErrors(fileTree.rootNode, parseErrors);

  return { edit, usagesUpdated, params, parseErrors };
}

function detectInnerIndent(block: string): string {
  const nonBlank = block.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (nonBlank.length === 0) return "  ";
  const indent = nonBlank[0].match(/^\s*/)?.[0] ?? "";
  return indent || "  ";
}

function discoverParams(block: string, functionName: string): string[] {
  const declared = new Set<string>();
  const used = new Set<string>();

  const tokens = block.match(/[A-Za-z_$][\w$]*/g) ?? [];
  const declarations = block.match(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g) ?? [];
  const fnParams = block.match(/function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/) ?? [];

  for (const d of declarations) {
    declared.add(d.replace(/^(?:const|let|var|function|class)\s+/, ""));
  }
  for (const p of fnParams) {
    for (const n of p.split(",")) {
      const name = n.trim().split(/[:=]/)[0].replace(/^\*+/, "");
      if (name) declared.add(name);
    }
  }

  for (const token of tokens) {
    if (RESERVED.has(token)) continue;
    if (token === functionName) continue;
    if (declared.has(token)) continue;
    used.add(token);
  }

  return Array.from(used).sort();
}