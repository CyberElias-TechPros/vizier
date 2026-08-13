import { Task, Entity, ApiContract } from "../types/pim";

/**
 * Append testing tasks to a generated task list so quality work is planned,
 * not left as an afterthought. Produces a valid DAG:
 *   setup -> [per-entity tests] -> api tests -> e2e tests
 */
export function augmentWithTestingTasks(
  tasks: Task[],
  entities: Entity[],
  api: ApiContract
): Task[] {
  if (tasks.length === 0) return tasks;

  const result = [...tasks];
  const implTasks = tasks.filter((t) => t.task_type !== "test");
  const lastImplId = implTasks.length ? implTasks[implTasks.length - 1].id : undefined;

  const setupId = nextTaskId(result);
  result.push({
    id: setupId,
    title: "Set up test framework & CI pipeline",
    description:
      "Configure the test runner (e.g., vitest/jest), add a test script, and a CI workflow that runs the suite on every push.",
    depends_on: [],
    status: "not_started",
    acceptance_criteria: [
      "Test command runs and reports pass/fail",
      "CI workflow executes tests on push"
    ],
    files_expected: ["vitest.config.ts", ".github/workflows/test.yml"],
    requirement_ids: [],
    estimated_effort: "small",
    estimated_hours: 2,
    story_points: 2,
    task_type: "setup"
  });

  const testTaskIds: string[] = [setupId];

  for (const entity of entities.slice(0, 8)) {
    const id = nextTaskId(result);
    result.push({
      id,
      title: `Write tests for ${entity.name} entity`,
      description: `Unit and integration tests for the ${entity.name} entity: creation, validation, relationships, and edge cases.`,
      depends_on: [setupId],
      status: "not_started",
      acceptance_criteria: [
        `All ${entity.name} CRUD paths covered`,
        "Validation and constraint violations tested"
      ],
      files_expected: [`tests/${entity.name}.test.ts`],
      requirement_ids: [],
      estimated_effort: "small",
      estimated_hours: 2,
      story_points: 2,
      task_type: "test"
    });
    testTaskIds.push(id);
  }

  if (api.endpoints.length > 0) {
    const id = nextTaskId(result);
    result.push({
      id,
      title: "Write API contract tests for all endpoints",
      description: `Integration tests that exercise every endpoint in the API contract (${api.endpoints.length} endpoints), asserting status codes, auth behavior, and response shapes.`,
      depends_on: [setupId, ...(lastImplId ? [lastImplId] : [])],
      status: "not_started",
      acceptance_criteria: [
        "Every endpoint returns expected status for happy path",
        "Unauthenticated requests are rejected where required"
      ],
      files_expected: ["tests/api.test.ts"],
      requirement_ids: [],
      estimated_effort: "medium",
      estimated_hours: 4,
      story_points: 3,
      task_type: "test"
    });
    testTaskIds.push(id);
  }

  const e2eId = nextTaskId(result);
  result.push({
    id: e2eId,
    title: "End-to-end tests for critical user workflows",
    description:
      "E2E tests covering the core user journeys defined in the product workflows, using the project's e2e tooling.",
    depends_on: [...testTaskIds],
    status: "not_started",
    acceptance_criteria: [
      "Critical paths pass end-to-end",
      "Tests are deterministic and re-runnable"
    ],
    files_expected: ["tests/e2e/critical-flows.test.ts"],
    requirement_ids: [],
    estimated_effort: "medium",
    estimated_hours: 4,
    story_points: 3,
    task_type: "test"
  });

  return result;
}

function nextTaskId(tasks: Task[]): string {
  let max = 0;
  for (const t of tasks) {
    const m = t.id.match(/(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `TASK-${String(max + 1).padStart(3, "0")}`;
}
