import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import os from "node:os";

import type { ModelProvider } from "../../src/llm/provider";
import { classifyIdea } from "../../src/llm/client";
import { generateBlueprint } from "../../src/core/blueprint";
import { exportPlan } from "../../src/export";

const CATEGORIES = ["saas", "mobile", "cli_tool", "browser_ext", "game", "internal_tool"];

test("manifest activates the vizier sidebar view", () => {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  assert.ok(Array.isArray(pkg.activationEvents), "activationEvents should be declared");
  assert.ok(pkg.activationEvents.includes("onView:vizier.sidebar"), "sidebar view must activate the extension");
});

function stageFromSystem(system: string): string {
  const s = system.toLowerCase();
  if (s.includes("software project classifier")) return "classification";
  if (s.includes("product manager")) return "prd";
  if (s.includes("senior software architect") && s.includes("tech stack")) return "architecture";
  if (s.includes("database architect")) return "schema";
  if (s.includes("backend api architect")) return "api";
  if (s.includes("senior developer breaking down")) return "tasks";
  if (s.includes("architect documenting")) return "decisions";
  if (s.includes("senior software engineer reviewing")) return "developer";
  if (s.includes("visual/ux designer")) return "visual_ux_designer";
  if (s.includes("growth specialist")) return "growth_specialist";
  if (s.includes("behavioral designer")) return "behavioral_designer";
  if (s.includes("product marketing manager")) return "product_marketing_manager";
  if (s.includes("conversion copywriter")) return "conversion_copywriter";
  if (s.includes("global market copywriter")) return "global_market_copywriter";
  if (s.includes("marketing officer")) return "marketing_officer";
  if (s.includes("system administrator")) return "system_administrator";
  if (s.includes("it support lead")) return "it_support";
  return "unknown";
}

function cannedFor(stage: string): unknown {
  switch (stage) {
    case "classification":
      return { category: "saas", confidence: 0.95, reasoning: "looks like a saas app" };
    case "prd":
      return {
        vision: "A focused app",
        target_audience: "Busy people",
        mvp_scope: "- Feature A\n- Feature B",
        phase2_scope: "- Later",
        core_workflows: ["signup", "use"]
      };
    case "architecture":
      return {
        frontend: { framework: "React", ui_library: "MUI", state_management: "Redux", routing: "React Router" },
        backend: { runtime: "Node", framework: "Express", api_style: "REST" },
        database: { type: "PostgreSQL", orm: "Prisma", hosting: "RDS" },
        auth: { strategy: "email_password", provider: "Auth0" },
        storage: { provider: "S3", type: "object" },
        infrastructure: { hosting: "Vercel", ci_cd: "GitHub Actions" },
        rationale: {
          frontend: "popular",
          backend: "simple",
          database: "relational",
          auth: "standard",
          storage: "s3",
          infrastructure: "cheap"
        }
      };
    case "schema":
      return {
        entities: [
          {
            id: "ENT-001",
            name: "User",
            fields: [{ name: "id", type: "string", required: true }],
            relationships: []
          }
        ]
      };
    case "api":
      return {
        endpoints: [
          { method: "GET", path: "/api/users", summary: "List users", auth: true, tags: ["User"] }
        ],
        notes: ""
      };
    case "tasks":
      return {
        tasks: [
          {
            id: "TASK-001",
            title: "Scaffold",
            description: "d",
            depends_on: [],
            acceptance_criteria: ["ac"],
            files_expected: ["x"],
            requirement_ids: [],
            estimated_effort: "medium",
            estimated_hours: 5,
            story_points: 3
          }
        ]
      };
    case "decisions":
      return {
        decisions: [
          {
            id: "DEC-001",
            topic: "Stack",
            options: [{ name: "A", pros: ["p"], cons: ["c"] }],
            chosen: "A",
            rationale: "r",
            impacts: ["i"],
            status: "approved"
          }
        ]
      };
    default:
      return {
        summary: "Mock perspective summary.",
        recommendations: [{ title: "Do X", detail: "because", priority: "should" }],
        risks: ["risk"],
        open_questions: ["q"]
      };
  }
}

class MockProvider implements ModelProvider {
  id = "mock";
  jsonCalls = 0;
  chatCalls = 0;

  async complete(req: {
    system?: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<{ text: string; usage: { input: number; output: number } }> {
    const stage = stageFromSystem(req.system || "");
    if (stage === "unknown") {
      // Should not happen for this test suite.
      return { text: `{"summary":"unknown","recommendations":[],"risks":[],"open_questions":[]}`, usage: { input: 1, output: 1 } };
    }
    this.jsonCalls++;
    return { text: JSON.stringify(cannedFor(stage)), usage: { input: 10, output: 20 } };
  }
}

test("end-to-end: classify -> blueprint (with perspectives) -> export", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vizier-smoke-"));
  process.env.VIZIER_TEST_WS = ws;

  const provider = new MockProvider();

  const category = (await classifyIdea("A habit tracking mobile app with streaks", provider)).category;
  assert.ok(CATEGORIES.includes(category), "classifyIdea returned a valid category: " + category);

  const project = await generateBlueprint(
    "A habit tracking mobile app",
    category,
    { perspectives: "visual_ux_designer,developer" },
    () => {},
    null,
    undefined,
    undefined,
    provider
  );

  assert.ok(project.architecture, "architecture present");
  assert.ok(project.tasks.length >= 1, "tasks present");
  assert.ok(project.perspectives, "perspectives object present");
  assert.ok(project.perspectives!["visual_ux_designer"], "visual_ux_designer perspective generated");
  assert.ok(project.perspectives!["developer"], "developer perspective generated");
  assert.ok(
    project.perspectives!["visual_ux_designer"].recommendations.length >= 1,
    "perspective has recommendations"
  );

  const result = await exportPlan(project);
  assert.equal(result.success, true, "export succeeded: " + result.errors.join("; "));
  assert.ok(fs.existsSync(path.join(ws, "plan", "perspectives.md")), "perspectives.md written");
  assert.ok(fs.existsSync(path.join(ws, "plan", "architecture.md")), "architecture.md written");
  assert.ok(fs.existsSync(path.join(ws, "plan", "overview.md")), "overview.md written");
  assert.ok(fs.existsSync(path.join(ws, "plan", "plan.json")), "machine-readable plan.json written");

  const overview = fs.readFileSync(path.join(ws, "plan", "overview.md"), "utf8");
  assert.ok(overview.includes("Disclaimer"), "generated plan docs carry a disclaimer");
});
