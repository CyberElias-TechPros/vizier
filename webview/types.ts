export type ProjectCategory = "saas" | "mobile" | "cli_tool" | "browser_ext" | "game" | "internal_tool";
export type Priority = "must" | "should" | "could";
export type TaskStatus = "not_started" | "in_progress" | "done";
export type DecisionStatus = "proposed" | "approved" | "superseded";
export type RuleCategory = "architecture" | "style" | "security" | "performance";

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
  task_type: string;
}

export interface Decision {
  id: string;
  topic: string;
  options: { name: string; pros: string[]; cons: string[] }[];
  chosen: string;
  rationale: string;
  impacts: string[];
  status: DecisionStatus;
}

export interface Product {
  vision: string;
  target_audience: string;
  mvp_scope: string;
  phase2_scope: string;
  core_workflows: string[];
}

export interface Architecture {
  frontend: { framework: string; ui_library: string; state_management: string; routing: string; };
  backend: { runtime: string; framework: string; api_style: string; };
  database: { type: string; orm: string; hosting: string; };
  auth: { strategy: string; provider: string; };
  storage: { provider: string; type: string; };
  infrastructure: { hosting: string; ci_cd: string; };
  rationale: { frontend: string; backend: string; database: string; auth: string; storage: string; infrastructure: string; };
}

export interface Entity {
  id: string;
  name: string;
  fields: { name: string; type: string; required: boolean; unique: boolean; indexed: boolean; default?: string; description?: string; }[];
  relationships: { type: "one_to_one" | "one_to_many" | "many_to_many"; target_entity: string; foreign_key?: string; description?: string; }[];
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

export interface ApiContract {
  endpoints: Endpoint[];
  notes: string;
}
