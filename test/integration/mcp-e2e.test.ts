/**
 * Vizier MCP bridge — real end-to-end test.
 *
 * Unlike test/unit/mcp.test.ts (which drives the server over an in-memory
 * transport), this boots the real Express + SSE HTTP server on an ephemeral
 * port and connects a real MCP client over the network (fetch + POST
 * /messages). It proves the full production path: GET /sse handshake,
 * endpoint event, POST /messages routing by transport.sessionId, tool/resource/
 * prompt round-trips, session tracking, and clean shutdown.
 */

import { test } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { initDatabase, closeDatabase } from "../../src/core/memory/database.ts";
import { indexFile } from "../../src/core/memory/semantic-layer.ts";
import { logEpisode } from "../../src/core/memory/episodic-layer.ts";

import { initParserEngine, parseFile, getCachedTree, getAllCachedFiles } from "../../src/core/ast/parser-engine.ts";
import { buildWorkspaceGraph } from "../../src/core/ast/workspace-graph.ts";

import { startMcpBridge, McpServices } from "../../src/core/mcp/index.ts";

const GRAMMARS_DIR = path.join(__dirname, "..", "..", "node_modules", "tree-sitter-wasms", "out");

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

const repo = new UserRepository();
repo.createUser("a@example.com", "secret");
`;

const FILES: Record<string, string> = {
  "/repo/src/user-repo.ts": SAMPLE_TS
};

async function bootBridge() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-e2e-"));
  await initDatabase(tmpDir);

  await initParserEngine(GRAMMARS_DIR);
  for (const [filePath, text] of Object.entries(FILES)) {
    await parseFile(filePath, text);
    indexFile(filePath, text);
  }
  logEpisode("indexFile", "setup index", "/repo/src/user-repo.ts");

  const services: McpServices = {
    readFile: (filePath) => FILES[filePath] ?? null,
    getCachedTree: (filePath) => getCachedTree(filePath),
    parseFile: async (filePath, text) => parseFile(filePath, text),
    getAllParsedFiles: () => {
      const files = new Map();
      for (const f of getAllCachedFiles()) {
        const cached = getCachedTree(f);
        if (cached) files.set(f, cached);
      }
      return files;
    },
    getGraph: () => buildWorkspaceGraph(
      (() => {
        const files = new Map();
        for (const f of getAllCachedFiles()) {
          const cached = getCachedTree(f);
          if (cached) files.set(f, cached);
        }
        return files;
      })()
    ),
    logEpisode: () => {}
  };

  const handle = await startMcpBridge(services, 0);
  return { handle, tmpDir };
}

test("e2e: live HTTP/SSE MCP round-trip (handshake, tools, resources, prompts, sessions)", async () => {
  const { handle, tmpDir } = await bootBridge();
  const baseUrl = `http://localhost:${handle.port}`;

  try {
    // GET /health on the raw Express app (real HTTP, no MCP involved).
    const health = await fetch(`${baseUrl}/health`);
    assert.strictEqual(health.status, 200);

    // Real MCP client over the network.
    const transport = new SSEClientTransport(new URL(`${baseUrl}/sse`));
    const client = new Client({ name: "vizier-e2e-client", version: "0.0.0" });
    await client.connect(transport);

    // The SSE handshake must register a tracked session.
    assert.ok(handle.sessions.count >= 1, "SSE connection registered a session");

    const { tools } = await client.listTools();
    assert.strictEqual(tools.length, 16, "all 16 tools advertised over HTTP");

    const q = await client.callTool({ name: "query_semantic_index", arguments: { query: "creating users", topK: 5 } });
    assert.ok(!q.isError, JSON.stringify(q.content));
    const qData = JSON.parse(q.content[0].text);
    assert.ok(qData.results.length >= 1, "semantic search hits indexed chunks over HTTP");

    const struct = await client.callTool({ name: "get_file_structure", arguments: { file: "/repo/src/user-repo.ts" } });
    assert.ok(!struct.isError);
    const structData = JSON.parse(struct.content[0].text);
    assert.ok(structData.symbols.some((s: any) => s.name === "UserRepository"));

    const identity = await client.readResource({ uri: "vizier://identity" });
    assert.ok(Array.isArray(JSON.parse(identity.contents[0].text).rules));

    const analyze = await client.getPrompt({ name: "analyze_file", arguments: { file: "/repo/src/user-repo.ts" } });
    assert.strictEqual(analyze.messages.length, 1);

    // Tool calls must appear in the session log.
    const log = handle.sessions.getLog();
    assert.ok(log.some((l) => l.tool === "query_semantic_index"), "tool call logged in session log");

    await client.close();
    await new Promise((r) => setTimeout(r, 150));
    assert.strictEqual(handle.sessions.count, 0, "session removed after client disconnect");
  } finally {
    await handle.dispose();
    await closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});