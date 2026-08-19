/**
 * Vizier Memory Engine — Verbatim Layer
 *
 * Stores raw character ranges for exact text recall (as opposed to the
 * semantic layer's chunk-with-embedding rows). Retrieved by file path +
 * line range, never by similarity search.
 */

import * as crypto from "crypto";
import { run, queryAll, queryOne } from "./database";

export interface VerbatimBlock {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

export function storeVerbatimBlock(filePath: string, startLine: number, endLine: number, content: string): string {
  const id = crypto
    .createHash("sha1")
    .update(`verbatim:${filePath}:${startLine}:${endLine}`)
    .digest("hex")
    .slice(0, 16);

  run(
    `INSERT INTO chunks (id, layer, file_path, start_line, end_line, content)
     VALUES (?, 'verbatim', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET content = excluded.content`,
    [id, filePath, startLine, endLine, content]
  );
  return id;
}

export function getVerbatimBlock(filePath: string, startLine: number, endLine: number): VerbatimBlock | undefined {
  return queryOne<VerbatimBlock>(
    `SELECT id, file_path as filePath, start_line as startLine, end_line as endLine, content
     FROM chunks WHERE layer = 'verbatim' AND file_path = ? AND start_line = ? AND end_line = ?`,
    [filePath, startLine, endLine]
  );
}

export function getVerbatimBlocksForFile(filePath: string): VerbatimBlock[] {
  return queryAll<VerbatimBlock>(
    `SELECT id, file_path as filePath, start_line as startLine, end_line as endLine, content
     FROM chunks WHERE layer = 'verbatim' AND file_path = ? ORDER BY start_line`,
    [filePath]
  );
}
