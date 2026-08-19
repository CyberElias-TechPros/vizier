/**
 * Vizier MCP Bridge — module entry point
 *
 * startMcpBridge() is the production entry: it creates the MCP server,
 * wires the Express + SSE transport, listens on the given port, and
 * returns a handle with dispose(). The extension calls this on activate
 * and disposes on shutdown.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import express from "express";

import { createMcpServer } from "./server";
import { createSseApp } from "./transport-sse";
import { SessionManager } from "./session-manager";

export * from "./tool-registry";
export * from "./resource-registry";
export * from "./prompt-registry";
export * from "./transport-sse";
export * from "./session-manager";
export * from "./server";

export interface McpBridgeHandle {
  server: Server;
  app: express.Express;
  sessions: SessionManager;
  port: number;
  dispose(): Promise<void>;
}

export async function startMcpBridge(services: Parameters<typeof createMcpServer>[0], port: number): Promise<McpBridgeHandle> {
  const server = createMcpServer(services);
  const sessions = new SessionManager();
  const app = createSseApp(server, sessions);

  const listener = app.listen(port);

  await new Promise<void>((resolve, reject) => {
    listener.once("listening", () => resolve());
    listener.once("error", (err) => reject(err));
  });

  return {
    server,
    app,
    sessions,
    port,
    dispose: async () => {
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      await server.close();
      sessions.clear();
    }
  };
}