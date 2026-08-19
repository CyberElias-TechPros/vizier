import * as vscode from "vscode";
import { ClassificationResult, ProjectCategory } from "../types/pim";
import { parseAndValidate, ValidationError } from "./schemas";
import { ModelProvider } from "./types";
import { complete, getProvider, getEffectiveModel, getEffectiveTemperature, initProviderSecrets } from "./provider";

export function initVizierSecrets(context: vscode.ExtensionContext): void {
  initProviderSecrets(context);
}

export async function classifyIdea(
  idea: string,
  provider?: ModelProvider
): Promise<ClassificationResult> {
  const p = provider || (await getProvider());

  const response = await complete(
    {
      system: getClassificationSystemPrompt(),
      messages: [{ role: "user", content: idea }],
      maxTokens: 300,
      model: getEffectiveModel("classification"),
      temperature: getEffectiveTemperature(0.7)
    },
    p
  );

  const text = response.text;
  try {
    const parsed = parseAndValidate(text, "classification");
    const validCategories: ProjectCategory[] = [
      "saas",
      "mobile",
      "cli_tool",
      "browser_ext",
      "game",
      "internal_tool"
    ];
    if (!validCategories.includes(parsed.category as ProjectCategory)) {
      throw new Error("Invalid category: " + parsed.category);
    }
    const result: ClassificationResult = {
      category: parsed.category as ProjectCategory,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || "No reasoning provided"
    };
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error("Failed to parse classification: " + error.issues.join("; "));
    }
    throw error;
  }
}

function getClassificationSystemPrompt(): string {
  return [
    "You are a software project classifier. Given a brief description of an app idea, classify it into exactly one of these categories:",
    "",
    "1. saas - Web application with users, billing, dashboards (e.g., project management tool, CRM system, analytics dashboard)",
    "2. mobile - iOS/Android app (e.g., workout tracker, meditation app, food delivery app)",
    "3. cli_tool - Command-line utility (e.g., markdown to PDF converter, file organizer, git workflow tool)",
    "4. browser_ext - Browser extension (e.g., bookmark manager, password manager, productivity timer)",
    "5. game - Game (e.g., 2D platformer, puzzle game, multiplayer card game)",
    "6. internal_tool - Internal business tool (e.g., admin dashboard, analytics reporting, inventory management)",
    "",
    "Respond with ONLY a JSON object in this exact format:",
    '{"category": "<category_name>", "confidence": <number_between_0_and_1>, "reasoning": "<one_sentence_explanation>"}',
    "",
    "Rules:",
    "- confidence should be high (>0.8) if the idea clearly fits one category",
    "- confidence should be lower (<0.7) if the idea could fit multiple categories or is very vague",
    "- Use lowercase category names exactly as listed above"
  ].join("\n");
}
