import React from "react";

interface ErrorMessageProps {
  message: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, code, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div style={{
      padding: "16px",
      backgroundColor: "var(--vscode-inputValidation-errorBackground)",
      borderRadius: "6px",
      border: "1px solid var(--vscode-inputValidation-errorBorder)"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <span style={{ fontSize: "20px" }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--vscode-errorForeground)" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>{message}</p>
          {code && (
            <p style={{ fontSize: "11px", opacity: 0.5, margin: "8px 0 0 0" }}>Error code: {code}</p>
          )}
        </div>
      </div>
      {(onRetry || onDismiss) && (
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid var(--vscode-panel-border)",
                borderRadius: "4px",
                color: "var(--vscode-editor-foreground)",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Dismiss
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--vscode-button-background)",
                color: "var(--vscode-button-foreground)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
