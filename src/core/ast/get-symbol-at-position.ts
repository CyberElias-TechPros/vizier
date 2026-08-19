/**
 * Vizier AST Engine — Tool 1: get_symbol_at_position
 */

import {
  CachedTree,
  nodeAtPosition,
  nearestDeclaration,
  declarationKind,
  symbolName,
  nodeRange,
  leadingDocComment,
  SimpleRange
} from "./parser-engine";

export interface SymbolAtPositionResult {
  found: boolean;
  name?: string;
  kind?: string;
  range?: SimpleRange;
  docstring?: string | null;
  signature?: string;
}

export function getSymbolAtPosition(cached: CachedTree, line: number, column: number): SymbolAtPositionResult {
  const row = line - 1; // caller passes 1-indexed lines (editor convention)
  const leaf = nodeAtPosition(cached.tree.rootNode, row, column);
  if (!leaf) return { found: false };

  const decl = nearestDeclaration(leaf);
  if (!decl) return { found: false };

  const kind = declarationKind(decl)!;
  const name = symbolName(decl) || "(anonymous)";
  const sourceLines = cached.text.split(/\r?\n/);
  const docstring = leadingDocComment(decl, sourceLines);

  // Signature = the source text from the declaration's start up to (not
  // including) the body's opening brace, using exact node byte offsets —
  // NOT a colon-split, which breaks on TS parameter type annotations
  // like `chargeCard(userId: string)`.
  const bodyNode = decl.childForFieldName("body");
  const sigEnd = bodyNode ? bodyNode.startIndex : decl.endIndex;
  const signature = cached.text.slice(decl.startIndex, sigEnd).trim();

  return {
    found: true,
    name,
    kind,
    range: nodeRange(decl),
    docstring,
    signature
  };
}