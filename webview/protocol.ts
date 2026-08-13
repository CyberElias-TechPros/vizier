// Message types for webview <-> extension host communication
export interface WebviewMessage {
  type: string;
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

export interface GetStateMessage extends WebviewMessage {
  type: "GET_STATE";
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

export interface StateUpdateMessage extends WebviewMessage {
  type: "STATE_UPDATE";
  payload: { view: string; data: any };
}

// Get the VS Code API
declare function acquireVsCodeApi(): {
  postMessage: (message: WebviewMessage) => void;
  getState: () => any;
  setState: (state: any) => void;
};

export const vscode = acquireVsCodeApi();
