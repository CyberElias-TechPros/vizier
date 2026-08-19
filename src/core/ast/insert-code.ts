/**
 * Vizier AST Engine — Tool 9: insert_code_block
 *
 * Inserts a new function/class/method after a specified line. Returns an
 * edit preview + any parse errors the inserted code would introduce at
 * its seams (validated by splicing into the file and reparsing).
 */

import { CachedTree, parseSnippet } from "./parser-engine";
import { indentOfLine, reindent, makeRange, TextEdit } from "./edit-utils";
import { SyntaxError, collectErrors } from "./validate-syntax";

export interface InsertCodeBlockResult {
  edit: TextEdit;
  parseErrors: SyntaxError[];
}

export async function insertCodeBlock(
  filePath: string,
  cached: CachedTree,
  afterLine: number,
  code: string
): Promise<InsertCodeBlockResult> {
  const lines = cached.text.split(/\r?\n/);

  const targetIndent = indentOfLine(cached.text, Math.max(0, afterLine - 1));
  const indented = reindent(code, targetIndent);

  // Insert at the start of the line following `afterLine` (or append at EOF).
  const isLastLine = afterLine >= lines.length;
  const insertRow = isLastLine ? lines.length : afterLine;
  const range = makeRange(insertRow + 1, 0, insertRow + 1, 0);
  const newText = isLastLine ? `${lines.length > 0 ? "\n" : ""}${indented}` : `${indented}\n`;

  const edit: TextEdit = { file: filePath, range, newText };

  // Validate by splicing the insertion into the full file text.
  const before = lines.slice(0, insertRow);
  const after = lines.slice(insertRow);
  const spliced = [...before, indented, ...after].join("\n");

  const tree = await parseSnippet(spliced, cached.language);
  const parseErrors: SyntaxError[] = [];
  collectErrors(tree.rootNode, parseErrors);

  return { edit, parseErrors };
}