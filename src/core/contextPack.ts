import { Project, Task, Requirement, Entity, Decision, Rule, ContextPack } from "../types/pim";

/**
 * Generate a context pack for a single task.
 * Extracts only the relevant subset of the blueprint.
 */
export function generateContextPack(project: Project, task: Task): ContextPack {
  const requirements = getRelevantRequirements(task, project.requirements);
  const entities = getRelevantEntities(task, project.entities);
  const decisions = getRelevantDecisions(task, project.decisions);
  const rules = getRelevantRules(task, project.rules);

  return {
    task_id: task.id,
    summary: generateTaskSummary(task, entities, requirements),
    requirements,
    entities,
    decisions,
    rules,
    files: task.files_expected,
    do_not: generateDoNotList(task, project.tasks)
  };
}

/**
 * Generate context packs for all tasks.
 */
export function generateAllContextPacks(project: Project): ContextPack[] {
  return project.tasks.map(task => generateContextPack(project, task));
}

/**
 * Get requirements relevant to a task.
 */
function getRelevantRequirements(task: Task, allRequirements: Requirement[]): Requirement[] {
  // Direct link: task references requirement ID
  const direct = allRequirements.filter(r => task.requirement_ids.includes(r.id));
  
  // Indirect: requirement text mentions task keywords
  const keywords = extractKeywords(task.title + " " + task.description);
  const indirect = allRequirements.filter(r => 
    !task.requirement_ids.includes(r.id) &&
    keywords.some(kw => r.text.toLowerCase().includes(kw))
  );

  return [...direct, ...indirect];
}

/**
 * Get entities relevant to a task.
 */
function getRelevantEntities(task: Task, allEntities: Entity[]): Entity[] {
  const keywords = extractKeywords(task.title + " " + task.description);
  
  return allEntities.filter(entity => {
    // Entity name appears in task
    if (keywords.some(kw => entity.name.toLowerCase().includes(kw))) return true;
    
    // Task expected files mention entity
    return task.files_expected.some(file => 
      file.toLowerCase().includes(entity.name.toLowerCase())
    );
  });
}

/**
 * Get decisions relevant to a task.
 */
function getRelevantDecisions(task: Task, allDecisions: Decision[]): Decision[] {
  const keywords = extractKeywords(task.title + " " + task.description);
  
  return allDecisions.filter(decision => {
    // Decision impacts match task area
    return decision.impacts.some(impact => 
      keywords.some(kw => impact.toLowerCase().includes(kw))
    );
  });
}

/**
 * Get rules relevant to a task.
 */
function getRelevantRules(task: Task, allRules: Rule[]): Rule[] {
  const keywords = extractKeywords(task.title + " " + task.description);
  
  return allRules.filter(rule => {
    return keywords.some(kw => rule.text.toLowerCase().includes(kw));
  });
}

/**
 * Generate a one-paragraph summary for the task.
 */
function generateTaskSummary(task: Task, entities: Entity[], requirements: Requirement[]): string {
  const entityStr = entities.length > 0 ? ` Related entities: ${entities.map(e => e.name).join(", ")}.` : "";
  const reqStr = requirements.length > 0 ? ` Satisfies requirements: ${requirements.map(r => r.id).join(", ")}.` : "";
  return `${task.description}${entityStr}${reqStr}`;
}

/**
 * Generate a "do not" list for the task.
 */
function generateDoNotList(task: Task, allTasks: Task[]): string[] {
  const doNot: string[] = [];
  
  // Things handled by other tasks
  const otherTasks = allTasks.filter(t => t.id !== task.id);
  const otherFiles = new Set(otherTasks.flatMap(t => t.files_expected));
  
  // Warn about files that belong to other tasks
  const conflicts = task.files_expected.filter(f => otherFiles.has(f));
  if (conflicts.length > 0) {
    doNot.push(`Do not modify these files (handled by other tasks): ${conflicts.join(", ")}`);
  }

  // Don't implement other tasks' scope
  const parallelTasks = otherTasks.filter(t => !task.depends_on.includes(t.id) && !t.depends_on.includes(task.id));
  if (parallelTasks.length > 0) {
    doNot.push(`Do not implement these tasks: ${parallelTasks.map(t => t.id).join(", ")}`);
  }

  return doNot;
}

/**
 * Extract keywords from text (simple approach).
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither", "each", "every", "all", "any", "few", "more", "most", "other", "some", "such", "no", "only", "own", "same", "than", "too", "very", "just", "because", "if", "when", "where", "how", "what", "which", "who", "whom", "this", "that", "these", "those", "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her", "it", "its", "they", "them", "their"]);
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}
