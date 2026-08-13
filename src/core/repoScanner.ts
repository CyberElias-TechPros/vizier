import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { RepoContext } from "../types/pim";
import { detectLanguages, detectFrameworks, buildSummary, isFrameworkConfigFile, redactSecrets, IGNORE_DIRS } from "./repoAnalysis";

function readJsonSafe(p: string): any | null {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Scan the open workspace and produce a RepoContext.
 * Returns null if no workspace folder is open.
 */
export function scanWorkspace(): RepoContext | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return analyzeRepo(folders[0].uri.fsPath);
}

/**
 * Analyze a repo root directory from the filesystem.
 */
export function analyzeRepo(root: string): RepoContext {
  const extensions = new Set<string>();
  const configFiles: string[] = [];
  let fileCount = 0;
  const topDirectories: string[] = [];

  const pkg = readJsonSafe(path.join(root, "package.json"));

  // BFS file tree sampling
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
  const MAX_FILES = 600;
  const MAX_DEPTH = 4;

  while (queue.length > 0 && fileCount < MAX_FILES) {
    const { dir, depth } = queue.shift()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth === 0) topDirectories.push(entry.name);
        if (depth < MAX_DEPTH && !IGNORE_DIRS.has(entry.name)) {
          queue.push({ dir: full, depth: depth + 1 });
        }
      } else if (entry.isFile()) {
        fileCount++;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext) extensions.add(ext);
        // Track top-level config files only (avoid deep false positives)
        if (depth === 0 || depth === 1) {
          const rel = path.relative(root, full).replace(/\\/g, "/");
          if (isFrameworkConfigFile(rel)) configFiles.push(rel);
        }
        if (fileCount >= MAX_FILES) break;
      }
    }
  }

  const languages = detectLanguages(extensions);
  const frameworks = detectFrameworks(
    pkg?.dependencies || {},
    pkg?.devDependencies || {},
    configFiles
  );

  const hasPlanDir = fs.existsSync(path.join(root, "plan"));
  const hasCursor = fs.existsSync(path.join(root, ".cursorrules"));
  const hasClaude = fs.existsSync(path.join(root, "CLAUDE.md"));
  const hasAgents = fs.existsSync(path.join(root, "AGENTS.md"));
  const hasExistingPlan = hasPlanDir || hasCursor || hasClaude || hasAgents;

  let readmeSnippet: string | undefined;
  const readmePath = path.join(root, "README.md");
  if (fs.existsSync(readmePath)) {
    try {
      readmeSnippet = redactSecrets(fs.readFileSync(readmePath, "utf8").slice(0, 600));
    } catch {
      readmeSnippet = undefined;
    }
  }

  let existingAgentRules: string | undefined;
  const rulesPath = hasCursor
    ? path.join(root, ".cursorrules")
    : hasClaude
    ? path.join(root, "CLAUDE.md")
    : hasAgents
    ? path.join(root, "AGENTS.md")
    : null;
  if (rulesPath) {
    try {
      existingAgentRules = redactSecrets(fs.readFileSync(rulesPath, "utf8").slice(0, 600));
    } catch {
      existingAgentRules = undefined;
    }
  }

  const ctx: RepoContext = {
    exists: true,
    root,
    packageJson: pkg
      ? {
          name: pkg.name,
          dependencies: pkg.dependencies || {},
          devDependencies: pkg.devDependencies || {},
          scripts: pkg.scripts || {}
        }
      : null,
    languages,
    frameworks,
    fileCount,
    topDirectories: topDirectories.filter((d) => !IGNORE_DIRS.has(d)),
    hasExistingPlan,
    readmeSnippet,
    existingAgentRules,
    summary: ""
  };

  ctx.summary = buildSummary(ctx);
  return ctx;
}
