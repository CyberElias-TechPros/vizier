/**
 * Vizier UI — Memory Browser (sidebar tree)
 *
 * Phase 4 §4.1: indexed semantic chunks grouped by file, with a search
 * input that runs a semantic query against the memory engine.
 */

import * as vscode from "vscode";
import { queryAll } from "../../core/memory/database";
import { semanticSearch } from "../../core/memory/vector-search";
import type { SemanticSearchResult } from "../../core/memory/vector-search";

interface MemoryTreeItem {
  id: string;
  label: string;
  description: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  children: MemoryTreeItem[];
}

export class MemoryBrowserProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<MemoryTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

  private searchQuery: string | null = null;

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  setSearch(query: string): void {
    this.searchQuery = query.trim() ? query.trim() : null;
    this.onDidChangeEmitter.fire();
  }

  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.id = element.id;
    treeItem.description = element.description;
    treeItem.tooltip = element.filePath
      ? `${element.filePath}:${element.startLine}-${element.endLine}`
      : element.label;
    if (element.children.length > 0) {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
    if (element.filePath) {
      treeItem.command = {
        command: "vscode.open",
        arguments: [
          vscode.Uri.file(element.filePath),
          { selection: new vscode.Range(element.startLine! - 1, 0, element.endLine! - 1, 0) }
        ],
        title: "Open"
      };
    }
    return treeItem;
  }

  getChildren(element?: MemoryTreeItem): MemoryTreeItem[] {
    if (!element) {
      if (this.searchQuery) {
        return this.searchNodes();
      }
      return this.groupedNodes();
    }
    return element.children;
  }

  private groupedNodes(): MemoryTreeItem[] {
    const rows = queryAll<{
      file_path: string;
      symbol_name: string;
      symbol_kind: string;
      start_line: number;
      end_line: number;
      chunk_text: string;
    }>(
      "SELECT file_path, symbol_name, symbol_kind, start_line, end_line, chunk_text FROM semantic_chunks ORDER BY file_path, start_line"
    );

    const byFile = new Map<string, MemoryTreeItem>();
    for (const row of rows) {
      let fileNode = byFile.get(row.file_path);
      if (!fileNode) {
        fileNode = {
          id: `file:${row.file_path}`,
          label: row.file_path.split(/[\\/]/).pop() ?? row.file_path,
          description: row.file_path,
          children: []
        };
        byFile.set(row.file_path, fileNode);
      }
      fileNode.children.push({
        id: `chunk:${row.file_path}:${row.start_line}`,
        label: row.symbol_name ?? "(chunk)",
        description: `${row.symbol_kind ?? "chunk"} · L${row.start_line}-${row.end_line}`,
        filePath: row.file_path,
        startLine: row.start_line,
        endLine: row.end_line,
        children: []
      });
    }
    return Array.from(byFile.values());
  }

  private searchNodes(): MemoryTreeItem[] {
    const results: SemanticSearchResult[] = semanticSearch(this.searchQuery ?? "", 25);
    return [
      {
        id: "search-summary",
        label: `${results.length} result(s) for "${this.searchQuery}"`,
        description: "semantic search",
        children: results.map((r) => ({
          id: `search:${r.file_path}:${r.start_line}`,
          label: r.symbol_name ?? "(chunk)",
          description: `${r.symbol_kind ?? "chunk"} · score ${r.score.toFixed(3)}`,
          filePath: r.file_path,
          startLine: r.start_line,
          endLine: r.end_line,
          children: []
        }))
      }
    ];
  }
}

export function registerMemoryBrowser(context: vscode.ExtensionContext): MemoryBrowserProvider {
  const provider = new MemoryBrowserProvider();
  const treeView = vscode.window.createTreeView("vizier.memoryBrowser", { treeDataProvider: provider });
  context.subscriptions.push(treeView);

  const searchCommand = vscode.commands.registerCommand("vizier.memoryBrowser.search", async () => {
    const query = await vscode.window.showInputBox({
      prompt: "Search Vizier's semantic memory",
      placeHolder: "e.g., where do we handle user authentication?"
    });
    if (query !== undefined) provider.setSearch(query);
  });

  context.subscriptions.push(searchCommand);
  return provider;
}
