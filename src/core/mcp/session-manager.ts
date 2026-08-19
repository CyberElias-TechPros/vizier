/**
 * Vizier MCP Bridge — Session Manager
 *
 * Tracks connected agents/clients, their activity, and a bounded in-memory
 * log of tool invocations (for the MCP Monitor in the Phase 4 dashboard).
 * Lifecycle: a session is registered when an SSE client connects and
 * removed when the transport closes.
 */

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface McpSessionInfo {
  id: string;
  connectedAt: string;
  toolCalls: number;
  lastActiveAt: string;
}

export interface McpLogEntry {
  sessionId: string;
  tool: string;
  ok: boolean;
  message: string;
  at: string;
}

export interface McpLogOptions {
  /** Maximum log entries kept (ring buffer). Default 500. */
  maxEntries?: number;
}

export class SessionManager {
  private sessions = new Map<string, McpSessionInfo>();
  private log: McpLogEntry[] = [];
  private readonly maxEntries: number;
  private nextId = 1;

  constructor(options: McpLogOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;
  }

  register(transport: Transport, explicitId?: string): string {
    const id = explicitId ?? `session-${this.nextId++}`;
    const now = new Date().toISOString();
    this.sessions.set(id, { id, connectedAt: now, toolCalls: 0, lastActiveAt: now });

    transport.onclose = () => this.remove(id);
    return id;
  }

  recordToolCall(id: string, tool: string, ok: boolean, message: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.toolCalls += 1;
      session.lastActiveAt = new Date().toISOString();
    }
    this.log.push({ sessionId: id, tool, ok, message, at: new Date().toISOString() });
    if (this.log.length > this.maxEntries) {
      this.log.splice(0, this.log.length - this.maxEntries);
    }
  }

  getLog(limit?: number): McpLogEntry[] {
    const entries = limit && limit > 0 ? this.log.slice(-limit) : this.log;
    return entries.slice();
  }

  remove(id: string): void {
    this.sessions.delete(id);
  }

  get(id: string): McpSessionInfo | undefined {
    return this.sessions.get(id);
  }

  list(): McpSessionInfo[] {
    return Array.from(this.sessions.values());
  }

  get count(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
    this.log = [];
  }
}