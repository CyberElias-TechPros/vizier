import * as vscode from "vscode";
import { classifyIdea } from "../llm/client";
import { ClassificationResult, ProjectCategory } from "../types/pim";

export async function classifyIdeaWithFallback(idea: string): Promise<ProjectCategory> {
  if (!idea || idea.trim().length === 0) {
    throw new Error("INPUT_EMPTY");
  }
  if (idea.length > 500) {
    throw new Error("INPUT_TOO_LONG");
  }

  let result: ClassificationResult;
  
  try {
    result = await classifyIdea(idea.trim());
  } catch (error) {
    vscode.window.showWarningMessage(
      "Could not classify your idea automatically. Please pick a category."
    );
    return await askUserForCategory();
  }

  if (result.confidence >= 0.7) {
    return result.category;
  }

  const confirmed = await vscode.window.showInformationMessage(
    `I think this is a ${formatCategory(result.category)} project (${Math.round(result.confidence * 100)}% confidence).\n\nReason: ${result.reasoning}`,
    "Yes, that is correct",
    "No, let me pick"
  );

  if (confirmed === "Yes, that is correct") {
    return result.category;
  }

  return await askUserForCategory();
}

async function askUserForCategory(): Promise<ProjectCategory> {
  const items = [
    { label: "SaaS / Web App", value: "saas" as ProjectCategory },
    { label: "Mobile App", value: "mobile" as ProjectCategory },
    { label: "CLI Tool", value: "cli_tool" as ProjectCategory },
    { label: "Browser Extension", value: "browser_ext" as ProjectCategory },
    { label: "Game", value: "game" as ProjectCategory },
    { label: "Internal Tool", value: "internal_tool" as ProjectCategory },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "What type of app are you building?"
  });

  if (!selected) {
    throw new Error("INPUT_INVALID_CATEGORY");
  }

  return selected.value;
}

function formatCategory(category: ProjectCategory): string {
  const labels: Record<ProjectCategory, string> = {
    saas: "SaaS / Web App",
    mobile: "Mobile App",
    cli_tool: "CLI Tool",
    browser_ext: "Browser Extension",
    game: "Game",
    internal_tool: "Internal Tool"
  };
  return labels[category];
}
