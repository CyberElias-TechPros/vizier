import { Task } from "../types/pim";

export interface DagValidationResult {
  valid: boolean;
  errors: string[];
  cycles: string[][];
}

/**
 * Detect cycles in the task dependency graph using DFS.
 * Returns list of cycles found (each cycle is a list of task IDs).
 */
export function detectCycles(tasks: Task[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function dfs(taskId: string, path: string[]): void {
    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const depId of task.depends_on) {
        if (!taskMap.has(depId)) continue; // Skip invalid dependencies
        
        if (recursionStack.has(depId)) {
          // Found a cycle - extract the cycle from path
          const cycleStart = path.indexOf(depId);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, depId]);
        } else if (!visited.has(depId)) {
          dfs(depId, path);
        }
      }
    }

    path.pop();
    recursionStack.delete(taskId);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  }

  return cycles;
}

/**
 * Validate the task DAG.
 * Checks for cycles and invalid dependency references.
 */
export function validateDag(tasks: Task[]): DagValidationResult {
  const errors: string[] = [];
  const cycles = detectCycles(tasks);

  if (cycles.length > 0) {
    errors.push(`Found ${cycles.length} cycle(s) in task dependencies`);
  }

  // Check for invalid dependency references
  const taskIds = new Set(tasks.map(t => t.id));
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      if (!taskIds.has(depId)) {
        errors.push(`Task ${task.id} depends on non-existent task ${depId}`);
      }
    }
    if (task.depends_on.includes(task.id)) {
      errors.push(`Task ${task.id} depends on itself`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cycles
  };
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns tasks in dependency order (dependencies first).
 */
export function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, task.depends_on.length);
    dependents.set(task.id, []);
  }

  // Build reverse map (who depends on whom)
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      if (dependents.has(depId)) {
        dependents.get(depId)!.push(task.id);
      }
    }
  }

  // Start with tasks that have no dependencies
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const result: Task[] = [];
  
  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = taskMap.get(id);
    if (task) result.push(task);

    for (const dependentId of dependents.get(id) || []) {
      const newDegree = inDegree.get(dependentId)! - 1;
      inDegree.set(dependentId, newDegree);
      if (newDegree === 0) {
        queue.push(dependentId);
      }
    }
  }

  // If not all tasks are in result, there was a cycle - add remaining
  if (result.length < tasks.length) {
    const resultIds = new Set(result.map(t => t.id));
    for (const task of tasks) {
      if (!resultIds.has(task.id)) {
        result.push(task);
      }
    }
  }

  return result;
}

/**
 * Get tasks that are blocked (have uncompleted dependencies).
 */
export function getBlockedTasks(tasks: Task[], doneIds: string[]): Task[] {
  const doneSet = new Set(doneIds);
  return tasks.filter(task => 
    !doneSet.has(task.id) && 
    !task.depends_on.every(depId => doneSet.has(depId))
  );
}

/**
 * Get tasks that are available to start (all dependencies met).
 */
export function getNextTasks(tasks: Task[], doneIds: string[]): Task[] {
  const doneSet = new Set(doneIds);
  return tasks.filter(task => 
    !doneSet.has(task.id) && 
    task.depends_on.every(depId => doneSet.has(depId))
  );
}

/**
 * Calculate overall progress as a percentage.
 */
export function calculateProgress(tasks: Task[]): { total: number; done: number; percentage: number } {
  const done = tasks.filter(t => t.status === "done").length;
  return {
    total: tasks.length,
    done,
    percentage: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  };
}

/**
 * Mark a task as done and return updated tasks array.
 */
export function markTaskDone(tasks: Task[], taskId: string): Task[] {
  return tasks.map(t => 
    t.id === taskId ? { ...t, status: "done" as const } : t
  );
}

/**
 * Mark a task as in progress.
 */
export function markTaskInProgress(tasks: Task[], taskId: string): Task[] {
  return tasks.map(t => 
    t.id === taskId ? { ...t, status: "in_progress" as const } : t
  );
}
