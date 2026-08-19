/**
 * Vizier AST Engine — module entry point
 *
 * Exposes the parser engine, all 12 tools, and the workspace graph.
 * The MCP bridge (Phase 3) and the extension commands consume these.
 */

export * from "./parser-engine";
export * from "./get-symbol-at-position";
export * from "./function-hierarchy";
export * from "./class-hierarchy";
export * from "./get-file-structure";
export * from "./references";
export * from "./dependencies";
export * from "./type-info";
export * from "./rename";
export * from "./insert-code";
export * from "./replace-code-range";
export * from "./extract-symbol";
export * from "./validate-syntax";
export * from "./edit-utils";
export * from "./workspace-graph";