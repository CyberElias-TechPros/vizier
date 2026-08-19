import { ModelProvider } from "../llm/types";

// NOTE: `../llm/provider` pulls in the `vscode` module, which only exists
// inside the VS Code extension host. The offline `evaluatePlan` must run
// anywhere (e.g. the `npm run eval` CLI), so the provider import is lazy and
// only used by the optional LLM-grading path.

export interface EvalCheck {
  name: string;
  ok: boolean;
  detail: string;
  severity: "error" | "warn" | "info";
}

export interface PlanEval {
  score: number;
  checks: EvalCheck[];
  issues: string[];
}

const VALID_STATUS = ["not_started", "in_progress", "done"];

/**
 * Offline structural evaluation of a generated plan. No network, no LLM — just
 * checks the PIM shape for the things that make a plan actually buildable.
 * Returns a 0-100 score (percentage of checks passed) and a human-readable list.
 */
export function evaluatePlan(plan: any): PlanEval {
  const checks: EvalCheck[] = [];
  const add = (name: string, ok: boolean, detail: string, severity: EvalCheck["severity"] = "error") =>
    checks.push({ name, ok, detail, severity });

  const product = plan?.product || {};
  add("product.vision present", !!product.vision, product.vision ? "ok" : "missing vision");
  add("product.target_audience present", !!product.target_audience, product.target_audience ? "ok" : "missing audience");
  add("product.mvp_scope present", !!product.mvp_scope, product.mvp_scope ? "ok" : "missing MVP scope");
  add("architecture defined", !!plan?.architecture, plan?.architecture ? "ok" : "architecture is null");

  const tasks: any[] = Array.isArray(plan?.tasks) ? plan.tasks : [];
  add("tasks exist", tasks.length > 0, `${tasks.length} tasks`);

  const ids = new Set(tasks.map((t) => t?.id));
  let depsOk = true;
  let acOk = true;
  let filesOk = true;
  const statusBad: string[] = [];

  for (const t of tasks) {
    if (!VALID_STATUS.includes(t?.status)) statusBad.push(t?.id || "?");
    if (t && (!t.acceptance_criteria || t.acceptance_criteria.length === 0)) acOk = false;
    if (t && ["feature", "infra", "test"].includes(t.task_type)) {
      if (!t.files_expected || t.files_expected.length === 0) filesOk = false;
    }
    for (const dep of t?.depends_on || []) {
      if (!ids.has(dep)) depsOk = false;
    }
  }

  add("task statuses valid", statusBad.length === 0, statusBad.length ? `bad status: ${statusBad.join(", ")}` : "ok");
  add("every task has acceptance criteria", acOk, acOk ? "ok" : "some tasks lack acceptance criteria");
  add("code tasks declare expected files", filesOk, filesOk ? "ok" : "some code tasks lack files_expected");
  add("dependency integrity", depsOk, depsOk ? "ok" : "a depends_on references a missing task id");

  const perspectives = plan?.perspectives ? Object.keys(plan.perspectives).length : 0;
  add("perspectives present", perspectives > 0, `${perspectives} perspectives`);
  add("decisions present", (plan?.decisions?.length || 0) > 0, `${plan?.decisions?.length || 0} decisions`);
  add("rules present", (plan?.rules?.length || 0) > 0, `${plan?.rules?.length || 0} rules`);

  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const issues = checks.filter((c) => !c.ok).map((c) => `[${c.severity}] ${c.name}: ${c.detail}`);

  return { score, checks, issues };
}

/**
 * Optional LLM grading (coherence / specificity / completeness / risks), 1-5 each.
 * Gated by the caller (requires an API key + network). Returns parsed scores or
 * null if grading fails. Uses the resilient `complete` wrapper (cache/backoff).
 */
export async function gradePlanWithLLM(
  plan: any,
  provider?: ModelProvider
): Promise<{ coherence: number; specificity: number; completeness: number; risks: number; rationale: string } | null> {
  const summary = {
    name: plan?.name,
    category: plan?.category,
    product: plan?.product,
    taskCount: Array.isArray(plan?.tasks) ? plan.tasks.length : 0,
    tasks: (plan?.tasks || []).map((t: any) => ({ id: t.id, title: t.title, status: t.status, type: t.task_type })),
    perspectives: plan?.perspectives ? Object.keys(plan.perspectives) : [],
    decisions: (plan?.decisions || []).map((d: any) => d.topic)
  };

  try {
    const { complete, getEffectiveModel } = await import("../llm/provider.js");
    const req = {
      system:
        "You are a senior staff engineer reviewing an AI-generated build plan. Be blunt. Respond ONLY with JSON: " +
        '{ "coherence": <1-5>, "specificity": <1-5>, "completeness": <1-5>, "risks": <1-5>, "rationale": "<short>" }',
      messages: [{ role: "user" as const, content: `Grade this plan:\n${JSON.stringify(summary, null, 2)}` }],
      model: getEffectiveModel("eval"),
      temperature: 0
    };
    const res = await complete(req, provider);
    const json = res.text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    return JSON.parse(json);
  } catch {
    return null;
  }
}
