import { test } from "node:test";
import assert from "node:assert/strict";
import { OllamaProvider } from "../../src/llm/ollamaProvider";

function mockFetch(handler: any) {
  const orig = (globalThis as any).fetch;
  (globalThis as any).fetch = handler;
  return () => {
    (globalThis as any).fetch = orig;
  };
}

test("OllamaProvider posts to /api/chat and maps response", async () => {
  const restore = mockFetch(async (url: string, init: any) => {
    assert.equal(url, "http://localhost:11434/api/chat");
    const body = JSON.parse(init.body);
    assert.equal(body.stream, false);
    assert.equal(body.model, "llama3.2");
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.options.temperature, 0.5);
    return {
      ok: true,
      json: async () => ({
        message: { content: "hello" },
        prompt_eval_count: 5,
        eval_count: 10
      })
    };
  });

  const p = new OllamaProvider({ baseUrl: "http://localhost:11434/", model: "llama3.2" });
  const res = await p.complete({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    temperature: 0.5,
    maxTokens: 100
  });

  assert.equal(res.text, "hello");
  assert.equal(res.providerId, "ollama");
  assert.equal(res.model, "llama3.2");
  assert.equal(res.usage?.input, 5);
  assert.equal(res.usage?.output, 10);
  restore();
});

test("OllamaProvider throws a status error on non-ok", async () => {
  const restore = mockFetch(async () => ({ ok: false, status: 503, text: async () => "down" }));
  const p = new OllamaProvider({ baseUrl: "http://localhost:11434", model: "x" });
  await assert.rejects(() => p.complete({ messages: [{ role: "user", content: "hi" }] }));
  restore();
});
