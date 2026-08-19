/**
 * Vizier AST Engine — Tool 5: get_references
 *
 * Finds all references to a symbol name across the workspace by walking
 * the cached parse trees for matching identifier nodes (identifier,
 * property_identifier, type_identifier, attribute). String/comment
 * occurrences are automatically excluded because those aren't identifier
 * nodes in the tree.
 */

import { CachedTree } from "./parser-engine";
import { isIdentifierNode, walkNamed } from "./workspace-graph";

export interface Reference {
  file: string;
  line: number; // 1-indexed
  column: number; // 0-indexed
  context: string; // the full source line, trimmed
}

export interface ReferencesResult {
  symbolName: string;
  references: Reference[];
  occurrences: number;
}

export function getReferences(
  symbolName: string,
  files: Map<string, CachedTree>,
  options: { includeDeclaration?: boolean } = {}
): ReferencesResult {
  const references: Reference[] = [];
  const includeDeclaration = options.includeDeclaration ?? false;

  for (const [file, cached] of files) {
    const lines = cached.text.split(/\r?\n/);
    walkNamed(cached.tree.rootNode, (node) => {
      if (!isIdentifierNode(node)) return;
      if (node.text !== symbolName) return;

      if (!includeDeclaration && node.parent && node.parent.type === "function_declaration" && node === node.parent.childForFieldName("name")) {
        return; // skip the declaration site itself
      }
      if (!includeDeclaration && node.parent && node.parent.type === "method_definition" && node === node.parent.childForFieldName("name")) {
        return;
      }
      if (!includeDeclaration && node.parent && node.parent.type === "class_declaration" && node === node.parent.childForFieldName("name")) {
        return;
      }
      if (!includeDeclaration && node.parent && node.parent.type === "function_definition" && node === node.parent.childForFieldName("name")) {
        return;
      }

      // web-tree-sitter returns a fresh wrapper per access, so compare byte
      // indices, not object identity.
      const parentName = node.parent ? node.parent.childForFieldName("name") : null;
      if (!includeDeclaration && parentName &&
          node.startIndex === parentName.startIndex && node.endIndex === parentName.endIndex) {
        return;
      }

      const line = node.startPosition.row + 1;
      references.push({
        file,
        line,
        column: node.startPosition.column,
        context: (lines[node.startPosition.row] ?? "").trim()
      });
    });
  }

  references.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
  return { symbolName, references, occurrences: references.length };
}