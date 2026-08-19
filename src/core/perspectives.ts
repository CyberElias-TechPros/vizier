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
    id: "product_manager",
    roleId: "33-product-manager",
    label: "Product Manager",
    description: "Roadmap prioritization, scope control, user stories, success metrics",
    suggested: ["saas", "mobile", "game", "browser_ext", "cli_tool", "internal_tool"],
    system:
      "You are a product manager. Define roadmap priorities, MVP scope guardrails, user stories, and success metrics. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a product management perspective, plan scope and sequencing. Return JSON:\n" +
      '{"summary": "one paragraph on product readiness", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["product risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: roadmap prioritization, MVP scope guardrails, user-story definition, success metrics/KPIs, and stakeholder communication. 4-7 recommendations."
  },
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
    id: "ui_ux_designer",
    roleId: "37-ui-ux-designer",
    label: "UI/UX Designer",
    description: "User flows, information architecture, wireframes, usability testing",
    suggested: ["saas", "mobile", "game", "browser_ext", "internal_tool"],
    system:
      "You are a UI/UX designer. Define user flows, information architecture, interface patterns, and usability test plans. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a UI/UX design perspective, plan the product's interaction model. Return JSON:\n" +
      '{"summary": "one paragraph on the UX approach", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["UX risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: core user flows and journeys, information architecture/navigation, wireframe-level screen structure, interaction patterns, usability testing plan, and onboarding UX. 4-7 recommendations."
  },
  {
    id: "qa_engineer",
    roleId: "38-qa-engineer",
    label: "QA/Test Engineer",
    description: "Test strategy, coverage targets, test environments, release gates",
    suggested: ["saas", "mobile", "game", "cli_tool", "internal_tool", "browser_ext"],
    system:
      "You are a QA and test engineer. Plan the test strategy, coverage targets, test environments, and release gates. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a QA engineering perspective, plan verification. Return JSON:\n" +
      '{"summary": "one paragraph on the test strategy", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["quality risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: test pyramid (unit/integration/e2e), coverage targets per layer, test environments and data, CI quality gates, regression strategy, and manual test plans for critical flows. 4-7 recommendations."
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
    id: "security_engineer",
    roleId: "34-security-engineer",
    label: "Security Engineer",
    description: "Threat modeling, authN/authZ, secrets handling, compliance, OWASP",
    suggested: ["saas", "internal_tool", "cli_tool", "mobile"],
    system:
      "You are a security engineer. Plan threat modeling, authentication/authorization, secrets handling, and compliance requirements. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a security engineering perspective, plan the app's security posture. Return JSON:\n" +
      '{"summary": "one paragraph on the security posture", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["security risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: threat model (OWASP top risks), authentication/authorization flows, secrets & key management, data protection/privacy, dependency/CI security, and compliance needs. 4-7 recommendations."
  },
  {
    id: "devops_hosting_engineer",
    roleId: "35-devops-hosting-engineer",
    label: "DevOps/Hosting Engineer",
    description: "Deployment pipeline, environments, containers, DNS/CDN, cost",
    suggested: ["saas", "internal_tool", "cli_tool"],
    system:
      "You are a DevOps and hosting engineer. Plan deployment pipeline, environments, containers, DNS/CDN, and hosting cost strategy. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a DevOps/hosting perspective, plan how this app ships and runs. Return JSON:\n" +
      '{"summary": "one paragraph on the deployment strategy", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["infra/deployment risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: hosting/platform choice, CI/CD pipeline, environment strategy, containers/orchestration, DNS/CDN/SSL, backups, observability, and hosting cost projections. 4-7 recommendations."
  },
  {
    id: "maintenance_engineer",
    roleId: "36-maintenance-engineer",
    label: "Maintenance Engineer",
    description: "Post-launch upkeep, upgrades, deprecation, on-call, tech-debt paydown",
    suggested: ["saas", "internal_tool"],
    system:
      "You are a maintenance engineer. Plan post-launch upkeep: upgrade cadence, deprecation policy, on-call, and tech-debt paydown. Output ONLY valid JSON.",
    buildPrompt: (ctx) =>
      ctxSummary(ctx) +
      "\n\nFrom a maintenance engineering perspective, plan long-term upkeep. Return JSON:\n" +
      '{"summary": "one paragraph on the maintenance strategy", "recommendations": [{"title": "short", "detail": "why/how", "priority": "must|should|could"}], "risks": ["maintenance risk"], "open_questions": ["question to resolve"]}\n' +
      "Cover: dependency upgrade cadence, deprecation policy, on-call rotation, monitoring/drift detection, tech-debt paydown schedule, and knowledge transfer/documentation. 4-7 recommendations."
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
