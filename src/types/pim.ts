export type ProjectCategory =
  | "saas"
  | "mobile"
  | "cli_tool"
  | "browser_ext"
  | "game"
  | "internal_tool";

export type Priority = "must" | "should" | "could";

export type TaskStatus = "not_started" | "in_progress" | "done";

export type DecisionStatus = "proposed" | "approved" | "superseded";

export type RuleCategory = "architecture" | "style" | "security" | "performance";

export interface ClassificationResult {
  category: ProjectCategory;
  confidence: number;
  reasoning: string;
}

export interface Project {
  schemaVersion: string;
  id: string;
  name: string;
  category: ProjectCategory;
  created_at: string;
  updated_at: string;
  product: Product;
  requirements: Requirement[];
  features: Feature[];
  architecture: Architecture | null;
  entities: Entity[];
  api_contract: ApiContract | null;
  tasks: Task[];
  decisions: Decision[];
  rules: Rule[];
  context_packs: ContextPack[];
  repo_context: RepoContext | null;
}

export type TaskType = "feature" | "infra" | "test" | "setup";

export type EffortSize = "small" | "medium" | "large" | "xl";

export interface ApiContract {
  endpoints: Endpoint[];
  notes: string;
}

export interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  request?: any;
  response?: any;
  auth: boolean;
  tags: string[];
}

export interface RepoContext {
  exists: boolean;
  root: string;
  packageJson: {
    name?: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  } | null;
  languages: string[];
  frameworks: string[];
  fileCount: number;
  topDirectories: string[];
  hasExistingPlan: boolean;
  readmeSnippet?: string;
  existingAgentRules?: string;
  summary: string;
}

export interface Product {
  vision: string;
  target_audience: string;
  mvp_scope: string;
  phase2_scope: string;
  core_workflows: string[];
}

export interface Requirement {
  id: string;
  text: string;
  priority: Priority;
  source: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  requirement_ids: string[];
}

export interface Architecture {
  frontend: {
    framework: string;
    ui_library: string;
    state_management: string;
    routing: string;
  };
  backend: {
    runtime: string;
    framework: string;
    api_style: string;
  };
  database: {
    type: string;
    orm: string;
    hosting: string;
  };
  auth: {
    strategy: string;
    provider: string;
  };
  storage: {
    provider: string;
    type: string;
  };
  infrastructure: {
    hosting: string;
    ci_cd: string;
  };
  rationale: {
    frontend: string;
    backend: string;
    database: string;
    auth: string;
    storage: string;
    infrastructure: string;
  };
}

export interface Entity {
  id: string;
  name: string;
  fields: Field[];
  relationships: Relationship[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  default?: string;
  description?: string;
}

export interface Relationship {
  type: "one_to_one" | "one_to_many" | "many_to_many";
  target_entity: string;
  foreign_key?: string;
  description?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  depends_on: string[];
  status: TaskStatus;
  acceptance_criteria: string[];
  files_expected: string[];
  requirement_ids: string[];
  estimated_effort: string;
  estimated_hours: number;
  story_points: number;
  task_type: TaskType;
}

export interface Decision {
  id: string;
  topic: string;
  options: Option[];
  chosen: string;
  rationale: string;
  impacts: string[];
  status: DecisionStatus;
}

export interface Option {
  name: string;
  pros: string[];
  cons: string[];
}

export interface Rule {
  id: string;
  category: RuleCategory;
  text: string;
  rationale: string;
}

export interface ContextPack {
  task_id: string;
  summary: string;
  requirements: Requirement[];
  entities: Entity[];
  decisions: Decision[];
  rules: Rule[];
  files: string[];
  do_not: string[]; 
}
