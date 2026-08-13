import { RepoContext } from "../types/pim";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".swift": "Swift",
  ".dart": "Dart",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sql": "SQL",
  ".sh": "Shell",
  ".vue": "Vue",
  ".svelte": "Svelte"
};

const FRAMEWORK_DEP_HINTS: Record<string, string> = {
  next: "Next.js",
  "next.js": "Next.js",
  react: "React",
  "react-dom": "React",
  vue: "Vue",
  "@angular/core": "Angular",
  svelte: "Svelte",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  koa: "Koa",
  hono: "Hono",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  typeorm: "TypeORM",
  sequelize: "Sequelize",
  mongoose: "Mongoose",
  "tailwindcss": "Tailwind CSS",
  "@react-native-community/cli": "React Native",
  expo: "Expo / React Native",
  electron: "Electron",
  vite: "Vite",
  webpack: "Webpack",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  sqlalchemy: "SQLAlchemy",
  "torch": "PyTorch",
  "tensorflow": "TensorFlow",
  "@xyflow/react": "React Flow"
};

const CONFIG_FILE_FRAMEWORKS: Record<string, string> = {
  "next.config.js": "Next.js",
  "next.config.ts": "Next.js",
  "next.config.mjs": "Next.js",
  "vite.config.ts": "Vite",
  "vite.config.js": "Vite",
  "angular.json": "Angular",
  "vue.config.js": "Vue",
  "svelte.config.js": "Svelte",
  "tailwind.config.js": "Tailwind CSS",
  "tailwind.config.ts": "Tailwind CSS",
  "prisma/schema.prisma": "Prisma",
  "manage.py": "Django",
  "requirements.txt": "Python",
  "pyproject.toml": "Python",
  "cargo.toml": "Rust",
  "go.mod": "Go",
  "pubspec.yaml": "Flutter"
};

export function isFrameworkConfigFile(rel: string): boolean {
  return rel in CONFIG_FILE_FRAMEWORKS;
}

/**
 * Pure: detect languages from a set of file extensions.
 */
export function detectLanguages(extensions: Set<string>): string[] {
  const langs = new Set<string>();
  for (const ext of extensions) {
    const lang = LANGUAGE_BY_EXT[ext];
    if (lang) langs.add(lang);
  }
  return [...langs];
}

/**
 * Pure: detect frameworks from dependency names + config file names.
 */
export function detectFrameworks(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  configFiles: string[]
): string[] {
  const found = new Set<string>();
  const allDeps = { ...dependencies, ...devDependencies };

  for (const dep of Object.keys(allDeps)) {
    const hint = FRAMEWORK_DEP_HINTS[dep];
    if (hint) found.add(hint);
  }

  for (const file of configFiles) {
    const hint = CONFIG_FILE_FRAMEWORKS[file];
    if (hint) found.add(hint);
  }

  return [...found];
}

export function buildSummary(ctx: RepoContext): string {
  const lines: string[] = [];
  if (ctx.packageJson?.name) lines.push(`- Project name: ${ctx.packageJson.name}`);
  if (ctx.frameworks.length) lines.push(`- Detected frameworks: ${ctx.frameworks.join(", ")}`);
  if (ctx.languages.length) lines.push(`- Languages: ${ctx.languages.join(", ")}`);
  if (ctx.packageJson?.dependencies && Object.keys(ctx.packageJson.dependencies).length) {
    lines.push(`- Key dependencies: ${Object.keys(ctx.packageJson.dependencies).slice(0, 12).join(", ")}`);
  }
  if (ctx.topDirectories.length) lines.push(`- Top-level dirs: ${ctx.topDirectories.slice(0, 12).join(", ")}`);
  lines.push(`- Sampled ${ctx.fileCount} files`);
  if (ctx.hasExistingPlan) lines.push(`- Existing plan/agent rules detected — extend rather than overwrite.`);
  if (ctx.readmeSnippet) lines.push(`- README snippet: ${ctx.readmeSnippet.replace(/\n+/g, " ").slice(0, 200)}`);
  return lines.join("\n");
}

export const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".vscode",
  ".idea",
  "target",
  "bin",
  "obj",
  "vendor",
  "__pycache__",
  ".turbo"
]);

// Patterns that look like secrets; redacted before any repo content is sent to the model.
const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[a-zA-Z0-9]{20,}/g,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  /(password|passwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret)\s*[:=]\s*['"]?[^\s'"]{8,}/gi
];

/**
 * Replace likely secrets with [REDACTED] so repo context never leaks credentials
 * into the planning prompts.
 */
export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (m) =>
      m.includes("PRIVATE KEY") ? "-----BEGIN PRIVATE KEY-----[REDACTED]" : "[REDACTED]"
    );
  }
  return out;
}
