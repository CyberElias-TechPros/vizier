/**
 * Vizier AST Engine — Tool 4: get_file_structure
 *
 * Returns the full structural outline of a file: all top-level symbols
 * with their kinds, ranges, and nested children (e.g. methods inside a
 * class).
 */

import Parser from "web-tree-sitter";
import { CachedTree, declarationKind, nodeRange, symbolName, unwrapExport, SimpleRange } from "./parser-engine";

export interface FileStructureSymbol {
  name: string;
  kind: string;
  range: SimpleRange;
  children: FileStructureSymbol[];
}

export interface FileStructureResult {
  file: string;
  symbols: FileStructureSymbol[];
}

export function getFileStructure(filePath: string, cached: CachedTree): FileStructureResult {
  const root = cached.tree.rootNode;
  const symbols: FileStructureSymbol[] = [];

  for (const child of root.namedChildren) {
    const decl = unwrapExport(child);
    const kind = declarationKind(decl);
    if (!kind) continue;

    const name = symbolName(decl) || "(anonymous)";
    symbols.push({
      name,
      kind,
      range: nodeRange(decl),
      children: kind === "class" ? extractClassMembers(decl) : []
    });
  }

  return { file: filePath, symbols };
}

function extractClassMembers(classNode: Parser.SyntaxNode): FileStructureSymbol[] {
  const body = classNode.childForFieldName("body");
  if (!body) return [];

  const members: FileStructureSymbol[] = [];
  for (const child of body.namedChildren) {
    const kind = declarationKind(child) || (child.type === "method_definition" ? "method" : null);
    if (!kind) continue;
    members.push({
      name: symbolName(child) || "(anonymous)",
      kind,
      range: nodeRange(child),
      children: []
    });
  }
  return members;
}