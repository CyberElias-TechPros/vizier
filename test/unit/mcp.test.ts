/**
 * Phase 3 MCP bridge tests.
 *
 * Boots the real MCP server (createMcpServer) with real engine services
 * (sql.js memory DB + web-tree-sitter parser) but no vscode host, then
 * drives it over the protocol using the SDK's InMemoryTransport + Client.
 * Covers: tool inventory + dispatch (memory + AST), resource reads,
 * prompt retrieval, and error paths.
 */

import { test } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { initDatabase, closeDatabase } from "../../src/core/memory/database.ts";
import { indexFile } from "../../src/core/memory/semantic-layer.ts";
import { logEpisode } from "../../src/core/memory/episodic-layer.ts";

import { initParserEngine, parseFile, getAllCachedFiles, getCachedTree } from "../../src/core/ast/parser-engine.ts";
import { buildWorkspaceGraph } from "../../src/core/ast/workspace-graph.ts";

import { createMcpServer, McpServices } from "../../src/core/mcp/index.ts";

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

async function setupServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-mcp-test-"));
  await initDatabase(tmpDir);

  await initParserEngine(GRAMMARS_DIR);
  for (const [filePath, text] of Object.entries(FILES)) {
    await parseFile(filePath, text);
    indexFile(filePath, text);
  }
  logEpisode("indexFile", "setup index", "/repo/src/user-repo.ts");

  const logged: string[] = [];
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
    logEpisode: (toolName, summary, filePath) => {
      logged.push(`${toolName}: ${summary} (${filePath ?? "-"})`);
    }
  };

  const server = createMcpServer(services);
  const client = new Client({ name: "vizier-test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server, services, logged, tmpDir };
}

test("mcp: tools/list exposes 16 tools (5 memory + 11 AST)", async () => {
  const { client } = await setupServer();
  const { tools } = await client.listTools();

  assert.strictEqual(tools.length, 16);
  const names = tools.map((t) => t.name).sort();
  assert.deepStrictEqual(names, [
    "extract_symbol",
    "get_caller_hierarchy",
    "get_class_hierarchy",
    "get_dependencies",
    "get_file_context",
    "get_file_structure",
    "get_identity_rules",
    "get_recent_episodes",
    "get_references",
    "get_shared_memory",
    "insert_code_block",
    "query_semantic_index",
    "rename_symbol",
    "replace_code_range",
    "validate_syntax",
    "get_symbol_at_position"
  ].sort());
});

test("mcp: memory tools dispatch against the real engine", async () => {
  const { client } = await setupServer();

  const q = await client.callTool({ name: "query_semantic_index", arguments: { query: "creating users", topK: 5 } });
  assert.ok(!q.isError, JSON.stringify(q.content));
  const qData = JSON.parse(q.content[0].text);
  assert.ok(Array.isArray(qData.results));
  assert.ok(qData.results.length >= 1, "semantic search should hit indexed chunks");

  const rules = await client.callTool({ name: "get_identity_rules", arguments: {} });
  assert.ok(!rules.isError);
  assert.ok(Array.isArray(JSON.parse(rules.content[0].text).rules));

  const ctx = await client.callTool({
    name: "get_file_context",
    arguments: { file: "/repo/src/user-repo.ts" }
  });
  assert.ok(!ctx.isError);
  const ctxData = JSON.parse(ctx.content[0].text);
  assert.strictEqual(ctxData.structure.file, "/repo/src/user-repo.ts");
  assert.ok(ctxData.structure.symbols.length >= 1);

  const recent = await client.callTool({ name: "get_recent_episodes", arguments: {} });
  assert.ok(!recent.isError);
  assert.ok(Array.isArray(JSON.parse(recent.content[0].text).episodes));

  const shared = await client.callTool({ name: "get_shared_memory", arguments: {} });
  assert.ok(!shared.isError);
  assert.ok("sharedMemory" in JSON.parse(shared.content[0].text));
});

test("mcp: AST tools dispatch against the real engine", async () => {
  const { client } = await setupServer();
  const file = "/repo/src/user-repo.ts";

  const struct = await client.callTool({ name: "get_file_structure", arguments: { file } });
  assert.ok(!struct.isError);
  const structData = JSON.parse(struct.content[0].text);
  assert.ok(structData.symbols.some((s: any) => s.name === "UserRepository"));

  const symbol = await client.callTool({ name: "get_symbol_at_position", arguments: { file, line: 7, column: 10 } });
  assert.ok(!symbol.isError);
  const symbolData = JSON.parse(symbol.content[0].text);
  assert.strictEqual(symbolData.name, "createUser");

  const hierarchy = await client.callTool({
    name: "get_caller_hierarchy",
    arguments: { functionName: "createUser", filePath: file }
  });
  assert.ok(!hierarchy.isError, JSON.stringify(hierarchy.content));
  const hierarchyData = JSON.parse(hierarchy.content[0].text);
  assert.strictEqual(hierarchyData.symbol.name, "createUser");

  const deps = await client.callTool({ name: "get_dependencies", arguments: { file } });
  assert.ok(!deps.isError);

  const rename = await client.callTool({
    name: "rename_symbol",
    arguments: { file, line: 7, column: 10, newName: "registerUser" }
  });
  assert.ok(!rename.isError);
  const renameData = JSON.parse(rename.content[0].text);
  assert.strictEqual(renameData.newName, "registerUser");
  assert.ok(renameData.occurrences >= 1);

  const insert = await client.callTool({
    name: "insert_code_block",
    arguments: { file, afterLine: 8, code: "export function resetDb() { return true; }" }
  });
  assert.ok(!insert.isError);
  const insertData = JSON.parse(insert.content[0].text);
  assert.ok(insertData.edit.newText.includes("resetDb"));

  const replace = await client.callTool({
    name: "replace_code_range",
    arguments: { file, startLine: 10, endLine: 12, newCode: "export function hashPassword(pw: string) { return pw; }" }
  });
  assert.ok(!replace.isError);

  const extract = await client.callTool({
    name: "extract_symbol",
    arguments: { file, startLine: 7, endLine: 8, newName: "register" }
  });
  assert.ok(!extract.isError);
  const extractData = JSON.parse(extract.content[0].text);
  assert.ok(extractData.edit && extractData.usagesUpdated);
});

test("mcp: validate_syntax accepts file or code", async () => {
  const { client } = await setupServer();

  const byFile = await client.callTool({ name: "validate_syntax", arguments: { file: "/repo/src/user-repo.ts" } });
  assert.ok(!byFile.isError);
  assert.strictEqual(JSON.parse(byFile.content[0].text).valid, true);

  const byCode = await client.callTool({
    name: "validate_syntax",
    arguments: { code: "function broken( {", language: "typescript" }
  });
  assert.ok(!byCode.isError);
  const byCodeData = JSON.parse(byCode.content[0].text);
  assert.strictEqual(byCodeData.valid, false);
  assert.ok(byCodeData.errors.length >= 1);

  const neither = await client.callTool({ name: "validate_syntax", arguments: {} });
  assert.strictEqual(neither.isError, true);
  assert.ok(neither.content[0].text.includes("requires either"));
});

test("mcp: unknown tool returns isError without crashing", async () => {
  const { client } = await setupServer();
  const res = await client.callTool({ name: "no_such_tool", arguments: {} });
  assert.strictEqual(res.isError, true);
  assert.ok(res.content[0].text.includes("no_such_tool"));
});

test("mcp: resources list and read (identity + shared memory)", async () => {
  const { client } = await setupServer();

  const { resources } = await client.listResources();
  assert.strictEqual(resources.length, 2);
  const uris = resources.map((r) => r.uri).sort();
  assert.deepStrictEqual(uris, ["vizier://identity", "vizier://shared-memory"]);

  const identity = await client.readResource({ uri: "vizier://identity" });
  const identityText = identity.contents[0].text;
  assert.ok(Array.isArray(JSON.parse(identityText).rules));

  const shared = await client.readResource({ uri: "vizier://shared-memory" });
  assert.ok(shared.contents[0].text.length > 0);

  await assert.rejects(() => client.readResource({ uri: "vizier://nope" }));
});

test("mcp: prompts list and expand", async () => {
  const { client } = await setupServer();

  const { prompts } = await client.listPrompts();
  assert.strictEqual(prompts.length, 3);
  const names = prompts.map((p) => p.name).sort();
  assert.deepStrictEqual(names, ["analyze_file", "explain_hierarchy", "refactor_symbol"]);

  const analyze = await client.getPrompt({
    name: "analyze_file",
    arguments: { file: "/repo/src/user-repo.ts" }
  });
  assert.strictEqual(analyze.messages.length, 1);
  assert.ok(analyze.messages[0].content.text.includes("get_file_structure"));

  const refactor = await client.getPrompt({
    name: "refactor_symbol",
    arguments: { file: "/repo/src/user-repo.ts", line: "7", column: "10", newName: "registerUser" }
  });
  assert.ok(refactor.messages[0].content.text.includes("registerUser"));

  await assert.rejects(() => client.getPrompt({ name: "nope" }));
});

test("mcp: tool calls are logged as episodes", async () => {
  const { client, logged } = await setupServer();
  await client.callTool({ name: "rename_symbol", arguments: { file: "/repo/src/user-repo.ts", line: 7, column: 10, newName: "x" } });
  await client.callTool({ name: "query_semantic_index", arguments: { query: "auth" } });
  assert.ok(logged.some((l) => l.startsWith("rename_symbol:")));
  assert.ok(logged.some((l) => l.startsWith("query_semantic_index:")));
  await closeDatabase();
});