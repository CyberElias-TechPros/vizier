// Message protocol version - increment when making breaking changes
export const MESSAGE_PROTOCOL_VERSION = "1.0.0";

// Message types for webview <-> extension host communication
export interface WebviewMessage {
  type: string;
  protocolVersion?: string;  // Version of this message protocol (for compatibility checking)
  payload?: any;
}

// Webview to Host
export interface StartPlanningMessage extends WebviewMessage {
  type: "START_PLANNING";
  payload: { idea: string };
}

export interface AnswerQuestionMessage extends WebviewMessage {
  type: "ANSWER_QUESTION";
  payload: { questionId: string; value: string };
}

export interface SkipQuestionMessage extends WebviewMessage {
  type: "SKIP_QUESTION";
  payload: { questionId: string };
}

export interface GoBackMessage extends WebviewMessage {
  type: "GO_BACK";
}

export interface GenerateBlueprintMessage extends WebviewMessage {
  type: "GENERATE_BLUEPRINT";
}

export interface CheckPlanProgressMessage extends WebviewMessage {
  type: "CHECK_PLAN_PROGRESS";
}

export interface StatusReportMessage extends WebviewMessage {
  type: "STATUS_REPORT";
  payload: { report: any; markdown: string };
}

export interface ProgressMessage extends WebviewMessage {
  type: "PROGRESS";
  payload: { stage: number; total: number; label: string };
}

export interface BlueprintReadyMessage extends WebviewMessage {
  type: "BLUEPRINT_READY";
  payload: any;
}

export interface ExportCompleteMessage extends WebviewMessage {
  type: "EXPORT_COMPLETE";
  payload: { files: string[] };
}

export interface GetSettingsMessage extends WebviewMessage {
  type: "GET_SETTINGS";
}

export interface UpdateSettingMessage extends WebviewMessage {
  type: "UPDATE_SETTING";
  payload: { key: string; value: any };
}

export interface SettingsMessage extends WebviewMessage {
  type: "SETTINGS";
  payload: { requireReviewBeforeExport: boolean };
}

export interface SettingsStateMessage extends WebviewMessage {
  type: "SETTINGS_STATE";
  payload: { settings: Record<string, any>; definitions: any[] };
}

// Host to Webview
export interface ClassificationResultMessage extends WebviewMessage {
  type: "CLASSIFICATION_RESULT";
  payload: { category: string; confidence: number };
}

export interface QuestionMessage extends WebviewMessage {
  type: "QUESTION";
  payload: { questionId: string; text: string; type: string; options: any[]; default: string; tooltip: string; progress: { answered: number; total: number; percentage: number } };
}

export interface QuestionnaireCompleteMessage extends WebviewMessage {
  type: "QUESTIONNAIRE_COMPLETE";
  payload: { answers: any[] };
}

export interface ErrorMessage extends WebviewMessage {
  type: "ERROR";
  payload: { code: string; message: string };
}

// Get the VS Code API
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewMessage) => void;
  getState: () => any;
  setState: (state: any) => void;
};

export const vscode = acquireVsCodeApi();
