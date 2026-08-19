import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import assert from "assert";
import { initDatabase } from "../../src/core/memory/database";
import { indexFile } from "../../src/core/memory/semantic-layer";
import { logEpisode } from "../../src/core/memory/episodic-layer";
import { writeSharedMemory, readSharedMemory, sharedMemoryPath } from "../../src/core/memory/shared-memory";

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-shared-test-"));
  await initDatabase(tmpDir);

  indexFile("/repo/src/a.ts", "export function doThing() { return 1; }");
  logEpisode("indexFile", "Indexed a.ts");

  // Concurrent writes — the lock should serialize them, not corrupt the file.
  await Promise.all([writeSharedMemory(), writeSharedMemory(), writeSharedMemory()]);

  const snapshot = readSharedMemory();
  assert.ok(snapshot, "expected shared memory snapshot to exist");
  assert.ok(snapshot!.fileSummaries.length >= 1, "expected at least one file summary");
  assert.ok(snapshot!.recentEpisodes.length >= 1, "expected at least one episode");
  console.log("✓ writeSharedMemory — concurrent writes serialized without corruption");
  console.log("✓ readSharedMemory — valid JSON with", snapshot!.fileSummaries.length, "file(s),", snapshot!.recentEpisodes.length, "episode(s)");
  console.log("  wrote to:", sharedMemoryPath());

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\nShared memory checks passed.");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
