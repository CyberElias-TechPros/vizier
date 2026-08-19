/**
 * Vizier Memory Engine — Shared Cross-Tool Memory
 *
 * Mirrors key facts from the semantic and identity layers into
 * ~/.vizier/shared_memory.json so external terminal-based tools
 * (Claude Code CLI, Cursor background processes, etc.) can read
 * workspace context directly, without going through the MCP bridge.
 *
 * Uses proper-lockfile (pure JS, no native deps) to avoid concurrent
 * writers corrupting the file.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import lockfile from "proper-lockfile";
import { getIdentityRules } from "./identity-queries";
import { queryAll } from "./database";
import { getRecentEpisodes } from "./episodic-layer";

export function sharedMemoryPath(): string {
  return path.join(os.homedir(), ".vizier", "shared_memory.json");
}

interface SharedMemorySnapshot {
  updatedAt: string;
  identityRules: Array<{ path: string; content: string; updatedAt: string }>;
  fileSummaries: Array<{ filePath: string; symbolCount: number; symbols: string[] }>;
  recentEpisodes: Array<{ timestamp: string; toolName: string; summary: string }>;
}

function buildSnapshot(): SharedMemorySnapshot {
  const identityRules = getIdentityRules().map((r) => ({
    path: r.path,
    content: r.content,
    updatedAt: r.updated_at
  }));

  const rows = queryAll<{ file_path: string; symbol_name: string | null }>(
    `SELECT file_path, symbol_name FROM chunks WHERE layer = 'semantic'`
  );
  const byFile = new Map<string, string[]>();
  for (const row of rows) {
    const list = byFile.get(row.file_path) || [];
    if (row.symbol_name) list.push(row.symbol_name);
    byFile.set(row.file_path, list);
  }
  const fileSummaries = Array.from(byFile.entries()).map(([filePath, symbols]) => ({
    filePath,
    symbolCount: symbols.length,
    symbols
  }));

  const recentEpisodes = getRecentEpisodes(20).map((e) => ({
    timestamp: e.timestamp,
    toolName: e.toolName,
    summary: e.summary
  }));

  return {
    updatedAt: new Date().toISOString(),
    identityRules,
    fileSummaries,
    recentEpisodes
  };
}

/**
 * Recompute and write the shared memory snapshot to disk, guarded by a
 * file lock so concurrent writers (e.g. two VS Code windows) don't race.
 */
export async function writeSharedMemory(): Promise<void> {
  const targetPath = sharedMemoryPath();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  // proper-lockfile requires the target file to exist before locking.
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, "{}");
  }

  let release: (() => Promise<void>) | undefined;
  try {
    release = await lockfile.lock(targetPath, { retries: { retries: 5, minTimeout: 50, maxTimeout: 300 } });
    const snapshot = buildSnapshot();
    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2));
  } finally {
    if (release) await release();
  }
}

export function readSharedMemory(): SharedMemorySnapshot | null {
  const targetPath = sharedMemoryPath();
  if (!fs.existsSync(targetPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8"));
  } catch {
    return null;
  }
}
