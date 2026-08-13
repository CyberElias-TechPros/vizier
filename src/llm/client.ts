import Anthropic from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import { ClassificationResult, ProjectCategory } from "../types/pim";
import { parseAndValidate, ValidationError } from "./schemas";

let client: Anthropic | null = null;
let extContext: vscode.ExtensionContext | null = null;
const SECRET_KEY = "vizier.anthropicApiKey";

/**
 * Provide the extension context so the API key can be stored in SecretStorage
 * (encrypted) instead of plaintext settings.
 */
export function initVizierSecrets(context: vscode.ExtensionContext): void {
  extContext = context;
}

async function getClient(): Promise<Anthropic> {
  if (client) {
    return client;
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("CONFIG_NO_API_KEY");
  }

  client = new Anthropic({ apiKey });
  return client;
}

async function getApiKey(): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("vizier");

  // Prefer encrypted secret storage
  if (extContext) {
    const stored = await extContext.secrets.get(SECRET_KEY);
    if (stored) {
      // Migrate away any legacy plaintext copy
      const legacy = config.get<string>("anthropicApiKey");
      if (legacy) {
        await config.update("anthropicApiKey", undefined, vscode.ConfigurationTarget.Global);
      }
      return stored;
    }

    // Migrate a plaintext key set via settings into the secret store
    const legacy = config.get<string>("anthropicApiKey");
    if (legacy && legacy.length > 0) {
      await extContext.secrets.store(SECRET_KEY, legacy);
      await config.update("anthropicApiKey", undefined, vscode.ConfigurationTarget.Global);
      return legacy;
    }
  } else {
    const legacy = config.get<string>("anthropicApiKey");
    if (legacy && legacy.length > 0) {
      return legacy;
    }
  }

  const apiKey = await vscode.window.showInputBox({
    prompt: "Enter your Anthropic API key",
    placeHolder: "sk-ant-...",
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || !value.startsWith("sk-ant-")) {
        return "API key must start with sk-ant-";
      }
      return null;
    }
  });

  if (apiKey && extContext) {
    await extContext.secrets.store(SECRET_KEY, apiKey);
    return apiKey;
  }

  return apiKey ?? null;
}

export async function classifyIdea(idea: string): Promise<ClassificationResult> {
  const anthropic = await getClient();
  const config = vscode.workspace.getConfiguration("vizier");
  const model = config.get<string>("preferredModel", "claude-sonnet-4-20250514");

  const response = await anthropic.messages.create({
    model: model,
    max_tokens: 300,
    system: getClassificationSystemPrompt(),
    messages: [
      {
        role: "user",
        content: idea
      }
    ]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const parsed = parseAndValidate(text, "classification");
    const validCategories: ProjectCategory[] = ["saas", "mobile", "cli_tool", "browser_ext", "game", "internal_tool"];
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
