/**
 * Vizier MCP Bridge — Session Manager
 *
 * Tracks connected agents/clients and their activity so the bridge can
 * report who is connected and how much they've used it. Lifecycle: a
 * session is registered when an SSE client connects and removed when the
 * transport closes.
 */

import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface McpSessionInfo {
  id: string;
  connectedAt: string;
  toolCalls: number;
  lastActiveAt: string;
}

export class SessionManager {
  private sessions = new Map<string, McpSessionInfo>();
  private nextId = 1;

  register(transport: Transport, explicitId?: string): string {
    const id = explicitId ?? `session-${this.nextId++}`;
    const now = new Date().toISOString();
    this.sessions.set(id, { id, connectedAt: now, toolCalls: 0, lastActiveAt: now });

    transport.onclose = () => this.remove(id);
    return id;
  }

  recordToolCall(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.toolCalls += 1;
    session.lastActiveAt = new Date().toISOString();
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
  }
}