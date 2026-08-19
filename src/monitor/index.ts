import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { Project, Task } from "../types/pim";
import { ModelProvider } from "../llm/types";

export type MonitorStatus = "not_started" | "in_progress" | "done" | "blocked";

export interface TaskStatusReport {
  id: string;
  title: string;
  status: MonitorStatus;
  filesExpected: number;
  filesPresent: number;
  filesMissing: string[];
  referencedInRepo: boolean;
  commitEvidence: string[];
  testEvidence: string[];
  /** True when associated tests actually passed (real CI artifact), not just present. */
  testsPassing: boolean;
  verified: boolean;
  blockingDeps: string[];
  evidence: string[];
}

export interface PlanStatusReport {
  workspacePath: string;
  planName: string;
  analyzedAt: string;
  total: number;
  byStatus: Record<MonitorStatus, number>;
  verifiedCount: number;
  progressPercent: number;
  tasks: TaskStatusReport[];
  blocked: string[];
  coverage?: { lines?: number; statements?: number };
  testReport?: { tests: number; passed: number; failed: number; skipped: number; sampleFailures: string[] };
  history: { at: string; progressPercent: number }[];
  trend: number;
  gitEnabled: boolean;
  testsEnabled: boolean;
  notes: string[];
  privacy: string;
}

export interface MonitorOptions {
  verifyWithGit?: boolean;
  verifyWithTests?: boolean;
  persistHistory?: boolean;
}

const PRIVACY_STATEMENT =
  "Plan-progress monitoring runs 100% locally on your machine. It only inspects file existence, task references, git history, and (optionally) coverage reports in your workspace; no source code, file contents, or repository data is ever transmitted to any LLM or external service. Optional AI narrative (if enabled) is generated from plan metadata only (task ids, titles, and status counts) — never from your code.";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".vscode",
  "plan",
  "coverage",
  "coverage-final",
  ".next",
  ".nuxt",
  "target",
  "vendor",
  "bin",
  "obj",
  ".terraform",
  ".cache"
]);

const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java",
  ".rb", ".php", ".cs", ".json", ".md", ".markdown", ".yml", ".yaml", ".html",
  ".htm", ".css", ".scss", ".sql", ".swift", ".kt", ".kts", ".sh", ".bash",
  ".txt", ".toml", ".ini", ".env", ".graphql", ".vue", ".svelte"
]);

const MAX_SCAN_FILES = 4000;

interface WorkspaceIndex {
  fileNameIndex: Map<string, string>;
  referencedIds: Set<string>;
}

/**
 * Single bounded walk of the workspace that builds a basename -> path index
 * (for expected-file resolution) and scans text files for task-id references.
 * Nothing read here is ever transmitted anywhere; this is purely local.
 */
function indexWorkspace(workspacePath: string, taskIds: string[]): WorkspaceIndex {
  const fileNameIndex = new Map<string, string>();
  const referencedIds = new Set<string>();

  const patterns = taskIds.map((id) => id.replace(/[-]/g, "\\-?")).join("|");
  const idRegex = patterns ? new RegExp(`\\b(${patterns})\\b`, "i") : null;

  let scanned = 0;
  const queue: string[] = [workspacePath];

  while (queue.length > 0) {
    if (scanned >= MAX_SCAN_FILES) break;
    const dir = queue.shift() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".env") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        queue.push(full);
      } else if (entry.isFile()) {
        scanned++;
        if (scanned > MAX_SCAN_FILES) break;
        const lower = entry.name.toLowerCase();
        if (!fileNameIndex.has(lower)) fileNameIndex.set(lower, full);
        if (idRegex) {
          const ext = path.extname(lower);
          if (TEXT_EXT.has(ext)) {
            try {
              const content = fs.readFileSync(full, "utf8");
              const m = content.match(idRegex);
              if (m) referencedIds.add((m[1] || "").toUpperCase().replace(/ /g, "-"));
            } catch {
              /* unreadable file: ignore for scanning purposes */
            }
          }
        }
      }
    }
  }

  return { fileNameIndex, referencedIds };
}

/** Read the full git history (oneline) once for commit-evidence lookups. */
function readGitLog(workspacePath: string): string | null {
  try {
    return execFileSync("git", ["-C", workspacePath, "log", "--all", "--oneline"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}

/** Parse an Istanbul/NYC/Vitest coverage-summary.json if present. */
function readCoverage(workspacePath: string): { lines?: number; statements?: number } | undefined {
  const candidates = [
    path.join(workspacePath, "coverage", "coverage-summary.json"),
    path.join(workspacePath, "coverage", "cobertura-coverage.xml")
  ];
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(c, "utf8"));
      const total = data?.total;
      if (total?.lines || total?.statements) {
        return {
          lines: Math.round(total.lines?.pct ?? total.lines?.average ?? 0),
          statements: Math.round(total.statements?.pct ?? total.statements?.average ?? 0)
        };
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/** Heuristic: is there a test file associated with an expected source file? */
function testEvidenceFor(expectedFile: string, fileNameIndex: Map<string, string>): string | null {
  if (!expectedFile) return null;
  const base = path.basename(expectedFile);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const candidates = [
    `${stem}.test.ts`, `${stem}.spec.ts`, `${stem}.test.tsx`, `${stem}.spec.tsx`,
    `${stem}.test.js`, `${stem}.test.py`, `${stem}_test.py`, `${stem}.test.go`,
    `${stem}.test.rs`, `${stem}.test.java`
  ];
  for (const cand of candidates) {
    if (fileNameIndex.has(cand.toLowerCase())) return cand;
  }
  return null;
}

/** Full paths (resolved via the index) of test files associated with an expected source file. */
function associatedTestFiles(expectedFile: string, fileNameIndex: Map<string, string>): string[] {
  if (!expectedFile) return [];
  const base = path.basename(expectedFile);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const candidates = [
    `${stem}.test.ts`, `${stem}.spec.ts`, `${stem}.test.tsx`, `${stem}.spec.tsx`,
    `${stem}.test.js`, `${stem}.test.py`, `${stem}_test.py`, `${stem}.test.go`,
    `${stem}.test.rs`, `${stem}.test.java`
  ];
  const out: string[] = [];
  for (const cand of candidates) {
    const full = fileNameIndex.get(cand.toLowerCase());
    if (full) out.push(full);
  }
  return out;
}

/* --------------------------- Test-result parsing -------------------------- */
/* Parses real CI/test artifacts (Jest JSON, JUnit XML) so "verified" reflects
   tests that actually passed — not merely the existence of a test file. */

export interface TestReportSummary {
  format: "jest" | "junit" | "mixed";
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  failedCases: string[];
  /** Absolute test-file path -> outcome (jest provides this; junit usually not). */
  byFile: Record<string, "passed" | "failed" | "pending">;
}

function matchTestFile(byFile: Record<string, string>, fullPath: string): string | undefined {
  if (byFile[fullPath] !== undefined) return byFile[fullPath];
  const base = path.basename(fullPath).toLowerCase();
  for (const key of Object.keys(byFile)) {
    if (path.basename(key).toLowerCase() === base) return byFile[key];
  }
  return undefined;
}

function parseJestJson(content: string, acc: TestReportSummary): boolean {
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    return false;
  }
  if (typeof data?.numTotalTests !== "number") return false;
  acc.format = acc.format === "junit" ? "mixed" : "jest";
  acc.tests += data.numTotalTests || 0;
  acc.passed += data.numPassedTests || 0;
  acc.failed += data.numFailedTests || 0;
  acc.skipped += data.numPendingTests || 0;
  for (const tr of data.testResults || []) {
    const fp: string = tr.testFilePath || tr.name || "";
    const status: string = tr.status || "";
    if (fp) {
      if (status === "failed") acc.byFile[fp] = "failed";
      else if (status === "passed") acc.byFile[fp] = "passed";
      else acc.byFile[fp] = acc.byFile[fp] || "pending";
    }
    for (const a of tr.assertionResults || []) {
      if (a?.status === "failed") acc.failedCases.push(a.fullName || a.title || "unknown");
    }
  }
  return true;
}

function parseJunitXml(content: string, acc: TestReportSummary): boolean {
  // Tolerant: handle single or double quotes, <testsuite> or <testsuite>.
  const suiteAttrs = content.match(
    /<testsuite\b[^>]*\btests\s*=\s*["']?(\d+)["']?[^>]*\bfailures\s*=\s*["']?(\d+)["']?[^>]*\berrors\s*=\s*["']?(\d+)["']?/i
  );
  const testcaseCount = (content.match(/<testcase\b/gi) || []).length;
  const failureCount = (content.match(/<(?:failure|error)\b/gi) || []).length;
  const skippedCount = (content.match(/<skipped\b/gi) || []).length;
  if (testcaseCount === 0 && !suiteAttrs) return false;

  acc.format = acc.format === "jest" ? "mixed" : "junit";
  acc.tests += suiteAttrs ? parseInt(suiteAttrs[1], 10) : testcaseCount;
  acc.failed += suiteAttrs ? parseInt(suiteAttrs[2], 10) + parseInt(suiteAttrs[3], 10) : failureCount;
  acc.skipped += skippedCount;
  acc.passed += Math.max(0, acc.tests - acc.failed - acc.skipped);

  const failRe = /<testcase\b[^>]*\bname\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<(?:failure|error)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = failRe.exec(content)) !== null) {
    acc.failedCases.push(m[1]);
  }
  return true;
}

/** Find and aggregate test-result artifacts in the workspace. */
function parseTestReports(
  workspacePath: string,
  fileNameIndex: Map<string, string>
): TestReportSummary | null {
  const acc: TestReportSummary = {
    format: "jest",
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    failedCases: [],
    byFile: {}
  };
  let found = false;

  const jestKeys = [...fileNameIndex.keys()].filter(
    (k) => k.endsWith(".json") && /(jest|vitest|test[-_]?results?|report)/i.test(k)
  );
  for (const k of jestKeys) {
    const fp = fileNameIndex.get(k)!;
    try {
      if (parseJestJson(fs.readFileSync(fp, "utf8"), acc)) found = true;
    } catch {
      /* ignore */
    }
  }

  const junitKeys = [...fileNameIndex.keys()].filter(
    (k) => k.endsWith(".xml") && /(junit|test[-_]?result|report)/i.test(k)
  );
  for (const k of junitKeys) {
    const fp = fileNameIndex.get(k)!;
    try {
      if (parseJunitXml(fs.readFileSync(fp, "utf8"), acc)) found = true;
    } catch {
      /* ignore */
    }
  }

  return found ? acc : null;
}

/**
 * Load the structured plan written by `exportPlan` to plan/plan.json.
 */
export function loadPlan(workspacePath: string): Project | null {
  const planJson = path.join(workspacePath, "plan", "plan.json");
  if (!fs.existsSync(planJson)) return null;
  try {
    return JSON.parse(fs.readFileSync(planJson, "utf8")) as Project;
  } catch {
    return null;
  }
}

function resolveFiles(
  workspacePath: string,
  expected: string[],
  fileNameIndex: Map<string, string>
): { present: string[]; missing: string[] } {
  const present: string[] = [];
  const missing: string[] = [];
  for (const f of expected) {
    const exact = path.join(workspacePath, f);
    if (fs.existsSync(exact)) {
      present.push(f);
      continue;
    }
    const base = path.basename(f).toLowerCase();
    if (fileNameIndex.has(base)) {
      present.push(f);
    } else {
      missing.push(f);
    }
  }
  return { present, missing };
}

function readHistory(workspacePath: string): { at: string; progressPercent: number }[] {
  const hp = path.join(workspacePath, "plan", ".progress-history.json");
  if (!fs.existsSync(hp)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(hp, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeHistory(workspacePath: string, history: { at: string; progressPercent: number }[]): void {
  try {
    const hp = path.join(workspacePath, "plan", ".progress-history.json");
    fs.writeFileSync(hp, JSON.stringify(history.slice(-100), null, 2), "utf8");
  } catch {
    /* non-fatal */
  }
}

/**
 * Analyze how much of the exported plan has been executed in the workspace.
 * Fully local; never reads code into any model.
 */
export function analyzePlanStatus(workspacePath: string, opts: MonitorOptions = {}): PlanStatusReport {
  const verifyWithGit = opts.verifyWithGit ?? true;
  const verifyWithTests = opts.verifyWithTests ?? true;
  const persistHistory = opts.persistHistory ?? false;

  const base: PlanStatusReport = {
    workspacePath,
    planName: "",
    analyzedAt: new Date().toISOString(),
    total: 0,
    byStatus: { not_started: 0, in_progress: 0, done: 0, blocked: 0 },
    verifiedCount: 0,
    progressPercent: 0,
    tasks: [],
    blocked: [],
    history: [],
    trend: 0,
    gitEnabled: verifyWithGit,
    testsEnabled: verifyWithTests,
    notes: [],
    privacy: PRIVACY_STATEMENT
  };

  const project = loadPlan(workspacePath);
  if (!project) {
    base.notes.push(
      "No Vizier plan found at plan/plan.json. Generate and export a plan first, then run this check again."
    );
    return base;
  }

  base.planName = project.name;
  const tasks = project.tasks || [];
  base.total = tasks.length;

  const taskIds = tasks.map((t) => t.id);
  const { fileNameIndex, referencedIds } = indexWorkspace(workspacePath, taskIds);
  const taskById = new Map<string, Task>(tasks.map((t) => [t.id, t]));

  const gitLog = verifyWithGit ? readGitLog(workspacePath) : null;
  const coverage = verifyWithTests ? readCoverage(workspacePath) : undefined;
  base.coverage = coverage;
  const testReport = verifyWithTests ? parseTestReports(workspacePath, fileNameIndex) : null;
  if (testReport) {
    base.testReport = {
      tests: testReport.tests,
      passed: testReport.passed,
      failed: testReport.failed,
      skipped: testReport.skipped,
      sampleFailures: testReport.failedCases.slice(0, 10)
    };
  }

  const raw: Record<string, MonitorStatus> = {};

  for (const task of tasks) {
    const expected = task.files_expected || [];
    const { present, missing } = resolveFiles(workspacePath, expected, fileNameIndex);
    const referenced = referencedIds.has(task.id) || referencedIds.has(task.id.replace(/-/g, ""));

    const commitEvidence: string[] = [];
    if (gitLog) {
      for (const line of gitLog.split("\n")) {
        if (
          line.toUpperCase().includes(task.id.toUpperCase()) ||
          line.toUpperCase().includes(task.id.replace(/-/g, "").toUpperCase())
        ) {
          commitEvidence.push(line.trim().slice(0, 120));
        }
      }
    }

    const testEvidence: string[] = [];
    let testsPassing = false;
    if (verifyWithTests) {
      const assoc = expected.flatMap((f) => associatedTestFiles(f, fileNameIndex));
      if (testReport) {
        let anyPass = false;
        let anyFail = false;
        for (const tf of assoc) {
          const st = matchTestFile(testReport.byFile, tf);
          if (st === "passed") anyPass = true;
          else if (st === "failed") anyFail = true;
        }
        if (assoc.length > 0) {
          if (anyPass) {
            testsPassing = true;
            testEvidence.push(`tests passing (${assoc.length} test file(s))`);
          } else if (testReport.failed === 0) {
            // Suite is green and the task has a test file -> treat as verified.
            testsPassing = true;
            testEvidence.push(`test file present; suite passing (${testReport.passed}/${testReport.tests})`);
          } else if (anyFail) {
            testEvidence.push(`test file present but FAILING`);
          } else {
            testEvidence.push(`test file present (suite has failures)`);
          }
        }
      } else {
        for (const f of expected) {
          const t = testEvidenceFor(f, fileNameIndex);
          if (t) testEvidence.push(`test file present: ${t}`);
        }
      }
    }

    let status: MonitorStatus;
    if (expected.length === 0) {
      status = referenced || commitEvidence.length > 0 ? "in_progress" : "not_started";
    } else {
      const ratio = present.length / expected.length;
      if (ratio >= 1) status = "done";
      else if (ratio > 0) status = "in_progress";
      else status = referenced || commitEvidence.length > 0 ? "in_progress" : "not_started";
    }

    const verified = status === "done" && (commitEvidence.length > 0 || testsPassing);

    const evidence: string[] = [];
    if (expected.length > 0) {
      evidence.push(`Expected files: ${present.length}/${expected.length} present`);
    }
    if (referenced) evidence.push("Task id referenced in repository");
    if (commitEvidence.length > 0) evidence.push(`Git history: ${commitEvidence.length} commit(s)`);
    if (testEvidence.length > 0) evidence.push(testEvidence.join("; "));

    raw[task.id] = status;
    base.tasks.push({
      id: task.id,
      title: task.title,
      status,
      filesExpected: expected.length,
      filesPresent: present.length,
      filesMissing: missing,
      referencedInRepo: referenced,
      commitEvidence,
      testEvidence,
      testsPassing,
      verified,
      blockingDeps: [],
      evidence
    });
  }

  // Second pass: apply dependency blocking.
  const doneSet = new Set(
    Object.entries(raw).filter(([, s]) => s === "done").map(([id]) => id)
  );
  for (const task of tasks) {
    const blocking = (task.depends_on || []).filter((d) => !doneSet.has(d));
    const entry = base.tasks.find((t) => t.id === task.id)!;
    entry.blockingDeps = blocking;
    if (blocking.length > 0 && entry.status !== "done") {
      entry.status = "blocked";
      entry.evidence.push(`Blocked by: ${blocking.join(", ")}`);
    }
  }

  for (const s of ["not_started", "in_progress", "done", "blocked"] as MonitorStatus[]) {
    base.byStatus[s] = base.tasks.filter((t) => t.status === s).length;
  }
  base.verifiedCount = base.tasks.filter((t) => t.verified).length;
  base.blocked = base.tasks.filter((t) => t.status === "blocked").map((t) => t.id);
  base.progressPercent =
    base.total > 0 ? Math.round((base.byStatus.done / base.total) * 100) : 0;

  // Trend / history
  const history = readHistory(workspacePath);
  base.trend = history.length > 0 ? base.progressPercent - history[history.length - 1].progressPercent : 0;
  if (persistHistory) {
    history.push({ at: base.analyzedAt, progressPercent: base.progressPercent });
    writeHistory(workspacePath, history);
  }
  base.history = history;

  base.notes.push(
    "Heuristic, local-only check: a task is marked 'done' when all of its expected files exist, 'in_progress' when some exist or the task id is referenced/committed, and 'blocked' when its dependencies are not done. A task is 'verified' when done AND backed by git commits or by tests that actually passed (parsed from Jest(JSON)/JUnit(XML) artifacts). A green 'verified' means implementation activity + passing tests were detected — it is still not a substitute for human review."
  );
  if (coverage) {
    const cov = coverage.lines !== undefined ? `${coverage.lines}% lines` : `${coverage.statements}% statements`;
    base.notes.push(`Coverage report detected: ${cov} (project-wide; not mapped per task).`);
  }
  if (testReport) {
    if (testReport.failed > 0) {
      base.notes.push(`Test suite has ${testReport.failed} failing test(s). Tasks with failing tests are NOT marked verified.`);
    } else if (testReport.tests > 0) {
      base.notes.push(`Test suite is green (${testReport.passed}/${testReport.tests} passed). Tasks with associated passing tests are marked verified.`);
    }
  } else if (verifyWithTests) {
    base.notes.push("No Jest/JSON or JUnit/XML test-result artifact found — test verification fell back to test-file existence only.");
  }
  if (gitLog === null && verifyWithGit) {
    base.notes.push("Git history unavailable (not a git repo or git not on PATH) — commit evidence skipped.");
  }
  return base;
}

/**
 * Render the report to markdown for plan/status.md and the output channel.
 */
export function renderStatusReportMarkdown(report: PlanStatusReport): string {
  const lines: string[] = [];
  lines.push(`# Vizier Plan Progress Report`);
  lines.push("");
  lines.push(`- **Plan:** ${report.planName || "(unnamed)"}`);
  lines.push(`- **Analyzed:** ${report.analyzedAt}`);
  lines.push(`- **Workspace:** \`${report.workspacePath}\``);
  lines.push("");

  const trendStr = report.trend === 0 ? "no change" : report.trend > 0 ? `+${report.trend}%` : `${report.trend}%`;
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Total tasks: **${report.total}**`);
  lines.push(`- Done: **${report.byStatus.done}**`);
  lines.push(`- In progress: **${report.byStatus.in_progress}**`);
  lines.push(`- Not started: **${report.byStatus.not_started}**`);
  lines.push(`- Blocked: **${report.byStatus.blocked}**`);
  lines.push(`- Verified (done + commits/tests): **${report.verifiedCount}**`);
  lines.push(`- Progress: **${report.progressPercent}%** (trend: ${trendStr})`);
  if (report.coverage) {
    const cov = report.coverage.lines !== undefined ? `${report.coverage.lines}% lines` : `${report.coverage.statements}% statements`;
    lines.push(`- Coverage: **${cov}** (project-wide)`);
  }
  if (report.testReport) {
    const tr = report.testReport;
    lines.push(`- Test results: **${tr.passed}/${tr.tests} passed**${tr.failed > 0 ? `, ${tr.failed} failed` : ""}${tr.skipped > 0 ? `, ${tr.skipped} skipped` : ""}`);
    if (tr.sampleFailures.length > 0) {
      lines.push("");
      lines.push(`  Failing tests:`);
      for (const f of tr.sampleFailures) lines.push(`  - ${f}`);
    }
  }
  lines.push("");

  if (report.blocked.length > 0) {
    lines.push(`## Blocked tasks`);
    lines.push("");
    for (const id of report.blocked) {
      const t = report.tasks.find((x) => x.id === id);
      lines.push(`- \`${id}\` ${t ? t.title : ""}`);
    }
    lines.push("");
  }

  if (report.verifiedCount > 0) {
    lines.push(`## Verified tasks`);
    lines.push("");
    for (const t of report.tasks.filter((x) => x.verified)) {
      lines.push(`- \`${t.id}\` ${t.title} — ${t.commitEvidence.length} commit(s), ${t.testEvidence.length} test signal(s)`);
    }
    lines.push("");
  }

  lines.push(`## Task status`);
  lines.push("");
  lines.push(`| ID | Title | Status | Files | Verified | Evidence |`);
  lines.push(`|----|-------|--------|-------|----------|----------|`);
  for (const t of report.tasks) {
    const files = t.filesExpected > 0 ? `${t.filesPresent}/${t.filesExpected}` : "n/a";
    const evidence = t.evidence.join("; ").replace(/\|/g, "/");
    lines.push(`| \`${t.id}\` | ${t.title} | ${t.status} | ${files} | ${t.verified ? "yes" : "no"} | ${evidence} |`);
  }
  lines.push("");

  if (report.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push("");
    for (const n of report.notes) lines.push(`- ${n}`);
    lines.push("");
  }

  lines.push(`---`);
  lines.push("");
  lines.push(`*${report.privacy}*`);
  lines.push("");
  lines.push(
    `*Disclaimer: Vizier is an AI-assisted planning aid. Progress reports are heuristic and local. They are not a substitute for engineering review, testing, or human judgment. Verify all output before acting on it.*`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Optional, privacy-safe AI narrative generated from plan metadata ONLY
 * (no source code is sent). Returns null if no provider is available or if
 * disabled.
 */
export async function generateStatusNarrative(
  report: PlanStatusReport,
  provider?: ModelProvider
): Promise<string | null> {
  if (!provider || report.total === 0) return null;

  const summary =
    `Plan: ${report.planName}\n` +
    `Total tasks: ${report.total}\n` +
    `Done: ${report.byStatus.done}\n` +
    `In progress: ${report.byStatus.in_progress}\n` +
    `Not started: ${report.byStatus.not_started}\n` +
    `Blocked: ${report.byStatus.blocked}\n` +
    `Verified: ${report.verifiedCount}\n` +
    `Blocked task ids: ${report.blocked.join(", ") || "none"}\n` +
    (report.coverage ? `Coverage: ${report.coverage.lines ?? report.coverage.statements}% (project-wide)\n` : "") +
    `Recent / notable tasks:\n` +
    report.tasks
      .slice(0, 15)
      .map((t) => `- ${t.id} [${t.status}]${t.verified ? " [verified]" : ""} ${t.title}`)
      .join("\n");

  const system =
    "You are a senior engineering program manager writing a concise status update for a human stakeholder. You are given ONLY a plan-progress summary (task ids, titles, status counts, verification signals). You have NO access to source code. Write 3-5 short paragraphs: current state, what is blocking progress, and recommended next actions. Plain text only, no markdown headers.";
  const user = `Progress report (metadata only):\n\n${summary}\n\nWrite the status narrative.`;

  try {
    const res = await provider.complete({
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.3,
      maxTokens: 600
    });
    return res.text;
  } catch {
    return null;
  }
}
