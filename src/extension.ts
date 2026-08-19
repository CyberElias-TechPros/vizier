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

// --- Phase 1: Memory Engine ------------------------------------------
import { initDatabase, closeDatabase } from "./core/memory/database";
import { initIdentityLayer } from "./core/memory/identity-layer";
import { indexFile, removeFileChunks, renameFileChunks, languageForPath } from "./core/memory/semantic-layer";
import { semanticSearch } from "./core/memory/vector-search";
import { logEpisode } from "./core/memory/episodic-layer";
import { writeSharedMemory, sharedMemoryPath } from "./core/memory/shared-memory";

// --- Phase 2: AST Engine ----------------------------------------------
import * as path from "path";
import {
  initParserEngine,
  parseFile,
  parseSnippet,
  getCachedTree,
  getAllCachedFiles,
  languageForPath as astLanguageForPath
} from "./core/ast/parser-engine";
import type { CachedTree } from "./core/ast/parser-engine";
import { buildWorkspaceGraph } from "./core/ast/workspace-graph";
import type { WorkspaceGraph } from "./core/ast/workspace-graph";
import { getFileStructure } from "./core/ast/get-file-structure";
import { getSymbolAtPosition } from "./core/ast/get-symbol-at-position";
import { validateSyntax } from "./core/ast/validate-syntax";
import { renameSymbol } from "./core/ast/rename";
import type { TextEdit } from "./core/ast/edit-utils";

// --- Phase 3: MCP Bridge ------------------------------------------------
import * as fs from "fs";
import { startMcpBridge, McpServices, McpBridgeHandle } from "./core/mcp";

let questionnaireState: QuestionnaireState | null = null;
let currentIdea: string = "";
let currentProject: any = null;

// --- Phase 2: workspace AST state --------------------------------------
let astGraph: WorkspaceGraph | null = null;

// --- Phase 3: MCP bridge handle -----------------------------------------
let mcpBridge: McpBridgeHandle | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log("Vizier extension is now active");

  initVizierSecrets(context);
  showPrivacyNotice(context);

  // --- Phase 1: Memory Engine activation sequence -----------------------
  const memoryStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  memoryStatusBar.text = "$(sync~spin) Vizier: Indexing...";
  memoryStatusBar.show();
  context.subscriptions.push(memoryStatusBar);

  try {
    await initDatabase(context.globalStorageUri.fsPath);
    initIdentityLayer(context);

    // Initial workspace indexing (semantic layer). Kept intentionally
    // simple/synchronous-ish for Phase 1 — Phase 2's incremental workspace
    // graph will replace the "index everything on activate" approach.
    await indexWorkspaceForMemory();
    await writeSharedMemory();

    memoryStatusBar.text = "$(check) Vizier: Memory ready";
    context.subscriptions.push({ dispose: () => closeDatabase() });
  } catch (err) {
    console.error("[Vizier] Memory engine failed to initialize:", err);
    memoryStatusBar.text = "$(alert) Vizier: Memory init failed";
    vscode.window.showWarningMessage(
      "Vizier's memory engine failed to start. Planning features still work; memory search will be unavailable."
    );
  }

  // --- Phase 2: AST engine activation -----------------------------------
  const astStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  astStatusBar.text = "$(sync~spin) Vizier: Parsing...";
  astStatusBar.show();
  context.subscriptions.push(astStatusBar);

  try {
    await initParserEngine(path.join(__dirname, "wasm"));
    const parsed = await indexWorkspaceForAst();
    astStatusBar.text = `$(file-code) Vizier: ${parsed} file(s) parsed`;
  } catch (err) {
    console.error("[Vizier] AST engine failed to initialize:", err);
    astStatusBar.text = "$(alert) Vizier: AST init failed";
  }

  // --- Phase 3: MCP bridge activation -----------------------------------
  const mcpStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
  context.subscriptions.push(mcpStatusBar);

  const mcpConfig = vscode.workspace.getConfiguration("vizier");
  const mcpEnabled = mcpConfig.get<boolean>("mcpEnabled", true);
  const mcpPort = mcpConfig.get<number>("mcpPort", 3000);

  if (mcpEnabled) {
    const services: McpServices = {
      readFile: (filePath) => {
        try {
          return fs.readFileSync(filePath, "utf8");
        } catch {
          return null;
        }
      },
      getCachedTree: (filePath) => getCachedTree(filePath),
      parseFile: async (filePath, text) => parseFile(filePath, text),
      getAllParsedFiles: () => snapshotParsedFiles(),
      getGraph: () => astGraph,
      logEpisode: (toolName, summary, filePath) => logEpisode(toolName, summary, filePath)
    };

    try {
      mcpBridge = await startMcpBridge(services, mcpPort);
      mcpStatusBar.text = `$(link) Vizier: MCP :${mcpPort}`;
      mcpStatusBar.tooltip = "Vizier MCP bridge — connect any MCP client to http://localhost:3000/sse";
      mcpStatusBar.show();
      context.subscriptions.push({
        dispose: () => {
          mcpBridge?.dispose();
          mcpBridge = null;
        }
      });
    } catch (err) {
      console.error("[Vizier] MCP bridge failed to start:", err);
      mcpStatusBar.text = "$(alert) Vizier: MCP failed";
      mcpStatusBar.show();
    }
  }

  // Incremental re-indexing on save/delete/rename, per architecture doc §5.3.
  const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (!languageForPath(doc.uri.fsPath)) return;
    try {
      const chunks = indexFile(doc.uri.fsPath, doc.getText());
      logEpisode("indexFile", `Re-indexed on save (${chunks.length} chunks)`, doc.uri.fsPath);
      await writeSharedMemory();
    } catch (err) {
      console.error(`[Vizier] Failed to re-index ${doc.uri.fsPath} on save:`, err);
    }
    if (astLanguageForPath(doc.uri.fsPath)) {
      try {
        await parseFile(doc.uri.fsPath, doc.getText());
        astGraph = buildWorkspaceGraph(snapshotParsedFiles());
      } catch (err) {
        console.error(`[Vizier] Failed to re-parse ${doc.uri.fsPath} on save:`, err);
      }
    }
  });

  const deleteWatcher = vscode.workspace.onDidDeleteFiles((e) => {
    for (const uri of e.files) {
      removeFileChunks(uri.fsPath);
      logEpisode("removeFileChunks", "File deleted", uri.fsPath);
    }
  });

  const renameWatcher = vscode.workspace.onDidRenameFiles((e) => {
    for (const { oldUri, newUri } of e.files) {
      renameFileChunks(oldUri.fsPath, newUri.fsPath);
      logEpisode("renameFileChunks", `Renamed to ${newUri.fsPath}`, newUri.fsPath);
    }
  });

  context.subscriptions.push(saveWatcher, deleteWatcher, renameWatcher);

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

  // --- Phase 1 commands (per architecture doc §4.4) ---------------------
  const indexWorkspaceCmd = vscode.commands.registerCommand("vizier.indexWorkspace", async () => {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Vizier: Indexing workspace..." },
      async () => {
        const count = await indexWorkspaceForMemory();
        await writeSharedMemory();
        vscode.window.showInformationMessage(`Vizier indexed ${count} file(s).`);
      }
    );
  });

  const searchMemoryCmd = vscode.commands.registerCommand("vizier.searchMemory", async () => {
    const query = await vscode.window.showInputBox({
      prompt: "Search Vizier's semantic memory",
      placeHolder: "e.g., where do we handle user authentication?"
    });
    if (!query) return;

    const results = semanticSearch(query, 15);
    logEpisode("semanticSearch", `Searched: ${query}`);

    if (results.length === 0) {
      vscode.window.showInformationMessage("No matches found. Try running \"Vizier: Index Workspace\" first.");
      return;
    }

    const picked = await vscode.window.showQuickPick(
      results.map((r) => ({
        label: `${r.symbol_name ?? "(unnamed)"}`,
        description: `${r.file_path}:${r.start_line}-${r.end_line}`,
        detail: `score ${r.score.toFixed(3)} · ${r.symbol_kind ?? "chunk"}`,
        result: r
      })),
      { placeHolder: `${results.length} result(s) for "${query}"` }
    );

    if (picked) {
      const doc = await vscode.workspace.openTextDocument(picked.result.file_path);
      const editor = await vscode.window.showTextDocument(doc);
      const range = new vscode.Range(
        Math.max(0, picked.result.start_line - 1), 0,
        Math.max(0, picked.result.end_line - 1), 0
      );
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      editor.selection = new vscode.Selection(range.start, range.start);
    }
  });

  const openSharedMemoryCmd = vscode.commands.registerCommand("vizier.openSharedMemory", async () => {
    const doc = await vscode.workspace.openTextDocument(sharedMemoryPath());
    await vscode.window.showTextDocument(doc);
  });

  // --- Phase 2 commands -------------------------------------------------
  const astParseWorkspaceCmd = vscode.commands.registerCommand("vizier.astParseWorkspace", async () => {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Vizier: Parsing workspace AST..." },
      async () => {
        const parsed = await indexWorkspaceForAst();
        vscode.window.showInformationMessage(
          `Vizier parsed ${parsed} file(s); call graph has ${astGraph?.symbols.size ?? 0} symbol(s).`
        );
      }
    );
  });

  const astFileStructureCmd = vscode.commands.registerCommand("vizier.astFileStructure", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Open a source file first.");
      return;
    }
    const filePath = editor.document.uri.fsPath;
    let cached = getCachedTree(filePath);
    if (!cached) cached = await parseFile(filePath, editor.document.getText());

    const structure = getFileStructure(filePath, cached);
    const md =
      `# Structure — ${path.basename(filePath)}\n\n` +
      structure.symbols
        .map(
          (s) =>
            `## ${s.kind} \`${s.name}\` (lines ${s.range.startLine}-${s.range.endLine})\n` +
            s.children.map((c) => `- ${c.kind} \`${c.name}\` (lines ${c.range.startLine}-${c.range.endLine})`).join("\n")
        )
        .join("\n\n") || "_No top-level symbols found._";

    const doc = await vscode.workspace.openTextDocument({ content: md, language: "markdown" });
    await vscode.window.showTextDocument(doc, { preview: true });
  });

  const astRenameSymbolCmd = vscode.commands.registerCommand("vizier.astRenameSymbol", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Open a source file first.");
      return;
    }
    const filePath = editor.document.uri.fsPath;
    const pos = editor.selection.active;
    let cached = getCachedTree(filePath);
    if (!cached) cached = await parseFile(filePath, editor.document.getText());

    const symbol = getSymbolAtPosition(cached, pos.line + 1, pos.character);
    if (!symbol.found || !symbol.name) {
      vscode.window.showWarningMessage("No symbol at the cursor to rename.");
      return;
    }

    const newName = await vscode.window.showInputBox({
      prompt: `Rename "${symbol.name}" to`,
      value: symbol.name,
      validateInput: (value) => (value && value.trim().length > 0 ? null : "Enter a new name")
    });
    if (!newName) return;

    const result = renameSymbol(filePath, cached, pos.line + 1, pos.character, newName);
    if (result.occurrences === 0) {
      vscode.window.showInformationMessage(`"${result.symbolName}" has no other references.`);
      return;
    }

    const confirmed = await vscode.window.showQuickPick(
      [
        {
          label: `Apply ${result.occurrences} edit(s)`,
          description: `Rename ${result.symbolName} -> ${newName} in ${result.affectedFiles.length} file(s)`
        },
        { label: "Cancel", description: "Discard the preview" }
      ],
      { placeHolder: "Preview only — nothing is applied yet" }
    );
    if (!confirmed || confirmed.label === "Cancel") return;

    await applyTextEdits(result.edits);
    logEpisode("renameSymbol", `Renamed ${result.symbolName} -> ${newName} (${result.occurrences} reference(s))`, filePath);
    vscode.window.showInformationMessage(`Renamed ${result.symbolName} -> ${newName}.`);
  });

  const astValidateFileCmd = vscode.commands.registerCommand("vizier.astValidateFile", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Open a source file first.");
      return;
    }
    const language = astLanguageForPath(editor.document.uri.fsPath);
    if (!language) {
      vscode.window.showWarningMessage("Unsupported file type (use .ts/.tsx/.js/.jsx/.py).");
      return;
    }
    const tree = await parseSnippet(editor.document.getText(), language);
    const { valid, errors } = validateSyntax(tree.rootNode);
    if (valid) {
      vscode.window.showInformationMessage("No syntax errors.");
    } else {
      const first = errors[0];
      vscode.window.showErrorMessage(`${errors.length} syntax error(s). First: line ${first.line}: ${first.message}`);
    }
  });

  context.subscriptions.push(
    planNewAppCmd,
    openSidebarCmd,
    exportPlanCmd,
    indexWorkspaceCmd,
    searchMemoryCmd,
    openSharedMemoryCmd,
    astParseWorkspaceCmd,
    astFileStructureCmd,
    astRenameSymbolCmd,
    astValidateFileCmd
  );
}

/**
 * Index all supported source files in the workspace into the semantic
 * layer. Returns the number of files indexed. Kept as a standalone
 * function so both activate() and the "Index Workspace" command can call it.
 */
async function indexWorkspaceForMemory(): Promise<number> {
  const files = await vscode.workspace.findFiles(
    "**/*.{ts,tsx,js,jsx,py}",
    "**/{node_modules,dist,out,build,.git}/**"
  );

  let indexed = 0;
  for (const uri of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      indexFile(uri.fsPath, doc.getText());
      indexed++;
    } catch (err) {
      console.error(`[Vizier] Failed to index ${uri.fsPath}:`, err);
    }
  }
  return indexed;
}

/**
 * Parse all supported source files into the AST cache and rebuild the
 * workspace call graph. Returns the number of files parsed.
 */
async function indexWorkspaceForAst(): Promise<number> {
  const files = await vscode.workspace.findFiles(
    "**/*.{ts,tsx,js,jsx,py}",
    "**/{node_modules,dist,out,build,.git}/**"
  );

  let parsed = 0;
  for (const uri of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await parseFile(uri.fsPath, doc.getText());
      parsed++;
    } catch (err) {
      console.error(`[Vizier] Failed to parse ${uri.fsPath}:`, err);
    }
  }
  astGraph = buildWorkspaceGraph(snapshotParsedFiles());
  return parsed;
}

/** Materialize the parser-engine's internal cache into a plain map. */
function snapshotParsedFiles(): Map<string, CachedTree> {
  const files = new Map<string, CachedTree>();
  for (const filePath of getAllCachedFiles()) {
    const cached = getCachedTree(filePath);
    if (cached) files.set(filePath, cached);
  }
  return files;
}

/** Convert plain {file, range, newText} edits into a vscode.WorkspaceEdit and apply. */
function applyTextEdits(edits: TextEdit[]): Thenable<boolean> {
  const wsEdit = new vscode.WorkspaceEdit();
  for (const e of edits) {
    const uri = vscode.Uri.file(e.file);
    const range = new vscode.Range(
      e.range.startLine - 1,
      e.range.startColumn,
      e.range.endLine - 1,
      e.range.endColumn
    );
    wsEdit.replace(uri, range, e.newText);
  }
  return vscode.workspace.applyEdit(wsEdit);
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
