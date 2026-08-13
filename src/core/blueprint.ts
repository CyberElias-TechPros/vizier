import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { Project, Product, Architecture, Entity, Task, Decision, Rule, Requirement, ApiContract, RepoContext, Perspective } from "../types/pim";
import { PRD_PROMPT, ARCHITECTURE_PROMPT, SCHEMA_PROMPT, API_CONTRACT_PROMPT, TASKS_PROMPT, DECISIONS_PROMPT } from "../llm/prompts";
import { parseAndValidate, ValidationError, ValidationStage } from "../llm/schemas";
import { augmentWithTestingTasks } from "./taskAugment";
import { parseSelectedPerspectives, getLens, PerspectiveContext } from "./perspectives";

let client: Anthropic | null = null;

async function getClient(): Promise<Anthropic> {
  if (client) return client;
  const config = vscode.workspace.getConfiguration("vizier");
  const apiKey = config.get<string>("anthropicApiKey");
  if (!apiKey) throw new Error("CONFIG_NO_API_KEY");
  client = new Anthropic({ apiKey });
  return client;
}

function getModel(): string {
  const config = vscode.workspace.getConfiguration("vizier");
  return config.get<string>("preferredModel", "claude-sonnet-4-20250514");
}

export async function generateBlueprint(
  idea: string,
  category: string,
  answers: Record<string, string>,
  onProgress: (stage: number, total: number, label: string) => void,
  repoContext?: RepoContext | null,
  signal?: AbortSignal,
  onUsage?: (usage: { input: number; output: number }) => void
): Promise<Project> {
  const now = new Date().toISOString();
  const perspectiveIds = parseSelectedPerspectives(answers);
  const TOTAL = 6 + perspectiveIds.length;

  let step = 0;
  const advance = (label: string) => onProgress(++step, TOTAL, label);

  advance("Generating product requirements...");
  const prd = await callLLM(PRD_PROMPT, { idea, category, answers, repoContext }, "prd", signal, onUsage);
  const product: Product = {
    vision: prd.vision,
    target_audience: prd.target_audience,
    mvp_scope: prd.mvp_scope,
    phase2_scope: prd.phase2_scope,
    core_workflows: prd.core_workflows
  };

  advance("Selecting tech stack...");
  const arch = await callLLM(ARCHITECTURE_PROMPT, { idea, category, prd, answers, repoContext }, "architecture", signal, onUsage);
  const architecture: Architecture = {
    frontend: arch.frontend,
    backend: arch.backend,
    database: arch.database,
    auth: arch.auth,
    storage: arch.storage,
    infrastructure: arch.infrastructure,
    rationale: arch.rationale
  };

  advance("Designing data model...");
  const schema = await callLLM(SCHEMA_PROMPT, { prd, architecture }, "schema", signal, onUsage);
  const entities: Entity[] = schema.entities || [];

  advance("Designing API contracts...");
  const apiResult = await callLLM(API_CONTRACT_PROMPT, { prd, architecture, entities }, "api", signal, onUsage);
  const api_contract: ApiContract = {
    endpoints: apiResult.endpoints || [],
    notes: apiResult.notes || ""
  };

  advance("Building task graph...");
  const tasksResult = await callLLM(TASKS_PROMPT, { prd, architecture, entities, api_contract, repoContext }, "tasks", signal, onUsage);
  const baseTasks: Task[] = (tasksResult.tasks || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    depends_on: t.depends_on || [],
    status: "not_started" as const,
    acceptance_criteria: t.acceptance_criteria || [],
    files_expected: t.files_expected || [],
    requirement_ids: t.requirement_ids || [],
    estimated_effort: normalizeEffort(t.estimated_effort),
    estimated_hours: Number(t.estimated_hours) || 0,
    story_points: Number(t.story_points) || 0,
    task_type: "feature" as const
  }));

  const tasks: Task[] = augmentWithTestingTasks(baseTasks, entities, api_contract);

  advance("Documenting decisions...");
  const decisionsResult = await callLLM(DECISIONS_PROMPT, { architecture, entities }, "decisions", signal, onUsage);
  const decisions: Decision[] = (decisionsResult.decisions || []).map((d: any) => ({
    id: d.id,
    topic: d.topic,
    options: d.options || [],
    chosen: d.chosen,
    rationale: d.rationale,
    impacts: d.impacts || [],
    status: "approved" as const
  }));

  const perspectives: Record<string, Perspective> = {};
  if (perspectiveIds.length > 0) {
    const ctx: PerspectiveContext = {
      idea,
      category,
      product: {
        vision: product.vision,
        target_audience: product.target_audience,
        mvp_scope: product.mvp_scope
      },
      architecture: architecture
        ? {
            frontend: architecture.frontend,
            backend: architecture.backend,
            database: architecture.database,
            auth: architecture.auth,
            infrastructure: architecture.infrastructure
          }
        : null,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title })),
      decisions: decisions.map((d) => ({ topic: d.topic }))
    };

    for (const id of perspectiveIds) {
      const lens = getLens(id);
      if (!lens) continue;
      advance(`Generating ${lens.label} perspective...`);
      const tpl = {
        system: lens.system,
        userTemplate: (c: PerspectiveContext) => lens.buildPrompt(c),
        temperature: 0.6,
        maxTokens: 1400
      };
      const res = await callLLM(tpl, ctx, "perspective", signal, onUsage);
      perspectives[id] = {
        roleId: lens.roleId,
        label: lens.label,
        summary: res.summary || "",
        recommendations: res.recommendations || [],
        risks: res.risks || [],
        open_questions: res.open_questions || []
      };
    }
  }

  const project: Project = {
    schemaVersion: "1.0.0",
    id: generateId(),
    name: extractProjectName(idea),
    category: category as any,
    created_at: now,
    updated_at: now,
    product,
    requirements: extractRequirements(prd, tasks),
    features: [],
    architecture,
    entities,
    api_contract,
    tasks,
    decisions,
    rules: extractRules(architecture),
    context_packs: [],
    perspectives,
    repo_context: repoContext || null
  };

  return project;
}

async function callLLM(
  prompt: any,
  context: any,
  stage: ValidationStage,
  signal?: AbortSignal,
  onUsage?: (usage: { input: number; output: number }) => void
): Promise<any> {
  const anthropic = await getClient();
  const model = getModel();

  let lastText = "";
  let lastError: ValidationError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw new Error("ABORTED");

    const messages: any[] = [{ role: "user", content: prompt.userTemplate(context) }];

    if (attempt > 0 && lastError) {
      messages.push({ role: "assistant", content: lastText });
      messages.push({ role: "user", content: lastError.feedback });
    }

    try {
      const response = await anthropic.messages.create(
        {
          model,
          max_tokens: prompt.maxTokens,
          temperature: prompt.temperature,
          system: prompt.system,
          messages
        },
        signal ? { signal } : undefined
      );

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      lastText = text;

      if (onUsage && response.usage) {
        onUsage({ input: response.usage.input_tokens, output: response.usage.output_tokens });
      }

      // Validation errors are caught and retried with feedback
      return parseAndValidate(text, stage);
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ValidationError) {
        lastError = error;
        if (attempt === 2) throw error;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      // Network / API failures
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error("All retries failed");
}

function normalizeEffort(value: any): string {
  const v = String(value || "").toLowerCase();
  if (["small", "medium", "large", "xl"].includes(v)) return v;
  if (v.startsWith("s")) return "small";
  if (v.startsWith("m")) return "medium";
  if (v.startsWith("l")) return "large";
  if (v.startsWith("x")) return "xl";
  return "medium";
}

function generateId(): string {
  return "proj_" + Math.random().toString(36).substring(2, 15);
}

function extractProjectName(idea: string): string {
  const words = idea.split(" ").slice(0, 5).join(" ");
  return words.length > 40 ? words.substring(0, 40) + "..." : words;
}

function extractRequirements(prd: any, tasks: Task[]): Requirement[] {
  const reqs: Requirement[] = [];
  if (prd.mvp_scope) {
    const bullets = prd.mvp_scope.split("\n").filter((s: string) => s.trim());
    bullets.forEach((b: string, i: number) => {
      reqs.push({
        id: `REQ-${String(i + 1).padStart(3, "0")}`,
        text: b.replace(/^[-*]\s*/, "").trim(),
        priority: "must",
        source: "mvp_scope"
      });
    });
  }
  return reqs;
}

function extractRules(architecture: Architecture): Rule[] {
  const rules: Rule[] = [];
  let id = 1;
  if (architecture.frontend?.framework) {
    rules.push({
      id: `RULE-${String(id++).padStart(3, "0")}`,
      category: "architecture",
      text: `Use ${architecture.frontend.framework} for all frontend code`,
      rationale: architecture.rationale?.frontend || "Selected for this project"
    });
  }
  if (architecture.database?.type) {
    rules.push({
      id: `RULE-${String(id++).padStart(3, "0")}`,
      category: "architecture",
      text: `Use ${architecture.database.type} for all data persistence`,
      rationale: architecture.rationale?.database || "Selected for this project"
    });
  }
  return rules;
}
