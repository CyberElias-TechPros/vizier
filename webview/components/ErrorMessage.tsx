import React from "react";

interface ErrorMessageProps {
  message: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, code, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div role="alert" className="viz-anim-fade-down" style={{
      padding: "16px",
      backgroundColor: "var(--vscode-inputValidation-errorBackground)",
      borderRadius: "var(--viz-radius-lg)",
      border: "1px solid var(--vscode-inputValidation-errorBorder)"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <span style={{ marginTop: "2px", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--vscode-errorForeground)" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: "13px", opacity: 0.85, margin: 0 }}>{message}</p>
          {code && (
            <p className="viz-spec" style={{ margin: "8px 0 0 0" }}>{code}</p>
          )}
        </div>
      </div>
      {(onRetry || onDismiss) && (
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
          {onDismiss && (
            <button onClick={onDismiss} className="viz-btn viz-btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }}>
              Dismiss
            </button>
          )}
          {onRetry && (
            <button onClick={onRetry} className="viz-btn viz-btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }}>
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
