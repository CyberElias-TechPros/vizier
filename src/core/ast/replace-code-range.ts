/**
 * Vizier AST Engine — Tool 10: replace_code_range
 */

import { CachedTree, SupportedLanguage, parseSnippet } from "./parser-engine";
import { detectIndentUnit, indentOfLine, reindent, makeRange, TextEdit } from "./edit-utils";
import { SyntaxError, collectErrors } from "./validate-syntax";

export interface ReplaceCodeRangeResult {
  edit: TextEdit;
  parseErrors: SyntaxError[];
}

export async function replaceCodeRange(
  filePath: string,
  cached: CachedTree,
  startLine: number,
  endLine: number,
  newCode: string
): Promise<ReplaceCodeRangeResult> {
  const targetIndent = indentOfLine(cached.text, startLine - 1);
  const indented = reindent(newCode, targetIndent);

  const lines = cached.text.split(/\r?\n/);
  const endColumn = (lines[endLine - 1] ?? "").length;

  const edit: TextEdit = {
    file: filePath,
    range: makeRange(startLine, 0, endLine, endColumn),
    newText: indented
  };

  const parseErrors = await validateReplacement(cached, startLine, endLine, indented);
  return { edit, parseErrors };
}

/**
 * Validate the edit by splicing it into the full file text and reparsing —
 * this catches errors the new code introduces at its seams (e.g. an
 * unclosed brace) that validating the snippet alone would miss.
 */
async function validateReplacement(
  cached: CachedTree,
  startLine: number,
  endLine: number,
  newText: string
): Promise<SyntaxError[]> {
  const lines = cached.text.split(/\r?\n/);
  const before = lines.slice(0, startLine - 1);
  const after = lines.slice(endLine);
  const spliced = [...before, newText, ...after].join("\n");

  const tree = await parseSnippet(spliced, cached.language);
  const errors: SyntaxError[] = [];
  collectErrors(tree.rootNode, errors);
  return errors;
}