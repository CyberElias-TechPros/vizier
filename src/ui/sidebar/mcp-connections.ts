/**
 * Vizier UI — MCP Connections (sidebar tree)
 *
 * Phase 4 §4.1: active external agent connections, tool call counts,
 * and recent tool-call history from the bridge's SessionManager.
 */

import * as vscode from "vscode";
import type { SessionManager, McpSessionInfo, McpLogEntry } from "../../core/mcp/session-manager";

interface McpNode {
  id: string;
  label: string;
  description?: string;
  children: McpNode[];
}

export class McpConnectionsProvider implements vscode.TreeDataProvider<McpNode> {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<McpNode | undefined | void>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

  constructor(private readonly sessions: () => SessionManager | null) {}

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  getTreeItem(element: McpNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label);
    treeItem.id = element.id;
    treeItem.description = element.description;
    if (element.children.length > 0) {
      treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
    return treeItem;
  }

  getChildren(element?: McpNode): McpNode[] {
    if (!element) return this.sessionNodes();
    return element.children;
  }

  private sessionNodes(): McpNode[] {
    const manager = this.sessions();
    if (!manager) {
      return [{ id: "offline", label: "MCP bridge offline", children: [] }];
    }

    const sessions: McpSessionInfo[] = manager.list();
    const nodes: McpNode[] = sessions.map((s) => ({
      id: `session:${s.id}`,
      label: s.id,
      description: `${s.toolCalls} tool call(s) · connected ${new Date(s.connectedAt).toLocaleTimeString()}`,
      children: []
    }));

    const log: McpLogEntry[] = manager.getLog(10);
    if (log.length > 0) {
      nodes.push({
        id: "recent-calls",
        label: `Recent tool calls (last ${log.length})`,
        children: log.map((entry, i) => ({
          id: `log:${i}:${entry.at}`,
          label: entry.ok ? `$(check) ${entry.tool}` : `$(error) ${entry.tool}`,
          description: entry.ok ? "" : entry.message.slice(0, 60),
          children: []
        }))
      });
    }

    if (nodes.length === 0) {
      nodes.push({ id: "idle", label: "No clients connected", children: [] });
    }
    return nodes;
  }
}

export function registerMcpConnections(
  context: vscode.ExtensionContext,
  sessions: () => SessionManager | null
): McpConnectionsProvider {
  const provider = new McpConnectionsProvider(sessions);
  const treeView = vscode.window.createTreeView("vizier.mcpConnections", { treeDataProvider: provider });
  context.subscriptions.push(treeView);

  const refreshTimer = setInterval(() => provider.refresh(), 5000);
  context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });

  return provider;
}