import { Project } from "../types/pim";

function apiBlock(project: Project): string[] {
  const lines: string[] = [];
  const contract = project.api_contract;
  if (!contract || !contract.endpoints || contract.endpoints.length === 0) return lines;
  lines.push("## API Contract");
  lines.push("");
  lines.push("Implement exactly these endpoints:");
  for (const ep of contract.endpoints) {
    lines.push(`- ${ep.method.toUpperCase()} ${ep.path} — ${ep.summary}${ep.auth ? " (auth required)" : ""}`);
  }
  lines.push("");
  return lines;
}

/**
 * Generate .cursorrules content for Cursor.
 */
export function generateCursorRules(project: Project): string {
  const lines: string[] = [];
  
  lines.push("# Cursor Rules");
  lines.push("");
  lines.push("## Project");
  lines.push("");
  lines.push(`App: ${project.name}`);
  lines.push(`Category: ${project.category}`);
  lines.push(`Vision: ${project.product.vision}`);
  lines.push("");
  
  lines.push("## Architecture Constraints");
  lines.push("");
  if (project.architecture) {
    lines.push(`- Use ${project.architecture.frontend.framework} for frontend`);
    lines.push(`- Use ${project.architecture.backend.framework} for backend`);
    lines.push(`- Use ${project.architecture.database.type} with ${project.architecture.database.orm} for database`);
    lines.push(`- Use ${project.architecture.auth.provider} for authentication`);
    lines.push(`- Use ${project.architecture.infrastructure.hosting} for hosting`);
  }
  lines.push("");
  lines.push(...apiBlock(project));
  
  lines.push("## Coding Style");
  lines.push("");
  lines.push("- Follow the existing code style in the project");
  lines.push("- Use TypeScript strict mode");
  lines.push("- Use functional components for React");
  lines.push("- Use server components by default, 'use client' only when needed");
  lines.push("");
  
  lines.push("## File Organization");
  lines.push("");
  lines.push("- Keep related files close together");
  lines.push("- Use barrel exports (index.ts) for clean imports");
  lines.push("- Separate business logic from UI components");
  lines.push("");
  
  lines.push("## Do NOT");
  lines.push("");
  lines.push("- Do not introduce new state management libraries");
  lines.push("- Do not modify database schema without migration");
  lines.push("- Do not bypass the service layer for database access");
  lines.push("- Do not add new dependencies without approval");
  lines.push("");
  
  lines.push("## Error Handling");
  lines.push("");
  lines.push("- Always handle errors gracefully");
  lines.push("- Use error boundaries for React components");
  lines.push("- Log errors with context for debugging");
  lines.push("");
  
  return lines.join("\n");
}

/**
 * Generate CLAUDE.md content for Claude Code.
 */
export function generateClaudeMd(project: Project): string {
  const lines: string[] = [];
  
  lines.push("# Claude Code Instructions");
  lines.push("");
  lines.push("## Project Context");
  lines.push("");
  lines.push(`You are building: ${project.name}`);
  lines.push(`Category: ${project.category}`);
  lines.push(`Vision: ${project.product.vision}`);
  lines.push("");
  
  lines.push("## Tech Stack");
  lines.push("");
  if (project.architecture) {
    lines.push("```");
    lines.push(`Frontend: ${project.architecture.frontend.framework} + ${project.architecture.frontend.ui_library}`);
    lines.push(`Backend: ${project.architecture.backend.runtime} + ${project.architecture.backend.framework}`);
    lines.push(`Database: ${project.architecture.database.type} + ${project.architecture.database.orm}`);
    lines.push(`Auth: ${project.architecture.auth.strategy} via ${project.architecture.auth.provider}`);
    lines.push(`Hosting: ${project.architecture.infrastructure.hosting}`);
    lines.push("```");
  }
  lines.push("");
  lines.push(...apiBlock(project));
  
  lines.push("## Architecture Rules");
  lines.push("");
  for (const rule of project.rules) {
    lines.push(`- ${rule.text}`);
  }
  lines.push("");
  
  lines.push("## Key Decisions");
  lines.push("");
  for (const decision of project.decisions.slice(0, 5)) {
    lines.push(`- **${decision.topic}:** ${decision.chosen} - ${decision.rationale}`);
  }
  lines.push("");
  
  lines.push("## Important Reminders");
  lines.push("");
  lines.push("- Always use Server Actions for mutations in Next.js");
  lines.push("- Never import client components inside server components");
  lines.push("- Use the existing patterns in the codebase");
  lines.push("- Test your changes before marking complete");
  lines.push("");
  
  return lines.join("\n");
}

/**
 * Generate AGENTS.md content (generic agent format).
 */
export function generateAgentsMd(project: Project): string {
  const lines: string[] = [];
  
  lines.push("# Agent Instructions");
  lines.push("");
  lines.push("## Project");
  lines.push("");
  lines.push(`Name: ${project.name}`);
  lines.push(`Category: ${project.category}`);
  lines.push(`Vision: ${project.product.vision}`);
  lines.push("");
  
  lines.push("## Tech Stack");
  lines.push("");
  if (project.architecture) {
    lines.push(`- Frontend: ${project.architecture.frontend.framework}`);
    lines.push(`- Backend: ${project.architecture.backend.framework}`);
    lines.push(`- Database: ${project.architecture.database.type}`);
    lines.push(`- Auth: ${project.architecture.auth.provider}`);
    lines.push(`- Hosting: ${project.architecture.infrastructure.hosting}`);
  }
  lines.push("");
  lines.push(...apiBlock(project));
  
  lines.push("## Constraints");
  lines.push("");
  for (const rule of project.rules) {
    lines.push(`- ${rule.text}`);
  }
  lines.push("");
  
  lines.push("## Guidelines");
  lines.push("");
  lines.push("- Follow the tech stack specified above");
  lines.push("- Maintain consistency with existing code patterns");
  lines.push("- Write clean, well-documented code");
  lines.push("- Handle errors appropriately");
  lines.push("");
  
  return lines.join("\n");
}
