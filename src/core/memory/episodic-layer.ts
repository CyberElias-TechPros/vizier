/**
 * Vizier Memory Engine — Episodic Layer
 *
 * Logs every tool invocation / file edit / agent interaction so agents
 * (and the human) can see a history of what happened in the workspace.
 */

import * as crypto from "crypto";
import { run, queryAll } from "./database";

export interface Episode {
  id: string;
  timestamp: string;
  toolName: string;
  filePath: string | null;
  summary: string;
  diffSnapshot: string | null;
}

export function logEpisode(toolName: string, summary: string, filePath?: string, diffSnapshot?: string): string {
  const id = crypto.randomUUID();
  run(
    `INSERT INTO episodes (id, tool_name, file_path, summary, diff_snapshot) VALUES (?, ?, ?, ?, ?)`,
    [id, toolName, filePath ?? null, summary, diffSnapshot ?? null]
  );
  return id;
}

export function getRecentEpisodes(limit: number = 20): Episode[] {
  return queryAll<any>(
    `SELECT id, timestamp, tool_name as toolName, file_path as filePath, summary, diff_snapshot as diffSnapshot
     FROM episodes ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
}

export function getEpisodesForFile(filePath: string, limit: number = 50): Episode[] {
  return queryAll<any>(
    `SELECT id, timestamp, tool_name as toolName, file_path as filePath, summary, diff_snapshot as diffSnapshot
     FROM episodes WHERE file_path = ? ORDER BY timestamp DESC LIMIT ?`,
    [filePath, limit]
  );
}
