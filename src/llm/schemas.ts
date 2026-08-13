import { z } from "zod";

/**
 * Loose string that tolerates non-string inputs by coercing to string.
 */
const looseString = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((v) => (typeof v === "string" ? v : String(v)))
  .catch("");

const looseStringArray = z
  .array(z.union([z.string(), z.number()]).transform((v) => String(v)))
  .catch([]);

export const prdSchema = z
  .object({
    vision: looseString,
    target_audience: looseString,
    mvp_scope: looseString,
    phase2_scope: looseString,
    core_workflows: looseStringArray
  })
  .passthrough();

export const architectureSchema = z
  .object({
    frontend: z
      .object({
        framework: looseString,
        ui_library: looseString,
        state_management: looseString,
        routing: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    backend: z
      .object({
        runtime: looseString,
        framework: looseString,
        api_style: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    database: z
      .object({
        type: looseString,
        orm: looseString,
        hosting: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    auth: z
      .object({
        strategy: looseString,
        provider: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    storage: z
      .object({
        provider: looseString,
        type: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    infrastructure: z
      .object({
        hosting: looseString,
        ci_cd: looseString
      })
      .partial()
      .passthrough()
      .catch({}),
    rationale: z
      .object({
        frontend: looseString,
        backend: looseString,
        database: looseString,
        auth: looseString,
        storage: looseString,
        infrastructure: looseString
      })
      .partial()
      .passthrough()
      .catch({})
  })
  .passthrough();

export const schemaSchema = z
  .object({
    entities: z
      .array(
        z
          .object({
            id: looseString,
            name: looseString,
            fields: z
              .array(
                z
                  .object({
                    name: looseString,
                    type: looseString,
                    required: z.boolean().catch(false),
                    unique: z.boolean().catch(false),
                    indexed: z.boolean().catch(false),
                    default: looseString.optional(),
                    description: looseString.optional()
                  })
                  .passthrough()
              )
              .catch([]),
            relationships: z
              .array(
                z
                  .object({
                    type: looseString,
                    target_entity: looseString,
                    foreign_key: looseString.optional(),
                    description: looseString.optional()
                  })
                  .passthrough()
              )
              .catch([])
          })
          .passthrough()
      )
      .catch([])
  })
  .passthrough();

export const apiContractSchema = z
  .object({
    endpoints: z
      .array(
        z
          .object({
            method: looseString,
            path: looseString,
            summary: looseString,
            description: looseString.optional(),
            request: z.any().optional(),
            response: z.any().optional(),
            auth: z.boolean().catch(true),
            tags: looseStringArray
          })
          .passthrough()
      )
      .catch([]),
    notes: looseString.optional()
  })
  .passthrough();

export const tasksSchema = z
  .object({
    tasks: z
      .array(
        z
          .object({
            id: looseString,
            title: looseString,
            description: looseString,
            depends_on: looseStringArray,
            acceptance_criteria: looseStringArray,
            files_expected: looseStringArray,
            requirement_ids: looseStringArray,
            estimated_effort: looseString,
            estimated_hours: z.coerce.number().catch(0),
            story_points: z.coerce.number().catch(0)
          })
          .passthrough()
      )
      .catch([])
  })
  .passthrough();

export const decisionsSchema = z
  .object({
    decisions: z
      .array(
        z
          .object({
            id: looseString,
            topic: looseString,
            options: z
              .array(
                z
                  .object({
                    name: looseString,
                    pros: looseStringArray,
                    cons: looseStringArray
                  })
                  .passthrough()
              )
              .catch([]),
            chosen: looseString,
            rationale: looseString,
            impacts: looseStringArray,
            status: looseString
          })
          .passthrough()
      )
      .catch([])
  })
  .passthrough();

export const classificationSchema = z
  .object({
    category: looseString,
    confidence: z.coerce.number().catch(0.5),
    reasoning: looseString
  })
  .passthrough();

export type ValidationStage =
  | "prd"
  | "architecture"
  | "schema"
  | "api"
  | "tasks"
  | "decisions"
  | "classification";

const schemaByStage: Record<ValidationStage, z.ZodTypeAny> = {
  prd: prdSchema,
  architecture: architectureSchema,
  schema: schemaSchema,
  api: apiContractSchema,
  tasks: tasksSchema,
  decisions: decisionsSchema,
  classification: classificationSchema
};

/**
 * Extract a JSON object from arbitrary LLM text (handles ```json fences and trailing prose).
 */
export function extractJsonObject(text: string): unknown {
  if (!text || !text.trim()) {
    throw new Error("Empty response from model");
  }

  // Try fenced code block first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;

  // Find the outermost balanced JSON object
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in response");
  }

  // Walk to find the matching closing brace
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error("Unterminated JSON object in response");
  }

  const jsonStr = candidate.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

/**
 * Parse and validate LLM output for a given stage.
 * Throws a structured error so callers can retry with feedback.
 */
export function parseAndValidate(text: string, stage: ValidationStage): any {
  const schema = schemaByStage[stage];
  let raw: unknown;
  try {
    raw = extractJsonObject(text);
  } catch (e) {
    throw new ValidationError(stage, "Could not extract JSON from response", []);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
    );
    throw new ValidationError(stage, "Response failed schema validation", issues);
  }

  return result.data;
}

export class ValidationError extends Error {
  stage: ValidationStage;
  issues: string[];
  constructor(stage: ValidationStage, message: string, issues: string[]) {
    super(`${message} [${stage}]`);
    this.name = "ValidationError";
    this.stage = stage;
    this.issues = issues;
  }

  get feedback(): string {
    return `Your previous response was invalid. Fix these issues and return ONLY valid JSON:\n- ${this.issues.join(
      "\n- "
    )}`;
  }
}
