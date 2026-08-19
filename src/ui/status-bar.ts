/**
 * Vizier UI — Unified Status Bar
 *
 * Phase 4 §4.2: one persistent status bar item reflecting the combined
 * state of the memory engine, AST engine, and MCP bridge.
 *   - Click: open the Vizier dashboard.
 *   - Right-click: Restart MCP Server / Force Re-index / Open Settings.
 */

import * as vscode from "vscode";

export type VizierEngineState = "offline" | "indexing" | "ready" | "error";

export interface VizierStatusState {
  memory: VizierEngineState;
  ast: VizierEngineState;
  mcp: "offline" | "running" | "error";
  parsedFiles?: number;
  mcpPort?: number;
}

export class VizierStatusBar {
  private readonly item: vscode.StatusBarItem;
  private state: VizierStatusState = { memory: "offline", ast: "offline", mcp: "offline" };

  constructor(
    private readonly onOpenDashboard: () => void,
    private readonly onRestartMcp: () => void,
    private readonly onReindex: () => void
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = "vizier.showDashboard";
    this.item.show();
    this.render();
  }

  update(patch: Partial<VizierStatusState>): void {
    this.state = { ...this.state, ...patch };
    this.render();
  }

  getState(): VizierStatusState {
    return { ...this.state };
  }

  dispose(): void {
    this.item.dispose();
  }

  registerContextMenu(): vscode.Disposable {
    return vscode.commands.registerCommand("vizier.statusBarMenu", async () => {
      const picked = await vscode.window.showQuickPick(
        [
          { label: "$(dashboard) Open Vizier Dashboard", action: "dashboard" },
          { label: "$(debug-restart) Restart MCP Server", action: "restartMcp" },
          { label: "$(sync) Force Re-index", action: "reindex" },
          { label: "$(gear) Open Settings", action: "settings" }
        ],
        { placeHolder: "Vizier status bar menu" }
      );
      if (!picked) return;
      switch (picked.action) {
        case "dashboard":
          this.onOpenDashboard();
          break;
        case "restartMcp":
          this.onRestartMcp();
          break;
        case "reindex":
          this.onReindex();
          break;
        case "settings":
          vscode.commands.executeCommand("workbench.action.openSettings", "vizier");
          break;
      }
    });
  }

  private render(): void {
    const { memory, ast, mcp } = this.state;

    if (memory === "indexing" || ast === "indexing") {
      this.item.text = "$(sync~spin) Vizier: Indexing...";
      this.item.tooltip = "Vizier is indexing the workspace (memory + AST).";
      return;
    }

    const memIcon = memory === "error" ? "$(error)" : memory === "ready" ? "$(database)" : "$(circle-outline)";
    const astIcon = ast === "error" ? "$(error)" : ast === "ready" ? "$(file-code)" : "$(circle-outline)";
    const mcpIcon = mcp === "error" ? "$(error)" : mcp === "running" ? "$(radio-tower)" : "$(circle-outline)";

    const parts: string[] = [];
    parts.push(`${memIcon} memory`);
    parts.push(`${astIcon} ast`);
    if (mcp === "running" && this.state.mcpPort) {
      parts.push(`${mcpIcon} mcp :${this.state.mcpPort}`);
    } else if (mcp !== "offline") {
      parts.push(`${mcpIcon} mcp`);
    }

    this.item.text = `Vizier ${parts.join("  ")}`;
    this.item.tooltip =
      `Memory: ${memory} | AST: ${ast} (${this.state.parsedFiles ?? 0} file(s)) | MCP: ${mcp}\n` +
      "Click to open the Vizier dashboard.";
  }
}