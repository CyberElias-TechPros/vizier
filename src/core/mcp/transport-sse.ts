/**
 * Vizier MCP Bridge — SSE Transport (Express)
 *
 * Express app exposing:
 *   GET  /sse        — MCP SSE stream endpoint (any MCP client connects here)
 *   POST /messages   — client -> server messages, routed by the sessionId
 *                      the client echoes from the `endpoint` SSE event
 *   GET  /health     — bridge health + session stats
 *
 * Supports multiple concurrent SSE sessions. Each /sse connection gets its
 * own SSEServerTransport, keyed by the SDK-generated transport.sessionId
 * (the canonical pattern from the SDK's own simpleSseServer example).
 */

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SessionManager } from "./session-manager";

export function createSseApp(server: Server, sessions: SessionManager): express.Express {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, SSEServerTransport>();
  let lastConnectedId: string | null = null;

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);
    lastConnectedId = sessionId;
    sessions.register(transport, sessionId);

    res.on("close", () => {
      transports.delete(sessionId);
      sessions.remove(sessionId);
    });

    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const clientSessionId = req.query.sessionId as string | undefined;
    const sessionId = clientSessionId ?? lastConnectedId;
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).json({ error: "No active SSE session" });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, sessions: sessions.list() });
  });

  return app;
}