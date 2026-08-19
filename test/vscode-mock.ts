const defaultStore: Record<string, any> = {};

function getConfig() {
  return {
    get: (key: string, def?: any) => (key in defaultStore ? defaultStore[key] : def),
    update: async () => {},
    has: (key: string) => key in defaultStore
  };
}

export function __setConfig(key: string, value: any) {
  defaultStore[key] = value;
}

function workspaceFolders(): any[] {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const dir = process.env.VIZIER_TEST_WS || fs.mkdtempSync(path.join(os.tmpdir(), "vizier-"));
  return [{ uri: { fsPath: dir } }];
}

export const workspace = {
  getConfiguration: () => getConfig(),
  get workspaceFolders(): any[] {
    return workspaceFolders();
  }
};

export const window = {
  showInputBox: async () => "",
  showErrorMessage: () => {},
  showWarningMessage: () => {},
  showInformationMessage: async () => "",
  withProgress: async (_o: any, cb: any) =>
    cb({ report() {} }, { isCancellationRequested: false, onCancellationRequested() {} })
};

export const commands = {
  registerCommand: () => ({ dispose() {} }),
  executeCommand: async () => {}
};

export const ProgressLocation = { Notification: 15, Window: 10 };
export const env = { openExternal: async () => true };
export const Uri = { file: (p: string) => ({ fsPath: p }) };

export default { workspace, window, commands, ProgressLocation, env, Uri };
