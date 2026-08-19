/**
 * Vizier Memory Engine — Identity Layer
 *
 * Detects and parses project-level rule files (v3code.md, .clauderc,
 * .cursorrules, .github/copilot-instructions.md, AGENTS.md) and keeps
 * them in sync via VS Code FileSystemWatchers.
 *
 * Adapted from the architecture doc's sample to this project's sql.js-
 * backed database module (run/queryOne instead of better-sqlite3's
 * synchronous prepare().get()/run()).
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import { run, queryOne } from "./database";
export { getIdentityRules, IdentityRule } from "./identity-queries";

const IDENTITY_GLOBS = [
  "**/v3code.md",
  "**/.clauderc",
  "**/.cursorrules",
  "**/.github/copilot-instructions.md",
  "**/AGENTS.md"
];

export function initIdentityLayer(context: vscode.ExtensionContext): void {
  scanIdentityFiles();

  const watchers: vscode.FileSystemWatcher[] = [];

  for (const pattern of IDENTITY_GLOBS) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidChange(async (uri) => {
      console.log(`[Vizier] Identity file changed: ${uri.fsPath}`);
      await upsertIdentityRule(uri);
    });

    watcher.onDidCreate(async (uri) => {
      console.log(`[Vizier] Identity file created: ${uri.fsPath}`);
      await upsertIdentityRule(uri);
    });

    watcher.onDidDelete((uri) => {
      console.log(`[Vizier] Identity file deleted: ${uri.fsPath}`);
      deleteIdentityRule(uri.fsPath);
    });

    watchers.push(watcher);
  }

  context.subscriptions.push(...watchers, { dispose: () => watchers.forEach((w) => w.dispose()) });
}

async function scanIdentityFiles(): Promise<void> {
  const uris = await Promise.all(IDENTITY_GLOBS.map((g) => vscode.workspace.findFiles(g)));
  const allFiles = uris.flat();

  for (const uri of allFiles) {
    await upsertIdentityRule(uri);
  }
  console.log(`[Vizier] Identity scan complete: ${allFiles.length} files indexed.`);
}

async function upsertIdentityRule(uri: vscode.Uri): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const content = doc.getText();
    const contentHash = crypto.createHash("sha256").update(content).digest("hex");

    const existing = queryOne<{ content_hash: string }>(
      "SELECT content_hash FROM identity_rules WHERE path = ?",
      [uri.fsPath]
    );

    if (existing && existing.content_hash === contentHash) {
      return; // unchanged — skip the write
    }

    run(
      `INSERT INTO identity_rules (path, content_hash, content, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(path) DO UPDATE SET
         content_hash = excluded.content_hash,
         content = excluded.content,
         updated_at = excluded.updated_at`,
      [uri.fsPath, contentHash, content]
    );

    console.log(`[Vizier] Identity rule upserted: ${uri.fsPath} (${contentHash.slice(0, 8)})`);
  } catch (err) {
    console.error(`[Vizier] Failed to upsert identity rule: ${uri.fsPath}`, err);
  }
}

function deleteIdentityRule(filePath: string): void {
  run("DELETE FROM identity_rules WHERE path = ?", [filePath]);
  console.log(`[Vizier] Identity rule deleted: ${filePath}`);
}


