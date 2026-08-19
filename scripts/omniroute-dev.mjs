#!/usr/bin/env node
/**
 * Minimal local "omniroute" gateway for development.
 *
 * Point Vizier's `vizier.omnirouteBaseUrl` at http://localhost:8787/v1 and set
 * `vizier.omnirouteApiKey` to any non-empty string. This server implements the
 * OpenAI-compatible /v1/chat/completions contract and proxies to a real upstream
 * (Anthropic by default), so you can develop against a "real endpoint" without
 * a hosted gateway. It is NOT for production.
 *
 * Env:
 *   OMNIROUTE_PORT        (default 8787)
 *   OMNIROUTE_UPSTREAM    "anthropic" | "openai"  (default anthropic)
 *   OMNIROUTE_API_KEY     upstream API key (required)
 *   OMNIROUTE_MODEL       upstream model id
 *   OMNIROUTE_BASE_URL    upstream base URL override
 */
import http from "node:http";

const PORT = Number(process.env.OMNIROUTE_PORT || 8787);
const UPSTREAM = (process.env.OMNIROUTE_UPSTREAM || "anthropic").toLowerCase();
const API_KEY = process.env.OMNIROUTE_API_KEY || "";
const MODEL = process.env.OMNIROUTE_MODEL || (UPSTREAM === "openai" ? "gpt-4o" : "claude-sonnet-4-20250514");

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function toAnthropic(body) {
  const msgs = [];
  let system = "";
  for (const m of body.messages || []) {
    if (m.role === "system") {
      system += (system ? "\n\n" : "") + m.content;
    } else if (m.role === "user" || m.role === "assistant") {
      msgs.push({ role: m.role, content: m.content });
    }
  }
  return {
    model: body.model || MODEL,
    system: system || undefined,
    messages: msgs,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 2000
  };
}

function fromAnthropic(data) {
  const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  return {
    id: "omniroute-dev",
    object: "chat.completion",
    model: data.model || MODEL,
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)
    }
  };
}

async function proxyOpenAI(body) {
  const base = process.env.OMNIROUTE_BASE_URL || "https://api.openai.com/v1";
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ ...body, model: body.model || MODEL })
  });
  return { status: r.status, json: await r.json() };
}

async function proxyAnthropic(body) {
  const base = process.env.OMNIROUTE_BASE_URL || "https://api.anthropic.com/v1";
  const r = await fetch(`${base}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(toAnthropic(body))
  });
  if (!r.ok) return { status: r.status, json: await r.json().catch(() => ({})) };
  return { status: 200, json: fromAnthropic(await r.json()) };
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/v1/chat/completions")) {
    return send(res, 404, { error: "not found" });
  }
  try {
    const raw = await new Promise((resolve) => {
      let d = "";
      req.on("data", (c) => (d += c));
      req.on("end", () => resolve(d));
    });
    const body = JSON.parse(raw || "{}");
    const out = UPSTREAM === "openai" ? await proxyOpenAI(body) : await proxyAnthropic(body);
    send(res, out.status, out.json);
  } catch (e) {
    send(res, 500, { error: String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`omniroute dev gateway listening on http://localhost:${PORT}/v1`);
  console.log(`  upstream=${UPSTREAM} model=${MODEL} (set OMNIROUTE_API_KEY to use)`);
});
