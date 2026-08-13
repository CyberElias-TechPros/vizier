import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Project } from "../types/pim";
import { renderOverview, renderArchitecture, renderSchema, renderTasks, renderDecisions, renderApiContract, renderContextPack } from "./markdown";
import { generateCursorRules, generateClaudeMd, generateAgentsMd } from "./agentRules";
import { generateAllContextPacks } from "../core/contextPack";

export interface ExportResult {
  success: boolean;
  filesWritten: string[];
  errors: string[];
}

/**
 * Detect which AI tools are installed in the workspace.
 */
export function detectAITools(workspacePath: string): string[] {
  const tools: string[] = [];
  
  if (fs.existsSync(path.join(workspacePath, ".cursorrules"))) {
    tools.push("cursor");
  }
  if (fs.existsSync(path.join(workspacePath, ".cursor"))) {
    tools.push("cursor");
  }
  if (fs.existsSync(path.join(workspacePath, "CLAUDE.md"))) {
    tools.push("claude");
  }
  if (fs.existsSync(path.join(workspacePath, ".claude"))) {
    tools.push("claude");
  }
  if (fs.existsSync(path.join(workspacePath, ".windsurfrules"))) {
    tools.push("windsurf");
  }
  if (fs.existsSync(path.join(workspacePath, ".windsurf"))) {
    tools.push("windsurf");
  }
  
  return [...new Set(tools)];
}

/**
 * Export the full plan to files in the workspace.
 */
export async function exportPlan(project: Project): Promise<ExportResult> {
  const result: ExportResult = {
    success: true,
    filesWritten: [],
    errors: []
  };

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    result.success = false;
    result.errors.push("No workspace folder open");
    return result;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const planDir = path.join(workspacePath, "plan");
  const contextDir = path.join(planDir, "context");

  try {
    // Create directories
    if (!fs.existsSync(planDir)) {
      fs.mkdirSync(planDir, { recursive: true });
    }
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    // Write overview
    const overviewPath = path.join(planDir, "overview.md");
    fs.writeFileSync(overviewPath, renderOverview(project), "utf8");
    result.filesWritten.push("plan/overview.md");

    // Write architecture
    const archPath = path.join(planDir, "architecture.md");
    fs.writeFileSync(archPath, renderArchitecture(project), "utf8");
    result.filesWritten.push("plan/architecture.md");

    // Write schema
    const schemaPath = path.join(planDir, "schema.md");
    fs.writeFileSync(schemaPath, renderSchema(project), "utf8");
    result.filesWritten.push("plan/schema.md");

    // Write API contract
    const apiPath = path.join(planDir, "api.md");
    fs.writeFileSync(apiPath, renderApiContract(project), "utf8");
    result.filesWritten.push("plan/api.md");

    // Write tasks
    const tasksPath = path.join(planDir, "tasks.md");
    fs.writeFileSync(tasksPath, renderTasks(project), "utf8");
    result.filesWritten.push("plan/tasks.md");

    // Write decisions
    const decisionsPath = path.join(planDir, "decisions.md");
    fs.writeFileSync(decisionsPath, renderDecisions(project), "utf8");
    result.filesWritten.push("plan/decisions.md");

    // Write context packs
    const contextPacks = generateAllContextPacks(project);
    for (const pack of contextPacks) {
      const packPath = path.join(contextDir, `${pack.task_id}.md`);
      fs.writeFileSync(packPath, renderContextPack(pack.task_id, pack), "utf8");
      result.filesWritten.push(`plan/context/${pack.task_id}.md`);
    }

    // Detect and write agent-specific rules
    const aiTools = detectAITools(workspacePath);
    
    if (aiTools.includes("cursor") || aiTools.length === 0) {
      const cursorRulesPath = path.join(workspacePath, ".cursorrules");
      fs.writeFileSync(cursorRulesPath, generateCursorRules(project), "utf8");
      result.filesWritten.push(".cursorrules");
    }
    
    if (aiTools.includes("claude")) {
      const claudeMdPath = path.join(workspacePath, "CLAUDE.md");
      fs.writeFileSync(claudeMdPath, generateClaudeMd(project), "utf8");
      result.filesWritten.push("CLAUDE.md");
    }
    
    // If no specific tool detected, write AGENTS.md as fallback
    if (aiTools.length === 0) {
      const agentsMdPath = path.join(workspacePath, "AGENTS.md");
      fs.writeFileSync(agentsMdPath, generateAgentsMd(project), "utf8");
      result.filesWritten.push("AGENTS.md");
    }

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  return result;
}
