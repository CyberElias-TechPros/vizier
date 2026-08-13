import { Question } from "../types/questionBank";
import { ProjectCategory } from "../types/pim";

export interface PerspectiveContext {
  idea: string;
  category: string;
  product: { vision: string; target_audience: string; mvp_scope: string };
  architecture: {
    frontend?: any;
    backend?: any;
    database?: any;
    auth?: any;
    infrastructure?: any;
  } | null;
  tasks: { id: string; title: string }[];
  decisions: { topic: string }[];
}

export interface PerspectiveLens {
  id: string;
  roleId: string;
  label: string;
  description: string;
  suggested: ProjectCategory[];
  system: string;
  buildPrompt: (ctx: PerspectiveContext) => string;
}

function ctxSummary(ctx: PerspectiveContext): string {
  const a = ctx.architecture;
  const stack = a
    ? [
        a.frontend?.framework,
        a.backend?.framework,
        a.database?.type,
        a.auth?.strategy,
        a.infrastructure?.hosting
      ]
        .filter(Boolean)
        .join(", ")
    : "unknown";
  const tasks = ctx.tasks.map((t) => "- " + t.id + ": " + t.title).join("\n");
  const decisions = ctx.decisions.map((d) => "- " + d.topic).join("\n") || "(none yet)";
  return (
    "App idea: " + ctx.idea +
    "\nCategory: " + ctx.category +
    "\nVision: " + ctx.product.vision +
    "\nTarget audience: " + ctx.product.target_audience +
    "\nMVP scope: " + ctx.product.mvp_scope +
    "\nTech stack (so far): " + stack +
    "\nKey build tasks:\n" + tasks +
    "\nKey decisions:\n" + decisions
  );
}

export const PERSPECTIVE_LENSES: PerspectiveLens[] = [
  {
    id: "developer",
    roleId: "23-developer",
    label: "Developer",
    description: "Engineering & build best-practices, code structure, tech-debt guardrails",
    suggested: ["cli_tool", "internal_tool"],
    system:
      "You are a senior software engineer reviewing a build plan. Identify engineering risks, code-organization guidance, testing strategy, and tech-debt guardrails. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a senior engineering perspective, review this plan. Return JSON:\n" +
      '{"summary": "one paragraph on engineering readiness", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["engineering risk"], "open_questions": ["question to resolve"]}\n' +
      "Focus on: module/code structure, testing strategy, CI hygiene, tech-debt, maintainability, and developer experience. 4-7 recommendations."
  },
  {
    id: "visual_ux_designer",
    roleId: "32-visual-ux-designer",
    label: "Visual/UX Designer",
    description: "Design system, component library, UX flows, accessibility (WCAG)",
    suggested: ["saas", "mobile", "game", "browser_ext"],
    system:
      "You are a senior visual/UX designer. Define a design system, component approach, key UX flows, and accessibility requirements for the app. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a visual/UX design perspective, plan the product's experience. Return JSON:\n" +
      '{"summary": "one paragraph on the design direction", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["UX/design risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: design language/tokens, component library, core screens/flows, responsive/mobile behavior, and WCAG accessibility targets. 4-7 recommendations."
  },
  {
    id: "growth_specialist",
    roleId: "30-growth-specialist",
    label: "Growth Specialist",
    description: "Acquisition funnels, SEO, activation/retention, experiments",
    suggested: ["saas", "mobile", "game", "browser_ext"],
    system:
      "You are a growth specialist. Define acquisition channels, funnel, activation/retention loops, SEO, and experiment ideas. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a growth perspective, plan how this product acquires and retains users. Return JSON:\n" +
      '{"summary": "one paragraph on the growth strategy", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["growth risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: acquisition channels, funnel stages (AARRR), activation, retention/referral loops, SEO, and a starter experiment list. 4-7 recommendations."
  },
  {
    id: "behavioral_designer",
    roleId: "29-behavioral-designer",
    label: "Behavioral Designer",
    description: "User psychology, motivation loops, ethical guardrails",
    suggested: ["game", "mobile", "saas"],
    system:
      "You are a behavioral designer. Design motivation loops, habit formation, onboarding psychology, and ethical guardrails. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a behavioral design perspective, plan how the product shapes user behavior. Return JSON:\n" +
      '{"summary": "one paragraph on the behavioral approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["ethical/behavioral risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: motivation/reward loops, habit formation, onboarding psychology, feedback, and ethical guardrails against manipulation. 4-7 recommendations."
  },
  {
    id: "product_marketing_manager",
    roleId: "28-product-marketing-manager",
    label: "Product Marketing Manager",
    description: "Positioning, ICP, competitive differentiation, launch messaging",
    suggested: ["saas", "mobile", "browser_ext"],
    system:
      "You are a product marketing manager. Define positioning, ideal customer profile, differentiation, and launch messaging. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a product marketing perspective, plan positioning and launch. Return JSON:\n" +
      '{"summary": "one paragraph on positioning", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["marketing risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: target ICP, unique value proposition, competitive differentiation, pricing/packaging posture, and launch messaging. 4-7 recommendations."
  },
  {
    id: "conversion_copywriter",
    roleId: "27-conversion-copywriter",
    label: "Conversion Copywriter",
    description: "Landing page structure, CRO, CTAs",
    suggested: ["saas", "mobile"],
    system:
      "You are a conversion copywriter. Plan landing-page structure, CRO strategy, and calls-to-action. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a conversion copywriting perspective, plan the landing/activation experience. Return JSON:\n" +
      '{"summary": "one paragraph on the conversion approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["CRO risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: page structure, hero/CTA messaging, objection handling, and key conversion experiments. 4-7 recommendations."
  },
  {
    id: "global_market_copywriter",
    roleId: "31-global-market-copywriter",
    label: "Global Market Copywriter",
    description: "Local-market tone, cultural adaptation, i18n plan",
    suggested: ["saas", "mobile", "game"],
    system:
      "You are a global market copywriter. Plan localization, market tone, cultural adaptation, and an i18n strategy. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a global market copywriting perspective, plan localization. Return JSON:\n" +
      '{"summary": "one paragraph on the localization approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["localization risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: target markets, tone adaptation, cultural pitfalls, i18n engineering needs, and rollout order. 4-7 recommendations."
  },
  {
    id: "marketing_officer",
    roleId: "21-marketing-officer",
    label: "Marketing Officer",
    description: "Campaigns, channels, budget allocation",
    suggested: ["saas", "mobile", "game"],
    system:
      "You are a marketing officer. Plan campaign calendar, channels, and budget allocation. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a marketing officer perspective, plan go-to-market execution. Return JSON:\n" +
      '{"summary": "one paragraph on the marketing plan", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["marketing execution risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: channel mix, campaign calendar (launch + sustained), budget posture, partnerships, and measurement. 4-7 recommendations."
  },
  {
    id: "system_administrator",
    roleId: "24-system-administrator",
    label: "System Administrator",
    description: "Infra topology, config management, permissions/IAM, monitoring",
    suggested: ["internal_tool", "saas", "cli_tool"],
    system:
      "You are a system administrator. Plan infrastructure topology, configuration management, IAM/permissions, and monitoring. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a system administration perspective, plan reliable operations. Return JSON:\n" +
      '{"summary": "one paragraph on the ops/infra approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["ops/reliability risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: environment strategy (dev/stage/prod), IAM/permissions, config/secrets management, monitoring/alerting, backup, and scaling. 4-7 recommendations."
  },
  {
    id: "it_support",
    roleId: "22-it-support",
    label: "IT Support",
    description: "Support tooling, ticketing, self-serve docs, SLAs, runbooks",
    suggested: ["internal_tool"],
    system:
      "You are an IT support lead. Plan support tooling, ticketing, self-serve docs, SLAs, and runbooks. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom an IT support perspective, plan the support experience. Return JSON:\n" +
      '{"summary": "one paragraph on the support approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["support risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: support channels, ticketing, self-serve docs/knowledge base, SLA targets, and operational runbooks. 4-7 recommendations."
  }
];

const LENS_BY_ID = new Map(PERSPECTIVE_LENSES.map((l) => [l.id, l]));

export function getAllLenses(): PerspectiveLens[] {
  return PERSPECTIVE_LENSES;
}

export function getLens(id: string): PerspectiveLens | undefined {
  return LENS_BY_ID.get(id);
}

export function suggestedLensIds(category: ProjectCategory): string[] {
  return PERSPECTIVE_LENSES.filter((l) => l.suggested.includes(category)).map((l) => l.id);
}

/**
 * Parse the comma-separated "perspectives" answer into known lens ids.
 */
export function parseSelectedPerspectives(answers: Record<string, string>): string[] {
  const raw = answers["perspectives"] || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => LENS_BY_ID.has(id));
}

/**
 * Build the cross-cutting "expert perspectives" multi-select question, with
 * category-appropriate lenses pre-selected as the default.
 */
export function buildPerspectivesQuestion(category: ProjectCategory): Question {
  return {
    id: "perspectives",
    category: "all",
    text: "Which expert perspectives should the plan include?",
    type: "multi_select",
    options: PERSPECTIVE_LENSES.map((l) => ({
      value: l.id,
      label: l.label,
      description: l.description
    })),
    default: suggestedLensIds(category).join(","),
    tooltip:
      "Each selected expert adds a focused section to the plan (design, growth, marketing, ops, support, etc.). Recommended ones are pre-selected for this app type.",
    required: false,
    mapsTo: "perspectives"
  };
}
