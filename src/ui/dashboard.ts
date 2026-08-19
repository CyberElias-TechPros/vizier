/**
 * Vizier UI — Dashboard (webview panel)
 *
 * Phase 4 §4.3: a dedicated webview panel opened by `vizier.showDashboard`
 * with four tabs (Memory, AST, MCP Monitor, Settings). Data flows over the
 * standard postMessage protocol; the panel polls MCP snapshots while open.
 */

import * as vscode from "vscode";
import { semanticSearch } from "../core/memory/vector-search";
import { getCachedTree, parseFile } from "../core/ast/parser-engine";
import { getFileStructure } from "../core/ast/get-file-structure";
import { getRecentEpisodes } from "../core/memory/episodic-layer";
import { vizierSettingDefinitions } from "../settings";
import type { SessionManager } from "../core/mcp/session-manager";

export interface DashboardServices {
  sessions: () => SessionManager | null;
  mcpRunning: () => boolean;
  mcpPort: () => number | undefined;
  parsedFileCount: () => number;
}

let activePanel: vscode.WebviewPanel | undefined;

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function getVizierSettings(): Promise<Record<string, any>> {
  const config = vscode.workspace.getConfiguration("vizier");
  const settings: Record<string, any> = {};
  for (const def of vizierSettingDefinitions) {
    const key = def.key.replace(/^vizier\./, "");
    settings[def.key] = config.get(key, def.defaultValue);
  }
  return settings;
}

export function showDashboard(extensionUri: vscode.Uri, services: DashboardServices): void {
  if (activePanel) {
    activePanel.reveal(vscode.ViewColumn.One);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "vizier.dashboard",
    "Vizier Dashboard",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")]
    }
  );
  activePanel = panel;

  panel.webview.html = buildHtml(panel.webview, extensionUri);
  pushSnapshot(panel, services);

  const mcpTimer = setInterval(() => pushMcpSnapshot(panel, services), 2000);
  panel.onDidDispose(() => {
    clearInterval(mcpTimer);
    if (activePanel === panel) activePanel = undefined;
  });

  panel.webview.onDidReceiveMessage(async (message) => {
    try {
      switch (message.type) {
        case "DASHBOARD_READY":
          await pushInitial(panel, services);
          break;
        case "MEMORY_QUERY": {
          const { query, topK } = message.payload ?? {};
          const results = semanticSearch(String(query ?? ""), Number(topK) || 10);
          panel.webview.postMessage({
            type: "MEMORY_QUERY_RESULT",
            payload: { query, results, episodes: getRecentEpisodes(10) }
          });
          break;
        }
        case "AST_REFRESH": {
          const editor = vscode.window.activeTextEditor;
          if (!editor || !editor.document.uri.scheme.startsWith("file")) {
            panel.webview.postMessage({ type: "AST_STRUCTURE_RESULT", payload: { file: null, symbols: [] } });
            break;
          }
          const filePath = editor.document.uri.fsPath;
          let cached = getCachedTree(filePath);
          if (!cached) cached = await parseFile(filePath, editor.document.getText());
          const structure = getFileStructure(filePath, cached);
          panel.webview.postMessage({ type: "AST_STRUCTURE_RESULT", payload: structure });
          break;
        }
        case "MCP_SNAPSHOT_REQUEST":
          pushMcpSnapshot(panel, services);
          break;
        case "GET_SETTINGS":
          panel.webview.postMessage({
            type: "SETTINGS_STATE",
            payload: { settings: await getVizierSettings(), definitions: vizierSettingDefinitions }
          });
          break;
        case "UPDATE_SETTING": {
          const { key, value } = message.payload ?? {};
          if (!key || typeof key !== "string") break;
          const configKey = key.replace(/^vizier\./, "");
          await vscode.workspace.getConfiguration("vizier").update(configKey, value, vscode.ConfigurationTarget.Global);
          panel.webview.postMessage({
            type: "SETTINGS_STATE",
            payload: { settings: await getVizierSettings(), definitions: vizierSettingDefinitions }
          });
          break;
        }
        default:
          console.warn(`[Vizier] Unknown dashboard message: ${message.type}`);
      }
    } catch (error) {
      panel.webview.postMessage({
        type: "ERROR",
        payload: { code: "DASHBOARD", message: error instanceof Error ? error.message : String(error) }
      });
    }
  });
}

function pushInitial(panel: vscode.WebviewPanel, services: DashboardServices): void {
  pushSnapshot(panel, services);
  panel.webview.postMessage({
    type: "AST_REFRESH_REQUEST",
    payload: {}
  });
}

function pushSnapshot(panel: vscode.WebviewPanel, services: DashboardServices): void {
  const manager = services.sessions();
  panel.webview.postMessage({
    type: "DASHBOARD_STATE",
    payload: {
      mcp: {
        running: services.mcpRunning(),
        port: services.mcpPort() ?? null,
        sessions: manager ? manager.list() : [],
        log: manager ? manager.getLog(100) : []
      },
      parsedFiles: services.parsedFileCount()
    }
  });
}

function pushMcpSnapshot(panel: vscode.WebviewPanel, services: DashboardServices): void {
  pushSnapshot(panel, services);
}

function buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const webviewUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "dashboard.js")
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vizier Dashboard</title>
  <style>
    body { margin: 0; padding: 0; }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${webviewUri}"></script>
</body>
</html>`;
}