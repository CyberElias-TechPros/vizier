/**
 * Vizier Memory Engine — Schema
 *
 * Table DDL and migration scripts. Uses sql.js (SQLite compiled to WASM),
 * not better-sqlite3, so there is no native addon to build or bundle per
 * platform. Vector similarity is done in JS (see vector-search.ts) rather
 * than via a native SQLite extension.
 */

export const SCHEMA_VERSION = 1;

export const MIGRATIONS: string[] = [
  // --- v1: base schema -----------------------------------------------
  `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    layer TEXT NOT NULL CHECK (layer IN ('semantic', 'verbatim')),
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    language TEXT,
    symbol_name TEXT,
    symbol_kind TEXT,
    parent_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_file_path ON chunks(file_path);
  CREATE INDEX IF NOT EXISTS idx_chunks_layer ON chunks(layer);
  CREATE INDEX IF NOT EXISTS idx_chunks_symbol_name ON chunks(symbol_name);

  -- Term-frequency vectors stored as JSON text (term -> weight).
  -- This stands in for the 'embeddings' table in the original spec;
  -- swap in a real vector BLOB + ANN index later without touching
  -- callers of vector-search.ts.
  CREATE TABLE IF NOT EXISTS chunk_vectors (
    chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    vector_json TEXT NOT NULL,
    norm REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS identity_rules (
    path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    tool_name TEXT NOT NULL,
    file_path TEXT,
    summary TEXT NOT NULL,
    diff_snapshot TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_episodes_file_path ON episodes(file_path);
  CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
  `
];
