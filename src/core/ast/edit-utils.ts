/**
 * Vizier AST Engine — Edit Utilities
 *
 * Shared helpers for the structural edit tools (9, 10, 11, 8). These
 * produce plain {file, range, newText} edit objects — the JSON shape
 * the doc's tool table specifies — rather than actual vscode.WorkspaceEdit
 * instances, so this whole module stays testable outside a live VS Code
 * host. The extension-side wiring converts these into a real
 * vscode.WorkspaceEdit and calls vscode.workspace.applyEdit(), per
 * §2.4 of the architecture doc.
 */

import { SimpleRange } from "./parser-engine";

export interface TextEdit {
  file: string;
  range: SimpleRange;
  newText: string;
}

/** Detect the indentation unit used in a file (spaces count, or "\t"). */
export function detectIndentUnit(text: string): string {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^(\t+)\S/);
    if (match) return "\t";
    const spaceMatch = line.match(/^( +)\S/);
    if (spaceMatch) return " ".repeat(spaceMatch[1].length);
  }
  return "  "; // default: 2 spaces
}

/** Get the indentation string (leading whitespace) of the line containing a given 0-indexed row. */
export function indentOfLine(text: string, row: number): string {
  const lines = text.split(/\r?\n/);
  const line = lines[row] ?? "";
  return line.match(/^\s*/)?.[0] ?? "";
}

/** Re-indent a multi-line code block to match a target indentation prefix. */
export function reindent(code: string, targetIndent: string): string {
  const lines = code.split(/\r?\n/);
  // Find the minimum existing indentation among non-blank lines, to normalize first.
  const nonBlank = lines.filter((l) => l.trim() !== "");
  const minIndent = nonBlank.length
    ? Math.min(...nonBlank.map((l) => (l.match(/^\s*/)?.[0].length ?? 0)))
    : 0;

  return lines
    .map((line) => (line.trim() === "" ? "" : targetIndent + line.slice(minIndent)))
    .join("\n");
}

export function makeRange(startLine: number, startColumn: number, endLine: number, endColumn: number): SimpleRange {
  return { startLine, startColumn, endLine, endColumn };
}