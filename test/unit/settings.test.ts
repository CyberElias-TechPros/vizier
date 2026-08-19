import test from "node:test";
import assert from "node:assert/strict";

import { vizierSettingDefinitions } from "../../src/settings";

test("all editable Vizier settings are exposed in UI metadata", () => {
  const keys = new Set(vizierSettingDefinitions.map((setting) => setting.key));

  assert.ok(keys.has("vizier.provider"));
  assert.ok(keys.has("vizier.anthropicApiKey"));
  assert.ok(keys.has("vizier.openaiApiKey"));
  assert.ok(keys.has("vizier.openaiBaseUrl"));
  assert.ok(keys.has("vizier.omnirouteApiKey"));
  assert.ok(keys.has("vizier.ollamaBaseUrl"));
  assert.ok(keys.has("vizier.planMonitorNarrative"));
  assert.ok(keys.has("vizier.enableCache"));
  assert.ok(keys.has("vizier.tracker.type"));
  assert.ok(keys.has("vizier.requireReviewBeforeExport"));
  assert.ok(keys.size >= 25);
});
