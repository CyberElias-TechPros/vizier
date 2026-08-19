/**
 * Vizier MCP Bridge — Prompt Registry
 *
 * The three prompt templates from the architecture doc (§3.4):
 * analyze_file, refactor_symbol, explain_hierarchy.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { GetPromptRequestSchema, ListPromptsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export const MCP_PROMPTS = [
  {
    name: "analyze_file",
    description: "Analyze a file using structural tools",
    arguments: [{ name: "file", description: "Absolute file path", required: true }]
  },
  {
    name: "refactor_symbol",
    description: "Refactor a symbol with context",
    arguments: [
      { name: "file", description: "Absolute file path", required: true },
      { name: "line", description: "1-indexed line of the symbol", required: true },
      { name: "column", description: "0-indexed column of the symbol", required: true },
      { name: "newName", description: "Optional new name for the symbol" }
    ]
  },
  {
    name: "explain_hierarchy",
    description: "Explain the call/class hierarchy around a symbol",
    arguments: [
      { name: "file", description: "Absolute file path", required: true },
      { name: "line", description: "1-indexed line of the symbol", required: true }
    ]
  }
];

export function registerPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: MCP_PROMPTS }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const file = String(args?.file ?? "");
    const line = args?.line !== undefined ? Number(args.line) : undefined;
    const column = args?.column !== undefined ? Number(args.column) : undefined;
    const newName = args?.newName !== undefined ? String(args.newName) : undefined;

    switch (name) {
      case "analyze_file":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text:
                  `Analyze the file ${file} using the Vizier tools.\n\n` +
                  `1. Call get_file_structure for the file.\n` +
                  `2. Call get_dependencies to list its imports.\n` +
                  `3. Pick the 2-3 most important symbols and call get_caller_hierarchy or get_class_hierarchy on each.\n` +
                  `4. Summarize the file's responsibility, key functions, and coupling in 5-8 sentences.`
              }
            }
          ]
        };
      case "refactor_symbol":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text:
                  `Refactor the symbol at ${file}:${line}:${column ?? 0}${newName ? `, renaming it to ${newName}` : ""}.\n\n` +
                  `1. Call get_symbol_at_position to identify the symbol.\n` +
                  `2. Call get_references to find every usage.\n` +
                  `3. Call get_caller_hierarchy to understand its dependencies.\n` +
                  `4. Propose the refactor; if a rename is requested, call rename_symbol to preview the edits before changing anything.`
              }
            }
          ]
        };
      case "explain_hierarchy":
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text:
                  `Explain the hierarchy around ${file}:${line ?? ""}.\n\n` +
                  `1. Call get_symbol_at_position to identify the symbol.\n` +
                  `2. Call get_caller_hierarchy (functions) or get_class_hierarchy (classes).\n` +
                  `3. Explain callers, callees, parents, children, and interfaces in plain language.`
              }
            }
          ]
        };
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}