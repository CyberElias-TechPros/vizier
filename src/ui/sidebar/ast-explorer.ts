/**
 * Vizier UI — AST Explorer (sidebar tree)
 *
 * Phase 4 §4.1: structural outline of the active editor, refreshed on
 * editor change and document save.
 */

import * as vscode from "vscode";
import { getCachedTree, parseFile } from "../../core/ast/parser-engine";
import { getFileStructure } from "../../core/ast/get-file-structure";
import type { FileStructureSymbol } from "../../core/ast/get-file-structure";

export interface AstNode {
  id: string;
  label: string;
  description: string;
  filePath: string;
  startLine: number;
  endLine: number;
  children: AstNode[];
}

export class AstExplorerProvider implements vscode.TreeDataProvider<AstNode> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<AstNode | undefined | void>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

  private nodes: AstNode[] = [];

  async refresh(editor?: vscode.TextEditor): Promise<void> {
    const target = editor ?? vscode.window.activeTextEditor;
    if (!target || !target.document.uri.scheme.startsWith("file")) {
      this.nodes = [];
      this.onDidChangeEmitter.fire();
      return;
    }
    try {
      let cached = getCachedTree(target.document.uri.fsPath);
      if (!cached) cached = await parseFile(target.document.uri.fsPath, target.document.getText());
      const structure = getFileStructure(target.document.uri.fsPath, cached);
      this.nodes = this.toNodes(target.document.uri.fsPath, structure.symbols, "root");
      this.onDidChangeEmitter.fire();
    } catch {
      this.nodes = [];
      this.onDidChangeEmitter.fire();
    }
  }

  getTreeItem(element: AstNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.id = element.id;
    treeItem.description = element.description;
    treeItem.tooltip = `${element.filePath}:${element.startLine}-${element.endLine}`;
    if (element.children.length > 0) {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
    treeItem.command = {
      command: "vscode.open",
      arguments: [
        vscode.Uri.file(element.filePath),
        { selection: new vscode.Range(element.startLine - 1, 0, element.endLine - 1, 0) }
      ],
      title: "Open"
    };
    return treeItem;
  }

  getChildren(element?: AstNode): AstNode[] {
    if (!element) return this.nodes;
    return element.children;
  }

private toNodes(filePath: string, symbols: FileStructureSymbol[], parentId: string): AstNode[] {
    return symbols.map((s) => ({
      id: `${parentId}:${s.kind}:${s.name}:${s.range.startLine}`,
      label: `${s.name} ${s.kind === "function" || s.kind === "method" ? "()" : ""}`,
      description: `${s.kind} · L${s.range.startLine}-${s.range.endLine}`,
      filePath,
      startLine: s.range.startLine,
      endLine: s.range.endLine,
      children: this.toNodes(filePath, s.children, `${parentId}:${s.kind}:${s.name}`)
    }));
  }
}

export function registerAstExplorer(context: vscode.ExtensionContext): AstExplorerProvider {
  const provider = new AstExplorerProvider();

  const treeView = vscode.window.createTreeView("vizier.astExplorer", { treeDataProvider: provider });
  context.subscriptions.push(treeView);

  const refreshCommand = vscode.commands.registerCommand("vizier.astExplorer.refresh", () =>
    provider.refresh()
  );
  context.subscriptions.push(refreshCommand);

  const onEditor = vscode.window.onDidChangeActiveTextEditor(() => void provider.refresh());
  const onSave = vscode.workspace.onDidSaveTextDocument(() => void provider.refresh());
  context.subscriptions.push(onEditor, onSave);

  void provider.refresh();
  return provider;
}
