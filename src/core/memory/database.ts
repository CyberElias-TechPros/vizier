/**
 * Vizier Memory Engine — Database
 *
 * Wraps sql.js (SQLite -> WASM). No native addon, so no per-platform
 * prebuilt binaries are needed. The whole DB lives in memory as a
 * Uint8Array and is flushed to disk after each write; for a local,
 * single-process VS Code extension this is simple and safe.
 *
 * This file has no dependency on the `vscode` module, so it can be
 * unit-tested with plain Node.
 */

import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import * as fs from "fs";
import * as path from "path";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbFilePath: string | null = null;

/**
 * Initialize the database at the given directory (typically
 * context.globalStorageUri.fsPath). Creates the directory and DB file
 * if they don't exist, and runs any pending migrations.
 */
export async function initDatabase(storageDir: string): Promise<void> {
  if (db) return; // already initialized

  if (!SQL) {
    SQL = await initSqlJs({
      // Locate the wasm binary that ships inside the sql.js package.
      locateFile: (file: string) => path.join(require.resolve("sql.js"), "..", file)
    });
  }

  fs.mkdirSync(storageDir, { recursive: true });
  dbFilePath = path.join(storageDir, "memory.db");

  if (fs.existsSync(dbFilePath)) {
    const buffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations();
  persist();
}

function runMigrations(): void {
  if (!db) throw new Error("Database not initialized");

  db.run("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);");

  const row = db.exec("SELECT value FROM meta WHERE key = 'schema_version'");
  const currentVersion = row.length > 0 && row[0].values.length > 0
    ? Number(row[0].values[0][0])
    : 0;

  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    db.run(MIGRATIONS[v]);
  }

  db.run(
    `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(SCHEMA_VERSION)]
  );
}

/** Flush the in-memory WASM database to disk. Call after any write. */
export function persist(): void {
  if (!db || !dbFilePath) return;
  const data = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

/** Get the live database handle. Throws if initDatabase() hasn't run yet. */
export function getDb(): Database {
  if (!db) {
    throw new Error("[Vizier] Database accessed before initDatabase() completed.");
  }
  return db;
}

/**
 * Convenience wrapper: run a write statement, then persist to disk.
 * Use for INSERT/UPDATE/DELETE. For read-only queries, use getDb().exec()
 * or queryAll()/queryOne() below directly (no persist needed).
 */
export function run(sql: string, params: any[] = []): void {
  getDb().run(sql, params);
  persist();
}

/** Run a SELECT and return all rows as plain objects. */
export function queryAll<T = Record<string, any>>(sql: string, params: any[] = []): T[] {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** Run a SELECT and return the first row, or undefined. */
export function queryOne<T = Record<string, any>>(sql: string, params: any[] = []): T | undefined {
  const rows = queryAll<T>(sql, params);
  return rows[0];
}

/** Close the database. Call from the extension's deactivate()/dispose. */
export function closeDatabase(): void {
  if (db) {
    persist();
    db.close();
    db = null;
  }
}

/** Test-only: reset module state so tests can init a fresh in-memory DB. */
export function __resetForTests(): void {
  db = null;
  dbFilePath = null;
}
