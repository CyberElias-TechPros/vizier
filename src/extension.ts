import * as vscode from "vscode";
import { classifyIdeaWithFallback } from "./core/classifier";
import { generateBlueprint } from "./core/blueprint";
import { scanWorkspace } from "./core/repoScanner";
import { initVizierSecrets } from "./llm/client";
import { exportPlan } from "./export";
import {
  initQuestionnaire,
  getCurrentQuestion,
  processAnswer,
  skipQuestion,
  goBack,
  getProgress
} from "./core/questionnaire";
import { QuestionnaireState } from "./core/questionnaire";
import { ErrorCode, VizierError, extractErrorMessage, logError, isTransientError, generateTraceId } from "./errors";
import { validateAndSanitizeIdea } from "./validation";
import { vizierSettingDefinitions } from "./settings";

let questionnaireState: QuestionnaireState | null = null;
let currentIdea: string = "";
let currentProject: any = null;

export function activate(context: vscode.ExtensionContext) {
  console.log("Vizier extension is now active");

  initVizierSecrets(context);
  showPrivacyNotice(context);

  const provider = new VizierViewProvider(context.extensionUri, context);

    vscode.window.registerWebviewViewProvider("vizier.sidebar", provider);


  const planNewAppCmd = vscode.commands.registerCommand(
    "vizier.planNewApp",
    async () => {
      const idea = await vscode.window.showInputBox({
        prompt: "Describe your app idea in 1-3 sentences",
        placeHolder: "e.g., A habit tracking app for mobile with streaks and reminders",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.trim().length < 10) {
            return "Please describe your idea in at least 10 characters";
          }
          if (value.trim().length > 500) {
            return "App idea is too long (max 500 characters)";
          }
          return null;
        }
      });

      if (!idea) return;
      
      // Validate and sanitize input
      let sanitizedIdea: string;
      try {
        sanitizedIdea = validateAndSanitizeIdea(idea);
      } catch (error: any) {
        vscode.window.showErrorMessage(extractErrorMessage(error));
        return;
      }

      currentIdea = sanitizedIdea;

      await classifyIdeaWithRetry(provider, sanitizedIdea);
    }
  );

  const openSidebarCmd = vscode.commands.registerCommand(
    "vizier.openSidebar",
    () => {
      vscode.commands.executeCommand("vizier.sidebar.focus");
    }
  );

  const exportPlanCmd = vscode.commands.registerCommand(
    "vizier.exportPlan",
    () => {
      provider.sendMessage({ type: "EXPORT_PLAN" });
    }
  );

  context.subscriptions.push(planNewAppCmd, openSidebarCmd, exportPlanCmd);
}

let currentAbort: AbortController | null = null;

/**
 * Classify an idea with retry support for transient errors.
 */
async function classifyIdeaWithRetry(
  provider: VizierViewProvider,
  idea: string,
  maxRetries: number = 2
) {
  const traceId = generateTraceId();
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Analyzing your idea${attempt > 0 ? ` (attempt ${attempt + 1})` : ""}...`,
        cancellable: false
      },
      async () => {
        try {
          const category = await classifyIdeaWithFallback(idea);
          questionnaireState = initQuestionnaire(category);
          vscode.commands.executeCommand("vizier.sidebar.focus");
          provider.sendMessage({
            type: "CLASSIFICATION_RESULT",
            payload: { category, confidence: 1.0 }
          });
          sendCurrentQuestion(provider);
          lastError = null;  // Success
          return;
        } catch (error: any) {
          lastError = error;
          logError(error, { 
            code: ErrorCode.CLASSIFICATION_FAILED,
            stage: "classification",
            retryCount: attempt,
            traceId
          });

          // Don't retry if not a transient error
          if (!isTransientError(error) || attempt === maxRetries) {
            const userMessage = extractErrorMessage(error);
            const suggestion = error.message?.includes("user")
              ? "Rephrase your idea and try again."
              : isTransientError(error)
              ? "This appears to be a temporary issue. Check your network and try again."
              : "You can also try picking a category manually.";

            vscode.window.showErrorMessage(
              `${userMessage} ${suggestion}`
            );
          }
        }
      }
    );

    if (!lastError) break;  // Success, exit retry loop
  }
}

async function handleGenerateBlueprint(provider: VizierViewProvider) {
  if (!questionnaireState) return;

  const answers: Record<string, string> = {};
  questionnaireState.answers.forEach(a => {
    answers[a.questionId] = a.value;
  });

  currentAbort = new AbortController();
  const signal = currentAbort.signal;
  const usage = { input: 0, output: 0 };
  const traceId = generateTraceId();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating your blueprint...",
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => currentAbort?.abort());

      try {
        const repoContext = scanWorkspace();
        const project = await generateBlueprint(
          currentIdea,
          questionnaireState!.category,
          answers,
          (stage, total, label) => {
            provider.sendMessage({
              type: "PROGRESS",
              payload: { stage, total, label }
            });
          },
          repoContext,
          signal,
          (u) => { usage.input += u.input; usage.output += u.output; }
        );

        currentProject = project;

        provider.sendMessage({
          type: "BLUEPRINT_READY",
          payload: { ...project, meta: { tokenUsage: usage } }
        });
      } catch (error: any) {
        logError(error, {
          code: ErrorCode.GENERATION_FAILED,
          stage: "blueprint_generation",
          traceId
        });

        const userMessage = signal.aborted
          ? "Generation was cancelled."
          : extractErrorMessage(error, "blueprint_generation");

        provider.sendMessage({
          type: "ERROR",
          payload: { message: userMessage }
        });
      } finally {
        currentAbort = null;
      }
    }
  );
}

async function handleExportPlan(provider: VizierViewProvider) {
  if (!currentProject) {
    provider.sendMessage({
      type: "ERROR",
      payload: { message: "No plan to export. Generate a blueprint first." }
    });
    return;
  }

  const traceId = generateTraceId();

  try {
    const result = await exportPlan(currentProject);
    
    if (result.success) {
      provider.sendMessage({
        type: "EXPORT_COMPLETE",
        payload: { files: result.filesWritten }
      });
    } else {
      logError(
        { message: result.errors.join(", ") },
        { code: ErrorCode.EXPORT_FAILED, traceId }
      );
      provider.sendMessage({
        type: "ERROR",
        payload: { message: `Export failed: ${result.errors.join(", ")}` }
      });
    }
  } catch (error) {
    logError(error, { code: ErrorCode.EXPORT_FAILED, traceId });
    provider.sendMessage({
      type: "ERROR",
      payload: { message: extractErrorMessage(error) }
    });
  }
}

function sendCurrentQuestion(provider: VizierViewProvider) {
  if (!questionnaireState) return;

  const question = getCurrentQuestion(questionnaireState);
  if (!question) {
    provider.sendMessage({
      type: "QUESTIONNAIRE_COMPLETE",
      payload: { answers: questionnaireState.answers }
    });
    return;
  }

  const progress = getProgress(questionnaireState);

  provider.sendMessage({
    type: "QUESTION",
    payload: {
      questionId: question.id,
      text: question.text,
      type: question.type,
      options: question.options || [],
      default: question.default,
      tooltip: question.tooltip,
      progress
    }
  });
}

export function deactivate() {
  console.log("Vizier extension deactivated");
}

/**
 * First-run privacy notice: the extension sends the idea + a repo summary to
 * Anthropic. Disclosed once; the flag persists in global state.
 */
function showPrivacyNotice(context: vscode.ExtensionContext) {
  const flag = "vizier.privacyNoticeShown";
  if (context.globalState.get(flag)) return;
  context.globalState.update(flag, true);
  vscode.window.showInformationMessage(
    "Vizier sends your app idea and a summary of your workspace (package files, README, existing rules) to Anthropic to generate a plan. No source code is sent, and your API key is stored in VS Code Secret Storage."
  );
}

class VizierViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

webviewView.webview.onDidReceiveMessage(async (message) => {
    try {
      switch (message.type) {
        case "WEBVIEW_READY":
          // Webview has signaled it's mounted and ready for messages.
          // Now safe to send ONBOARDING so the idea input form appears.
          webviewView.webview.postMessage({
            type: "ONBOARDING",
            payload: { forceIdeaInput: true }
          });
          break;
        case "START_PLANNING": {
          const rawIdea = message.payload?.idea;
          let sanitizedIdea: string;
          try {
            sanitizedIdea = validateAndSanitizeIdea(rawIdea);
          } catch (error: any) {
            webviewView.webview.postMessage({
              type: "ERROR",
              payload: { message: extractErrorMessage(error) }
            });
            break;
          }
          currentIdea = sanitizedIdea;
          await classifyIdeaWithRetry(this, sanitizedIdea);
          break;
        }
        case "ANSWER_QUESTION":
          if (questionnaireState) {
            questionnaireState = processAnswer(
              questionnaireState,
              message.payload.questionId,
              message.payload.value
            );
            sendCurrentQuestion(this);
          }
          break;
        case "SKIP_QUESTION":
          if (questionnaireState) {
            questionnaireState = skipQuestion(questionnaireState);
            sendCurrentQuestion(this);
          }
          break;
        case "GO_BACK":
          if (questionnaireState) {
            questionnaireState = goBack(questionnaireState);
            sendCurrentQuestion(this);
          }
          break;
        case "GENERATE_BLUEPRINT":
          await handleGenerateBlueprint(this);
          break;
        case "EXPORT_PLAN":
          await handleExportPlan(this);
          break;
        case "GET_SETTINGS": {
          const config = vscode.workspace.getConfiguration("vizier");
          const settings: Record<string, any> = {};
          for (const def of vizierSettingDefinitions) {
            const key = def.key.replace(/^vizier\./, "");
            settings[def.key] = config.get(key, def.defaultValue);
          }
          webviewView.webview.postMessage({
            type: "SETTINGS_STATE",
            payload: { settings, definitions: vizierSettingDefinitions }
          });
          break;
        }
        case "UPDATE_SETTING": {
          const { key, value } = message.payload || {};
          if (!key || typeof key !== "string") break;
          const configKey = key.replace(/^vizier\./, "");
          const config = vscode.workspace.getConfiguration("vizier");
          let normalizedValue: any = value;

          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed === "") normalizedValue = "";
          }

          await config.update(configKey, normalizedValue, vscode.ConfigurationTarget.Global);
          webviewView.webview.postMessage({
            type: "SETTINGS_STATE",
            payload: {
              settings: { ...(await getVizierSettings()), definitions: vizierSettingDefinitions }
            }
          });
          break;
        }
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error: any) {
      console.error("Message handler error:", error);
      logError(error, { code: ErrorCode.UNKNOWN });
      webviewView.webview.postMessage({
        type: "ERROR",
        payload: { 
          message: "An unexpected error occurred. Please check the VS Code console for details." 
        }
      });
    }
  });
  }

  sendMessage(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const webviewUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.js")
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vizier</title>
  <style>
    body { margin: 0; padding: 0; }
    #root { width: 100%; height: 100vh; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${webviewUri}"></script>
</body>
</html>`;
  }
}

async function getVizierSettings(): Promise<Record<string, any>> {
  const config = vscode.workspace.getConfiguration("vizier");
  const settings: Record<string, any> = {};
  for (const def of vizierSettingDefinitions) {
    const key = def.key.replace(/^vizier\./, "");
    settings[def.key] = config.get(key, def.defaultValue);
  }
  return settings;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
