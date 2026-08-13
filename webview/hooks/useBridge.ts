import React from "react";
import { vscode, WebviewMessage } from "../protocol";

export function useBridge() {
  const [lastMessage, setLastMessage] = React.useState<WebviewMessage | null>(null);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      setLastMessage(event.data as WebviewMessage);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const sendMessage = (message: WebviewMessage) => {
    vscode.postMessage(message);
  };

  return { sendMessage, lastMessage };
}

export function useMessage(type: string, handler: (payload: any) => void) {
  const { lastMessage } = useBridge();

  React.useEffect(() => {
    if (lastMessage?.type === type) {
      handler(lastMessage.payload);
    }
  }, [lastMessage, type, handler]);
}
