/**
 * Vizier Dashboard — React webview panel (Phase 4 §4.3).
 *
 * Tabs: Memory (semantic search + recent episodes), AST (active file
 * structure), MCP Monitor (sessions + tool-call log), Settings.
 */

import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";

interface WebviewMessage {
  type: string;
  payload?: any;
}

declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewMessage) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

function post(type: string, payload?: any) {
  vscode.postMessage({ type, payload });
}

// ── Types ────────────────────────────────────────────────────────────────

interface SearchResult {
  file_path: string;
  symbol_name: string | null;
  symbol_kind: string | null;
  start_line: number;
  end_line: number;
  score: number;
  snippet?: string;
}

interface Episode {
  id?: string;
  tool: string;
  summary: string;
  file_path?: string;
  created_at: string;
}

interface StructureSymbol {
  name: string;
  kind: string;
  range: { startLine: number; endLine: number };
  children: StructureSymbol[];
}

interface McpSession {
  id: string;
  connectedAt: string;
  toolCalls: number;
  lastActiveAt: string;
}

interface McpLogEntry {
  sessionId: string;
  tool: string;
  ok: boolean;
  message: string;
  at: string;
}

interface DashboardState {
  mcp: {
    running: boolean;
    port: number | null;
    sessions: McpSession[];
    log: McpLogEntry[];
  };
  parsedFiles: number;
}

interface VizierSettingDefinition {
  key: string;
  label: string;
  type: "boolean" | "string" | "number" | "enum" | "json";
  description: string;
  defaultValue: any;
  enumValues?: string[];
  placeholder?: string;
  secret?: boolean;
}

// ── Small UI helpers ─────────────────────────────────────────────────────

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid",
  borderColor: active ? "#4a7dff" : "#333",
  background: active ? "rgba(74, 125, 255, 0.15)" : "transparent",
  color: active ? "#8ab4ff" : "#bbb",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600
});

const cardStyle: React.CSSProperties = {
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "8px",
  background: "#1a1a1a"
};

// ── Tabs ─────────────────────────────────────────────────────────────────

function MemoryTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [searched, setSearched] = useState(false);

  const search = useCallback(() => {
    if (!query.trim()) return;
    post("MEMORY_QUERY", { query, topK: 10 });
  }, [query]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "MEMORY_QUERY_RESULT") {
        setResults(message.payload.results ?? []);
        setEpisodes(message.payload.episodes ?? []);
        setSearched(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Semantic search, e.g. 'where do we handle auth?'"
          style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #333", background: "#111", color: "#ddd", fontSize: "13px" }}
        />
        <button onClick={search} className="viz-btn viz-btn-primary" style={{ padding: "8px 16px" }}>
          Search
        </button>
      </div>

      {searched && (
        <div>
          <h3 style={{ fontSize: "13px", margin: "4px 0" }}>{results.length} result(s)</h3>
          {results.map((r, i) => (
            <div key={`${r.file_path}:${r.start_line}:${i}`} style={cardStyle}>
              <div style={{ fontWeight: 600, fontSize: "12px" }}>
                {r.symbol_name ?? "(chunk)"}{" "}
                <span style={{ opacity: 0.6, fontWeight: 400 }}>{r.symbol_kind ?? "chunk"}</span>
              </div>
              <div style={{ fontSize: "11px", opacity: 0.7 }}>
                {r.file_path}:{r.start_line}-{r.end_line} · score {r.score.toFixed(3)}
              </div>
              {r.snippet && <pre style={{ fontSize: "11px", whiteSpace: "pre-wrap", opacity: 0.85 }}>{r.snippet}</pre>}
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 style={{ fontSize: "13px", margin: "4px 0" }}>Recent episodes</h3>
        {episodes.map((e, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontWeight: 600, fontSize: "12px" }}>{e.tool}</span>{" "}
            <span style={{ fontSize: "11px", opacity: 0.75 }}>{e.summary}</span>
            <div style={{ fontSize: "10px", opacity: 0.5 }}>
              {e.file_path ?? ""} · {new Date(e.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AstTab() {
  const [symbols, setSymbols] = useState<StructureSymbol[]>([]);
  const [file, setFile] = useState<string | null>(null);

  useEffect(() => {
    post("AST_REFRESH", {});
    const handler = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "AST_STRUCTURE_RESULT") {
        setFile(message.payload.file ?? null);
        setSymbols(message.payload.symbols ?? []);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const renderSymbols = (list: StructureSymbol[], depth: number): React.ReactNode[] =>
    list.map((s, i) => (
      <div key={`${depth}:${i}:${s.name}:${s.range.startLine}`} style={{ paddingLeft: depth * 16 }}>
        <div style={cardStyle}>
          <span style={{ fontWeight: 600, fontSize: "12px" }}>{s.name}</span>{" "}
          <span style={{ fontSize: "11px", opacity: 0.6 }}>{s.kind} · L{s.range.startLine}-{s.range.endLine}</span>
        </div>
        {renderSymbols(s.children, depth + 1)}
      </div>
    ));

  return (
    <div style={{ padding: "12px" }}>
      <h3 style={{ fontSize: "13px" }}>Active file: {file ? file.split(/[\\/]/).pop() : "(none)"}</h3>
      {symbols.length === 0 ? (
        <p style={{ fontSize: "12px", opacity: 0.6 }}>No structure available. Open a source file and hit refresh.</p>
      ) : (
        renderSymbols(symbols, 0)
      )}
      <button onClick={() => post("AST_REFRESH", {})} className="viz-btn viz-btn-secondary" style={{ marginTop: "8px", padding: "6px 14px" }}>
        Refresh
      </button>
    </div>
  );
}

function McpMonitorTab() {
  const [state, setState] = useState<DashboardState["mcp"]>({ running: false, port: null, sessions: [], log: [] });

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "DASHBOARD_STATE") {
        setState(message.payload.mcp);
      }
    };
    window.addEventListener("message", handler);
    post("MCP_SNAPSHOT_REQUEST", {});
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={cardStyle}>
        <span style={{ fontWeight: 700, fontSize: "13px" }}>
          {state.running ? "● MCP bridge running" : "○ MCP bridge offline"}
        </span>
        {state.running && state.port && (
          <span style={{ fontSize: "12px", opacity: 0.7 }}> — http://localhost:{state.port}/sse</span>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: "13px", margin: "4px 0" }}>Connected agents ({state.sessions.length})</h3>
        {state.sessions.map((s) => (
          <div key={s.id} style={cardStyle}>
            <span style={{ fontWeight: 600, fontSize: "12px" }}>{s.id}</span>
            <span style={{ fontSize: "11px", opacity: 0.7 }}> — {s.toolCalls} tool call(s)</span>
            <div style={{ fontSize: "10px", opacity: 0.5 }}>connected {new Date(s.connectedAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 style={{ fontSize: "13px", margin: "4px 0" }}>Recent tool calls ({state.log.length})</h3>
        {state.log.map((entry, i) => (
          <div key={i} style={{ ...cardStyle, marginBottom: "4px", padding: "6px 10px" }}>
            <span style={{ color: entry.ok ? "#7bd88f" : "#ff8080", fontSize: "12px" }}>
              {entry.ok ? "✓" : "✗"} {entry.tool}
            </span>{" "}
            <span style={{ fontSize: "11px", opacity: 0.65 }}>
              {entry.ok ? "" : entry.message.slice(0, 80)} · {new Date(entry.at).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {state.log.length === 0 && <p style={{ fontSize: "12px", opacity: 0.6 }}>No tool calls yet.</p>}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [definitions, setDefinitions] = useState<VizierSettingDefinition[]>([]);

  useEffect(() => {
    post("GET_SETTINGS", {});
    const handler = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "SETTINGS_STATE") {
        setSettings(message.payload.settings ?? {});
        setDefinitions(message.payload.definitions ?? []);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const update = (key: string, value: any) => post("UPDATE_SETTING", { key, value });

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {definitions.map((def) => {
        const value = settings[def.key] ?? def.defaultValue;
        return (
          <div key={def.key} style={cardStyle}>
            <div style={{ fontWeight: 600, fontSize: "12px" }}>{def.label}</div>
            <div style={{ fontSize: "11px", opacity: 0.65, marginBottom: "6px" }}>{def.description}</div>
            {def.type === "boolean" && (
              <input type="checkbox" checked={!!value} onChange={(e) => update(def.key, e.target.checked)} />
            )}
            {def.type === "enum" && (
              <select
                value={value}
                onChange={(e) => update(def.key, e.target.value)}
                style={{ width: "100%", padding: "6px", background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: "6px" }}
              >
                {(def.enumValues ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {(def.type === "string" || def.type === "number") && (
              <input
                type={def.secret ? "password" : def.type === "number" ? "number" : "text"}
                value={value ?? ""}
                placeholder={def.placeholder ?? ""}
                onChange={(e) => update(def.key, def.type === "number" ? Number(e.target.value) : e.target.value)}
                style={{ width: "100%", padding: "6px", background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: "6px" }}
              />
            )}
            {def.type === "json" && (
              <textarea
                value={typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                onChange={(e) => {
                  try {
                    update(def.key, JSON.parse(e.target.value));
                  } catch {
                    update(def.key, e.target.value);
                  }
                }}
                rows={4}
                style={{ width: "100%", background: "#111", color: "#ddd", border: "1px solid #333", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────

type TabId = "memory" | "ast" | "mcp" | "settings";

function App() {
  const [tab, setTab] = useState<TabId>("memory");

  useEffect(() => {
    post("DASHBOARD_READY", {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f0f0f", color: "#ddd" }}>
      <div style={{ display: "flex", gap: "8px", padding: "10px 12px", borderBottom: "1px solid #222", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: "14px", marginRight: "8px" }}>Vizier</span>
        {(["memory", "ast", "mcp", "settings"] as TabId[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === "memory" ? "Memory" : t === "ast" ? "AST" : t === "mcp" ? "MCP Monitor" : "Settings"}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "memory" && <MemoryTab />}
        {tab === "ast" && <AstTab />}
        {tab === "mcp" && <McpMonitorTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}