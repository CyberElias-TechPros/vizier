/**
 * Vizier AST Engine — Tool 6: validate_syntax
 *
 * Walks a Tree-sitter tree collecting ERROR nodes and MISSING tokens.
 * Used standalone (validate a file or a code string) and internally by
 * replace_code_range to pre-validate edits at their seams.
 *
 * Response shape follows the architecture doc tool table:
 *   { valid: boolean, errors: [{ line, column, message }] }
 */

import Parser from "web-tree-sitter";

export interface SyntaxError {
  line: number; // 1-indexed (editor convention)
  column: number; // 0-indexed
  message: string;
}

export interface ValidateSyntaxResult {
  valid: boolean;
  errors: SyntaxError[];
}

/** Report a single node's error into the errors array. */
function reportError(node: Parser.SyntaxNode, message: string, errors: SyntaxError[]): void {
  errors.push({
    line: node.startPosition.row + 1,
    column: node.startPosition.column,
    message
  });
}

/**
 * Depth-first walk collecting parse errors. ERROR nodes indicate the
 * parser could not interpret a region (we do not descend into them —
 * the whole subtree is already covered by that one error). MISSING nodes
 * are tokens Tree-sitter expected but didn't find.
 */
export function collectErrors(root: Parser.SyntaxNode, errors: SyntaxError[]): void {
  if (root.type === "ERROR") {
    reportError(root, `Syntax error near "${root.text.slice(0, 60).replace(/\s+/g, " ")}"`, errors);
    return;
  }

  if (root.isMissing()) {
    reportError(root, `Expected ${root.type}`, errors);
  }

  for (const child of root.namedChildren) {
    collectErrors(child, errors);
  }
}

/** Validate a tree root; returns the doc-shaped result object. */
export function validateSyntax(root: Parser.SyntaxNode): ValidateSyntaxResult {
  const errors: SyntaxError[] = [];
  collectErrors(root, errors);
  return { valid: errors.length === 0, errors };
}