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
          return null;
        }
      });

      if (!idea) return;
      currentIdea = idea;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing your idea...",
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
          } catch (error) {
            vscode.window.showErrorMessage("Failed to classify idea. Please try again.");
          }
        }
      );
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

async function handleGenerateBlueprint(provider: VizierViewProvider) {
  if (!questionnaireState) return;

  const answers: Record<string, string> = {};
  questionnaireState.answers.forEach(a => {
    answers[a.questionId] = a.value;
  });

  currentAbort = new AbortController();
  const signal = currentAbort.signal;
  const usage = { input: 0, output: 0 };

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
        provider.sendMessage({
          type: "ERROR",
          payload: {
            message: signal.aborted
              ? "Generation cancelled."
              : "Failed to generate blueprint. Please try again."
          }
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

  try {
    const result = await exportPlan(currentProject);
    
    if (result.success) {
      provider.sendMessage({
        type: "EXPORT_COMPLETE",
        payload: { files: result.filesWritten }
      });
    } else {
      provider.sendMessage({
        type: "ERROR",
        payload: { message: result.errors.join(", ") }
      });
    }
  } catch (error) {
    provider.sendMessage({
      type: "ERROR",
      payload: { message: "Failed to export plan. Please try again." }
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
      switch (message.type) {
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
  <meta http-equiv="Content-Security-Policy" content="default-src \\'none\\'; style-src ${webview.cspSource} \\'unsafe-inline\\'; script-src \\'nonce-${nonce}\\';">
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

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
