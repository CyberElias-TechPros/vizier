/**
 * Vizier AST Engine — Tool 8: rename_symbol
 *
 * Produces a safe rename across all references to a symbol. Returns a
 * WorkspaceEdit-style preview ({edits, affectedFiles}) WITHOUT applying
 * it — the extension layer applies it via vscode.workspace.applyEdit()
 * after the user confirms.
 *
 * Scoping is structural: every identifier/property/type-identifier node
 * whose text matches the symbol name is rewritten, excluding the
 * declaration site's own name node. String/comment occurrences are
 * excluded automatically (they aren't identifier nodes).
 */

import { CachedTree, nearestDeclaration, symbolName, nodeRange } from "./parser-engine";
import { isIdentifierNode, walkNamed } from "./workspace-graph";
import { TextEdit, makeRange } from "./edit-utils";

export interface RenameResult {
  symbolName: string;
  newName: string;
  edits: TextEdit[];
  affectedFiles: string[];
  occurrences: number;
}

function isDeclarationName(node: any): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (!["function_declaration", "method_definition", "class_declaration", "function_definition", "class_definition", "interface_declaration", "type_alias_declaration", "enum_declaration", "variable_declarator"].includes(parent.type)) {
    return false;
  }
  return node === parent.childForFieldName("name") || node === parent.childForFieldName("type");
}

export function renameSymbol(
  filePath: string,
  cached: CachedTree,
  line: number,
  column: number,
  newName: string
): RenameResult {
  const row = line - 1;
  const lines = cached.text.split(/\r?\n/);
  const edits: TextEdit[] = [];

  // Locate the declaration whose name we're renaming.
  const leaf = findLeafAt(cached.tree.rootNode, row, column);
  const decl = leaf ? nearestDeclaration(leaf) : null;
  const targetName = decl ? symbolName(decl) : null;
  if (!targetName || !decl) {
    return { symbolName: "", newName, edits, affectedFiles: [], occurrences: 0 };
  }

  const declNameNode = decl.childForFieldName("name") ?? decl.childForFieldName("type");

  walkNamed(cached.tree.rootNode, (node) => {
    if (!isIdentifierNode(node)) return;
    if (node.text !== targetName) return;
    if (declNameNode && node.startIndex === declNameNode.startIndex && node.endIndex === declNameNode.endIndex) {
      return; // the declaration's own name node
    }
    if (isDeclarationName(node)) return;

    const startLine = node.startPosition.row + 1;
    const startColumn = node.startPosition.column;
    const endColumn = startColumn + targetName.length;
    edits.push({
      file: filePath,
      range: makeRange(startLine, startColumn, startLine, endColumn),
      newText: newName
    });
  });

  // Sort edits from bottom of file to top so the extension can apply them
  // without invalidating earlier ranges.
  edits.sort((a, b) => b.range.startLine - a.range.startLine || b.range.startColumn - a.range.startColumn);

  return {
    symbolName: targetName,
    newName,
    edits,
    affectedFiles: [filePath],
    occurrences: edits.length
  };
}

function findLeafAt(root: any, row: number, column: number): any {
  const stack: any[] = [root];
  let best: any = null;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (
      node.startPosition.row <= row &&
      node.endPosition.row >= row &&
      (node.startPosition.row < row || node.startPosition.column <= column) &&
      (node.endPosition.row > row || node.endPosition.column >= column)
    ) {
      if (!best || node.endPosition.row - node.startPosition.row < best.endPosition.row - best.startPosition.row) {
        best = node;
      }
      stack.push(...node.namedChildren);
    }
  }
  return best;
}