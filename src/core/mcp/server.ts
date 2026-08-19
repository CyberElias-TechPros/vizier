/**
 * Vizier MCP Bridge — Server
 *
 * Creates the MCP Server with tools/resources/prompts registered and
 * wires it to the Express + SSE transport. See startMcpBridge() in
 * index.ts for the full lifecycle.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

import { McpServices, registerTools } from "./tool-registry";
import { registerResources } from "./resource-registry";
import { registerPrompts } from "./prompt-registry";
import { SessionManager } from "./session-manager";

export const BRIDGE_VERSION = "0.1.7";

export function createMcpServer(services: McpServices, sessions?: SessionManager): Server {
  const server = new Server(
    { name: "vizier-mcp-bridge", version: BRIDGE_VERSION },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  registerTools(server, services, sessions);
  registerResources(server);
  registerPrompts(server);

  return server;
}