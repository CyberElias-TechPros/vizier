import { test } from "node:test";
import assert from "node:assert/strict";

import { complete, getEffectiveModel, clearProviderCache } from "../../src/llm/provider";

class FakeProvider {
  id = "fake";
  calls = 0;
  async complete(req: any) {
    this.calls++;
    return { text: "hello", usage: { input: 1, output: 2 } };
  }
}

test("complete() caches identical requests (no second provider call)", async () => {
  clearProviderCache();
  const u = Math.random().toString(36).slice(2);
  const p = new FakeProvider();
  const req = { system: `s-${u}`, messages: [{ role: "user", content: `x-${u}` }], maxTokens: 10, temperature: 0.5 };
  const r1 = await complete(req, p as any);
  const r2 = await complete(req, p as any);
  assert.equal(r1.text, "hello");
  assert.equal(p.calls, 1, "second call served from cache");
  assert.equal(r2.cached, true);
});

test("complete() does not cache across different requests", async () => {
  clearProviderCache();
  const u = Math.random().toString(36).slice(2);
  const p = new FakeProvider();
  await complete({ system: `a-${u}`, messages: [{ role: "user", content: `1-${u}` }] }, p as any);
  await complete({ system: `b-${u}`, messages: [{ role: "user", content: `2-${u}` }] }, p as any);
  assert.equal(p.calls, 2, "different prompts are not cached");
});

test("getEffectiveModel returns the default Anthropic model when no override", () => {
  assert.equal(getEffectiveModel(), "claude-sonnet-4-20250514");
  assert.equal(getEffectiveModel("classification"), "claude-sonnet-4-20250514");
});
