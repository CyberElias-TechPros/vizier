/**
 * Vizier MCP Bridge — Tool Registry
 *
 * Registers the 5 memory tools + 11 AST tools from the architecture doc
 * (§3.1) on the MCP server, and dispatches tool calls to the Phase 1
 * memory engine and Phase 2 AST engine implementations.
 *
 * The dispatch layer is deliberately vscode-free: file text comes from an
 * injected `McpServices.readFile` (the extension host provides fs access,
 * tests provide an in-memory map), so this whole module is testable with
 * plain Node + InMemoryTransport.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { CachedTree, parseSnippet, SupportedLanguage } from "../ast/parser-engine";
import { WorkspaceGraph, buildWorkspaceGraph, findDeclarations } from "../ast/workspace-graph";
import { getSymbolAtPosition } from "../ast/get-symbol-at-position";
import { getFunctionHierarchy } from "../ast/function-hierarchy";
import { getClassHierarchy } from "../ast/class-hierarchy";
import { getFileStructure } from "../ast/get-file-structure";
import { getReferences } from "../ast/references";
import { getDependencies } from "../ast/dependencies";
import { renameSymbol } from "../ast/rename";
import { insertCodeBlock } from "../ast/insert-code";
import { replaceCodeRange } from "../ast/replace-code-range";
import { extractSymbol } from "../ast/extract-symbol";
import { validateSyntax } from "../ast/validate-syntax";

import { semanticSearch } from "../memory/vector-search";
import { getIdentityRules } from "../memory/identity-queries";
import { getRecentEpisodes, getEpisodesForFile } from "../memory/episodic-layer";
import { readSharedMemory } from "../memory/shared-memory";

/**
 * Services the dispatcher needs. The extension wires these to the real
 * engines; tests wire them to in-memory stubs.
 */
export interface McpServices {
  readFile(filePath: string): string | null;
  getCachedTree(filePath: string): CachedTree | undefined;
  parseFile(filePath: string, text: string): Promise<CachedTree>;
  getAllParsedFiles(): Map<string, CachedTree>;
  getGraph(): WorkspaceGraph | null;
  logEpisode(toolName: string, summary: string, filePath?: string): void;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["javascript", "typescript", "python"];

export const MCP_TOOLS: ToolDefinition[] = [
  // ── Memory tools ──────────────────────────────────────────────
  {
    name: "query_semantic_index",
    description: "Search the Vizier vector store by semantic meaning (not filenames).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Conceptual search query." },
        topK: { type: "number", description: "Max results (default 10)." }
      },
      required: ["query"]
    }
  },
  {
    name: "get_identity_rules",
    description: "Return all active project identity rules (v3code.md, .clauderc, etc.).",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_recent_episodes",
    description: "Return recent tool invocations and file edit history.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 20 } }
    }
  },
  {
    name: "get_file_context",
    description: "Return combined context for a file: structure + rules + recent episodes.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string", description: "Absolute file path." } },
      required: ["file"]
    }
  },
  {
    name: "get_shared_memory",
    description: "Return the full contents of the shared memory store.",
    inputSchema: { type: "object", properties: {} }
  },

  // ── AST tools ─────────────────────────────────────────────────
  {
    name: "get_symbol_at_position",
    description: "Return the symbol (name, kind, range, docstring) at a file/line/column.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        line: { type: "number" },
        column: { type: "number" }
      },
      required: ["file", "line", "column"]
    }
  },
  {
    name: "get_caller_hierarchy",
    description: "Return the call graph for a function: what calls it and what it calls.",
    inputSchema: {
      type: "object",
      properties: {
        functionName: { type: "string" },
        filePath: { type: "string" }
      },
      required: ["functionName", "filePath"]
    }
  },
  {
    name: "get_class_hierarchy",
    description: "Return parent classes, child classes, and interfaces for a class.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        line: { type: "number" }
      },
      required: ["file", "line"]
    }
  },
  {
    name: "get_file_structure",
    description: "Return the full structural outline of a file (all symbols, kinds, ranges).",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" } },
      required: ["file"]
    }
  },
  {
    name: "get_references",
    description: "Find all references to a symbol across the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        symbolName: { type: "string" },
        file: { type: "string" },
        line: { type: "number" }
      },
      required: ["symbolName", "file", "line"]
    }
  },
  {
    name: "get_dependencies",
    description: "Return all imports/requires in a file and what symbols are imported.",
    inputSchema: {
      type: "object",
      properties: { file: { type: "string" } },
      required: ["file"]
    }
  },
  {
    name: "rename_symbol",
    description: "Perform a safe rename across all references. Returns a WorkspaceEdit preview.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        line: { type: "number" },
        column: { type: "number" },
        newName: { type: "string" }
      },
      required: ["file", "line", "column", "newName"]
    }
  },
  {
    name: "insert_code_block",
    description: "Insert a new function/class/method at a specified location.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        afterLine: { type: "number" },
        code: { type: "string" },
        language: { type: "string" }
      },
      required: ["file", "afterLine", "code"]
    }
  },
  {
    name: "replace_code_range",
    description: "Replace a specific code range with new code, respecting indentation.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        startLine: { type: "number" },
        endLine: { type: "number" },
        newCode: { type: "string" }
      },
      required: ["file", "startLine", "endLine", "newCode"]
    }
  },
  {
    name: "extract_symbol",
    description: "Extract a code block into a new function/method.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        startLine: { type: "number" },
        endLine: { type: "number" },
        newName: { type: "string" }
      },
      required: ["file", "startLine", "endLine", "newName"]
    }
  },
  {
    name: "validate_syntax",
    description: "Parse a file or code string and return any syntax errors.",
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
        code: { type: "string" },
        language: { type: "string", enum: SUPPORTED_LANGUAGES }
      }
    }
  }
];

// --- Dispatch -----------------------------------------------------------

async function cachedFor(svc: McpServices, file: string): Promise<CachedTree> {
  const existing = svc.getCachedTree(file);
  if (existing) return existing;
  const text = svc.readFile(file);
  if (text === null) throw new Error(`File not found or unreadable: ${file}`);
  return svc.parseFile(file, text);
}

function graphFor(svc: McpServices): WorkspaceGraph {
  return svc.getGraph() ?? buildWorkspaceGraph(svc.getAllParsedFiles());
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  svc: McpServices
): Promise<unknown> {
  switch (name) {
    // ── Memory tools ───────────────────────────────────────────
    case "query_semantic_index": {
      const query = String(args.query ?? "");
      const topK = Number(args.topK) || 10;
      const results = semanticSearch(query, topK);
      svc.logEpisode("query_semantic_index", `Searched: ${query}`);
      return { results };
    }
    case "get_identity_rules": {
      return { rules: getIdentityRules() };
    }
    case "get_recent_episodes": {
      const limit = Number(args.limit) || 20;
      return { episodes: getRecentEpisodes(limit) };
    }
    case "get_file_context": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return {
        file,
        structure: getFileStructure(file, cached),
        identityRules: getIdentityRules(),
        recentEpisodes: getEpisodesForFile(file, 10)
      };
    }
    case "get_shared_memory": {
      return { sharedMemory: readSharedMemory() };
    }

    // ── AST tools ──────────────────────────────────────────────
    case "get_symbol_at_position": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return getSymbolAtPosition(cached, Number(args.line), Number(args.column));
    }
    case "get_caller_hierarchy": {
      const functionName = String(args.functionName ?? "");
      const filePath = String(args.filePath ?? "");
      const graph = graphFor(svc);
      const decls = findDeclarations(graph, functionName);
      const decl = decls.find((d) => d.file === filePath) ?? decls[0];
      if (!decl) throw new Error(`No declaration found for "${functionName}"`);
      const cached = await cachedFor(svc, decl.file);
      const result = getFunctionHierarchy(decl.file, cached, graph, decl.range.startLine, 2);
      return result ?? { symbol: null, callers: [], callees: [] };
    }
    case "get_class_hierarchy": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      const result = getClassHierarchy(file, cached, graphFor(svc), Number(args.line));
      return result ?? { name: null, parents: [], children: [], interfaces: [] };
    }
    case "get_file_structure": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return getFileStructure(file, cached);
    }
    case "get_references": {
      const symbolName = String(args.symbolName ?? "");
      return getReferences(symbolName, svc.getAllParsedFiles());
    }
    case "get_dependencies": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return getDependencies(file, cached);
    }
    case "rename_symbol": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      const result = renameSymbol(file, cached, Number(args.line), Number(args.column), String(args.newName ?? ""));
      svc.logEpisode("rename_symbol", `Preview rename ${result.symbolName} -> ${result.newName} (${result.occurrences} refs)`, file);
      return result;
    }
    case "insert_code_block": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return insertCodeBlock(file, cached, Number(args.afterLine), String(args.code ?? ""));
    }
    case "replace_code_range": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return replaceCodeRange(file, cached, Number(args.startLine), Number(args.endLine), String(args.newCode ?? ""));
    }
    case "extract_symbol": {
      const file = String(args.file ?? "");
      const cached = await cachedFor(svc, file);
      return extractSymbol(file, cached, Number(args.startLine), Number(args.endLine), String(args.newName ?? ""));
    }
    case "validate_syntax": {
      if (args.file) {
        const file = String(args.file);
        const cached = await cachedFor(svc, file);
        return validateSyntax(cached.tree.rootNode);
      }
      if (args.code) {
        const language = SUPPORTED_LANGUAGES.includes(args.language as SupportedLanguage)
          ? (args.language as SupportedLanguage)
          : "typescript";
        const tree = await parseSnippet(String(args.code), language);
        return validateSyntax(tree.rootNode);
      }
      throw new Error("validate_syntax requires either 'file' or 'code'");
    }

    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

// --- MCP registration ----------------------------------------------------

export function registerTools(server: Server, services: McpServices): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: MCP_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(name, (args ?? {}) as Record<string, unknown>, services);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true
      };
    }
  });
}