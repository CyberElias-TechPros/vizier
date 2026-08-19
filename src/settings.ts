export type VizierSettingType = "boolean" | "string" | "number" | "enum" | "json";

export interface VizierSettingDefinition {
  key: string;
  label: string;
  type: VizierSettingType;
  description: string;
  defaultValue: any;
  enumValues?: string[];
  placeholder?: string;
  secret?: boolean;
}

export const vizierSettingDefinitions: VizierSettingDefinition[] = [
  {
    key: "vizier.provider",
    label: "Provider",
    type: "enum",
    enumValues: ["anthropic", "openai", "omniroute", "ollama"],
    defaultValue: "anthropic",
    description: "LLM provider used by the planner."
  },
  {
    key: "vizier.anthropicApiKey",
    label: "Anthropic API key",
    type: "string",
    defaultValue: "",
    placeholder: "sk-ant-...",
    secret: true,
    description: "Your Anthropic API key for Claude."
  },
  {
    key: "vizier.preferredModel",
    label: "Preferred Claude model",
    type: "enum",
    enumValues: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022"],
    defaultValue: "claude-sonnet-4-20250514",
    description: "Which Claude model to use when provider is Anthropic."
  },
  {
    key: "vizier.ollamaBaseUrl",
    label: "Ollama base URL",
    type: "string",
    defaultValue: "http://localhost:11434",
    placeholder: "http://localhost:11434",
    description: "Base URL of your local Ollama server."
  },
  {
    key: "vizier.ollamaModel",
    label: "Ollama model",
    type: "string",
    defaultValue: "llama3.2",
    placeholder: "llama3.2",
    description: "Model id pulled locally in Ollama."
  },
  {
    key: "vizier.openaiApiKey",
    label: "OpenAI API key",
    type: "string",
    defaultValue: "",
    placeholder: "sk-...",
    secret: true,
    description: "API key for the OpenAI-compatible provider."
  },
  {
    key: "vizier.openaiBaseUrl",
    label: "OpenAI base URL",
    type: "string",
    defaultValue: "https://api.openai.com/v1",
    placeholder: "https://api.openai.com/v1",
    description: "Base URL for the OpenAI-compatible API."
  },
  {
    key: "vizier.openaiModel",
    label: "OpenAI model",
    type: "string",
    defaultValue: "gpt-4o",
    placeholder: "gpt-4o",
    description: "Model id for the OpenAI-compatible provider."
  },
  {
    key: "vizier.omnirouteApiKey",
    label: "Omniroute API key",
    type: "string",
    defaultValue: "",
    placeholder: "omni-...",
    secret: true,
    description: "API key for the omniroute gateway."
  },
  {
    key: "vizier.omnirouteBaseUrl",
    label: "Omniroute base URL",
    type: "string",
    defaultValue: "https://api.openai.com/v1",
    placeholder: "https://api.openai.com/v1",
    description: "Base URL for the omniroute gateway."
  },
  {
    key: "vizier.omnirouteModel",
    label: "Omniroute model",
    type: "string",
    defaultValue: "auto",
    placeholder: "auto",
    description: "Model for omniroute; set to 'auto' to let the gateway switch models."
  },
  {
    key: "vizier.planMonitorNarrative",
    label: "Plan monitor narrative",
    type: "boolean",
    defaultValue: true,
    description: "Include an AI-written narrative in progress reports."
  },
  {
    key: "vizier.planMonitorOnStartup",
    label: "Run monitor on startup",
    type: "boolean",
    defaultValue: true,
    description: "Run a lightweight local scan on startup to populate the status indicator."
  },
  {
    key: "vizier.codePrivacyMode",
    label: "Code privacy mode",
    type: "boolean",
    defaultValue: true,
    description: "When enabled, Vizier never transmits repository source code to an LLM."
  },
  {
    key: "vizier.fallbackProvider",
    label: "Fallback provider",
    type: "enum",
    enumValues: ["", "anthropic", "openai", "omniroute"],
    defaultValue: "",
    description: "Optional secondary provider used automatically if the primary fails."
  },
  {
    key: "vizier.enableCache",
    label: "Enable response cache",
    type: "boolean",
    defaultValue: true,
    description: "Cache identical local LLM requests to reduce cost and latency."
  },
  {
    key: "vizier.stableMode",
    label: "Stable mode",
    type: "boolean",
    defaultValue: false,
    description: "Force lower-temperature generation for deterministic outputs."
  },
  {
    key: "vizier.stageModels",
    label: "Stage model overrides",
    type: "json",
    defaultValue: {},
    placeholder: '{ "classification": "gpt-4o-mini" }',
    description: "Per-stage model overrides, e.g. { \"classification\": \"gpt-4o-mini\" }"
  },
  {
    key: "vizier.monthlyBudgetTokens",
    label: "Monthly token budget",
    type: "number",
    defaultValue: 0,
    placeholder: "0",
    description: "Soft monthly token budget (0 = unlimited)."
  },
  {
    key: "vizier.verifyPlanWithGit",
    label: "Verify plan with git",
    type: "boolean",
    defaultValue: true,
    description: "Check git history for task references when monitoring a plan."
  },
  {
    key: "vizier.verifyPlanWithTests",
    label: "Verify plan with tests",
    type: "boolean",
    defaultValue: true,
    description: "Look for coverage reports and related tests when monitoring a plan."
  },
  {
    key: "vizier.autoCommitPlan",
    label: "Auto-commit exported plans",
    type: "boolean",
    defaultValue: false,
    description: "Create a git commit of the plan folder after export."
  },
  {
    key: "vizier.planTrackerWebhook",
    label: "Legacy tracker webhook",
    type: "string",
    defaultValue: "",
    placeholder: "https://example.com/webhook",
    description: "Deprecated webhook destination. Use tracker settings if possible."
  },
  {
    key: "vizier.tracker.type",
    label: "Tracker type",
    type: "enum",
    enumValues: ["", "webhook", "jira", "linear", "github"],
    defaultValue: "",
    description: "Where to sync plan tasks after progress checks."
  },
  {
    key: "vizier.tracker.dryRun",
    label: "Tracker dry run",
    type: "boolean",
    defaultValue: false,
    description: "Build the issue payload without actually calling a remote API."
  },
  {
    key: "vizier.tracker.includeDone",
    label: "Include completed tasks in tracker sync",
    type: "boolean",
    defaultValue: true,
    description: "Include tasks already marked as done during sync."
  },
  {
    key: "vizier.tracker.webhookUrl",
    label: "Tracker webhook URL",
    type: "string",
    defaultValue: "",
    placeholder: "https://example.com/webhook",
    description: "Destination URL for webhook tracking."
  },
  {
    key: "vizier.tracker.jiraBaseUrl",
    label: "Jira base URL",
    type: "string",
    defaultValue: "",
    placeholder: "https://your-domain.atlassian.net",
    description: "Jira Cloud base URL."
  },
  {
    key: "vizier.tracker.jiraEmail",
    label: "Jira email",
    type: "string",
    defaultValue: "",
    placeholder: "you@example.com",
    description: "Jira account email."
  },
  {
    key: "vizier.tracker.jiraProjectKey",
    label: "Jira project key",
    type: "string",
    defaultValue: "",
    placeholder: "PROJ",
    description: "Jira project key."
  },
  {
    key: "vizier.tracker.jiraToken",
    label: "Jira token",
    type: "string",
    defaultValue: "",
    placeholder: "ATATT-...",
    secret: true,
    description: "Jira API token for tracker sync."
  },
  {
    key: "vizier.tracker.linearToken",
    label: "Linear token",
    type: "string",
    defaultValue: "",
    placeholder: "lin_api_...",
    secret: true,
    description: "Linear personal API key."
  },
  {
    key: "vizier.tracker.linearTeamId",
    label: "Linear team id",
    type: "string",
    defaultValue: "",
    placeholder: "team_...",
    description: "Linear team id."
  },
  {
    key: "vizier.tracker.githubToken",
    label: "GitHub token",
    type: "string",
    defaultValue: "",
    placeholder: "ghp_...",
    secret: true,
    description: "GitHub personal access token (issues scope)."
  },
  {
    key: "vizier.tracker.githubOwner",
    label: "GitHub owner",
    type: "string",
    defaultValue: "",
    placeholder: "your-org-or-user",
    description: "GitHub repo owner."
  },
  {
    key: "vizier.tracker.githubRepo",
    label: "GitHub repo",
    type: "string",
    defaultValue: "",
    placeholder: "your-repo",
    description: "GitHub repo name without .git."
  },
  {
    key: "vizier.requireReviewBeforeExport",
    label: "Require review before export",
    type: "boolean",
    defaultValue: true,
    description: "Require a human review acknowledgement before exporting a generated plan."
  },
  {
    key: "vizier.mcpEnabled",
    label: "MCP bridge enabled",
    type: "boolean",
    defaultValue: true,
    description: "Expose Vizier's memory and AST tools to MCP clients over localhost SSE."
  },
  {
    key: "vizier.mcpPort",
    label: "MCP bridge port",
    type: "number",
    defaultValue: 3000,
    placeholder: "3000",
    description: "Local port for the MCP bridge (SSE endpoint at http://localhost:PORT/sse)."
  }
];

export function getDefaultVizierSettings(): Record<string, any> {
  return Object.fromEntries(vizierSettingDefinitions.map((def) => [def.key, def.defaultValue]));
}
