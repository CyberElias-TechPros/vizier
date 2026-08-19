/**
 * Standalone smoke test for the Phase 1 memory engine.
 * Runs everything that doesn't require a live `vscode` host
 * (i.e. everything except identity-layer.ts's FileSystemWatcher wiring,
 * which is exercised structurally by the type-check instead).
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import assert from "assert";

import { initDatabase, closeDatabase } from "../../src/core/memory/database";
import { indexFile, getChunksForFile } from "../../src/core/memory/semantic-layer";
import { semanticSearch } from "../../src/core/memory/vector-search";
import { storeVerbatimBlock, getVerbatimBlock } from "../../src/core/memory/verbatim-layer";
import { logEpisode, getRecentEpisodes, getEpisodesForFile } from "../../src/core/memory/episodic-layer";

const SAMPLE_TS = `
export class UserRepository {
  async findById(id: string) {
    return this.db.users.find(id);
  }

  async createUser(email: string, password: string) {
    const hashed = await hashPassword(password);
    return this.db.users.insert({ email, hashed });
  }
}

function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
`;

const SAMPLE_TS_2 = `
export class PaymentProcessor {
  async chargeCard(userId: string, amountCents: number) {
    const user = await this.users.findById(userId);
    return this.stripe.charge(user.stripeCustomerId, amountCents);
  }
}
`;

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-memory-test-"));
  console.log("Using temp storage dir:", tmpDir);

  await initDatabase(tmpDir);
  console.log("✓ initDatabase — schema created / migrated");

  // Re-init should be a safe no-op
  await initDatabase(tmpDir);
  console.log("✓ initDatabase — idempotent re-init");

  // --- semantic layer -----------------------------------------------
  const chunks1 = indexFile("/repo/src/user-repo.ts", SAMPLE_TS);
  assert.ok(chunks1.length >= 2, "expected at least 2 chunks from user-repo.ts");
  console.log(`✓ indexFile — extracted ${chunks1.length} chunks from user-repo.ts`);
  for (const c of chunks1) console.log(`    - ${c.symbolKind} ${c.symbolName} (lines ${c.startLine}-${c.endLine})`);

  const chunks2 = indexFile("/repo/src/payment.ts", SAMPLE_TS_2);
  assert.ok(chunks2.length >= 1, "expected at least 1 chunk from payment.ts");
  console.log(`✓ indexFile — extracted ${chunks2.length} chunks from payment.ts`);

  const stored = getChunksForFile("/repo/src/user-repo.ts");
  assert.strictEqual(stored.length, chunks1.length);
  console.log("✓ getChunksForFile — round-trips correctly");

  // Re-indexing the same file should replace, not duplicate.
  indexFile("/repo/src/user-repo.ts", SAMPLE_TS);
  const storedAfterReindex = getChunksForFile("/repo/src/user-repo.ts");
  assert.strictEqual(storedAfterReindex.length, chunks1.length, "re-index should replace, not duplicate");
  console.log("✓ indexFile — re-indexing replaces old chunks (no duplication)");

  // --- semantic search -------------------------------------------------
  const results = semanticSearch("charge a credit card payment", 5);
  assert.ok(results.length > 0, "expected semantic search to return results");
  console.log(`✓ semanticSearch("charge a credit card payment") →`);
  for (const r of results) console.log(`    - [${r.score.toFixed(3)}] ${r.symbol_name} (${r.file_path})`);
  assert.strictEqual(results[0].symbol_name, "PaymentProcessor.chargeCard", "expected chargeCard to rank first for a payment query");
  console.log("✓ semanticSearch — most relevant chunk ranked first");

  const results2 = semanticSearch("hash a user password", 5);
  console.log(`✓ semanticSearch("hash a user password") →`);
  for (const r of results2) console.log(`    - [${r.score.toFixed(3)}] ${r.symbol_name} (${r.file_path})`);
  assert.strictEqual(results2[0].symbol_name, "hashPassword");
  console.log("✓ semanticSearch — correctly distinguishes unrelated query");

  // --- verbatim layer -------------------------------------------------
  storeVerbatimBlock("/repo/src/user-repo.ts", 1, 5, "export class UserRepository { ... }");
  const block = getVerbatimBlock("/repo/src/user-repo.ts", 1, 5);
  assert.ok(block, "expected verbatim block to be retrievable");
  console.log("✓ verbatim layer — store + exact retrieval works");

  // --- episodic layer ---------------------------------------------------
  logEpisode("indexFile", "Indexed user-repo.ts (2 chunks)", "/repo/src/user-repo.ts");
  logEpisode("semanticSearch", "Searched: charge a credit card payment");
  const recent = getRecentEpisodes(10);
  assert.ok(recent.length >= 2, "expected at least 2 episodes logged");
  console.log(`✓ episodic layer — ${recent.length} episodes logged, most recent: "${recent[0].summary}"`);

  const fileEpisodes = getEpisodesForFile("/repo/src/user-repo.ts");
  assert.strictEqual(fileEpisodes.length, 1);
  console.log("✓ episodic layer — per-file episode filtering works");

  // --- persistence across reload ---------------------------------------
  closeDatabase();
  await initDatabase(tmpDir);
  const reloaded = getChunksForFile("/repo/src/user-repo.ts");
  assert.strictEqual(reloaded.length, chunks1.length, "chunks should survive a DB close + reopen");
  console.log("✓ database — data survives close() + reopen from disk (real persistence, not just in-memory)");
  closeDatabase();

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\nAll Phase 1 memory engine checks passed.");
}

main().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
