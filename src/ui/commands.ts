/**
 * Vizier UI — Command Registration
 *
 * Phase 4 §4.4: the new Phase 4 commands (rebuildAst, startMcp, stopMcp,
 * showDashboard, symbolInfo) + the status bar context menu. Existing
 * Phase 1/2 commands stay registered in extension.ts.
 */

import * as vscode from "vscode";
import { getCachedTree, parseFile, languageForPath } from "../core/ast/parser-engine";
import { getSymbolAtPosition } from "../core/ast/get-symbol-at-position";

export interface VizierController {
  rebuildAst(): Promise<number>;
  startMcp(): Promise<void>;
  stopMcp(): Promise<void>;
  showDashboard(): void;
  parsedFileCount(): number;
}

export function registerPhase4Commands(
  context: vscode.ExtensionContext,
  controller: VizierController
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vizier.rebuildAst", async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Vizier: Rebuilding AST cache..." },
        async () => {
          const parsed = await controller.rebuildAst();
          vscode.window.showInformationMessage(`Vizier rebuilt the AST cache: ${parsed} file(s).`);
        }
      );
    }),

    vscode.commands.registerCommand("vizier.startMcp", async () => {
      await controller.startMcp();
    }),

    vscode.commands.registerCommand("vizier.stopMcp", async () => {
      await controller.stopMcp();
    }),

    vscode.commands.registerCommand("vizier.showDashboard", () => {
      controller.showDashboard();
    }),

    vscode.commands.registerCommand("vizier.symbolInfo", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("Open a source file first.");
        return;
      }
      if (!languageForPath(editor.document.uri.fsPath)) {
        vscode.window.showWarningMessage("Unsupported file type (use .ts/.tsx/.js/.jsx/.py).");
        return;
      }
      let cached = getCachedTree(editor.document.uri.fsPath);
      if (!cached) cached = await parseFile(editor.document.uri.fsPath, editor.document.getText());

      const pos = editor.selection.active;
      const symbol = getSymbolAtPosition(cached, pos.line + 1, pos.character);
      if (!symbol.found || !symbol.range) {
        vscode.window.showInformationMessage("No symbol at the cursor.");
        return;
      }
      const md =
        `# ${symbol.name ?? "(anonymous)"} — ${symbol.kind}\n\n` +
        `- File: \`${editor.document.uri.fsPath}\`\n` +
        `- Lines: ${symbol.range.startLine}-${symbol.range.endLine}\n\n` +
        (symbol.docstring ? `> ${symbol.docstring}\n\n` : "") +
        (symbol.signature ? `\`\`\`\n${symbol.signature}\n\`\`\`` : "");
      const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
      await vscode.window.showTextDocument(doc, { preview: true });
    })
  );
}