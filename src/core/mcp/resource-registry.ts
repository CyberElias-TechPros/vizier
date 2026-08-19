/**
 * Vizier MCP Bridge — Resource Registry
 *
 * Exposes project context as MCP resources so agents can pull context
 * summaries (architecture doc §3.3).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getIdentityRules } from "../memory/identity-queries";
import { readSharedMemory } from "../memory/shared-memory";

const IDENTITY_URI = "vizier://identity";
const SHARED_MEMORY_URI = "vizier://shared-memory";

export const MCP_RESOURCES = [
  { uri: IDENTITY_URI, name: "Project Identity Rules", mimeType: "application/json" },
  { uri: SHARED_MEMORY_URI, name: "Shared Memory Store", mimeType: "application/json" }
];

export function registerResources(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: MCP_RESOURCES }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === IDENTITY_URI) {
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ rules: getIdentityRules() }, null, 2) }]
      };
    }
    if (uri === SHARED_MEMORY_URI) {
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(readSharedMemory(), null, 2) }]
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });
}