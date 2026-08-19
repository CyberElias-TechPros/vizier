import React from "react";

interface HeaderProps {
  projectName?: string;
  currentStep?: string;
  onOpenSettings?: () => void;
}

export function Header({ projectName, currentStep, onOpenSettings }: HeaderProps) {
  return (
    <div
      role="banner"
      aria-label="Vizier header"
      className="viz-header viz-blueprint-grid"
      style={{
        padding: "16px 16px 12px",
        borderBottom: "1px solid var(--viz-border)",
        backgroundColor: "var(--vscode-sideBar-background)",
        backgroundSize: "18px 18px",
        overflow: "hidden"
      }}
    >
      <span className="viz-throne-bar" aria-hidden="true" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
       <h1
          className="viz-display"
          style={{ fontSize: "15px", margin: 0, display: "flex", alignItems: "center", gap: "9px", color: "var(--vscode-editor-foreground)" }}
        >
          <span aria-hidden="true" style={{ display: "inline-flex", position: "relative", width: "22px", height: "22px", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
              <defs>
                <linearGradient id="viz-header-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--viz-gold)" />
                  <stop offset="100%" stopColor="var(--viz-accent)" />
                </linearGradient>
              </defs>
              <circle cx="9" cy="9" r="7.5" stroke="url(#viz-header-gradient)" strokeWidth="1.3" opacity="0.55" />
              <path d="M9 2.5 L9 6.5 M9 11.5 L9 15.5 M2.5 9 L6.5 9 M11.5 9 L15.5 9" stroke="url(#viz-header-gradient)" strokeWidth="1.1" opacity="0.4" />
              <circle cx="9" cy="9" r="2.25" fill="url(#viz-header-gradient)" />
            </svg>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                boxShadow: "0 0 0 0 color-mix(in srgb, var(--viz-gold) 30%, transparent)",
                animation: "viz-ping 3s var(--viz-ease) infinite"
              }}
            />
          </span>
          <span style={{ letterSpacing: "0.01em" }}>Vizier</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Vizier settings"
              className="viz-btn viz-btn-ghost"
              style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 500 }}
            >
              Settings
            </button>
          )}
          {currentStep && (
            <span
              aria-label={`Current step: ${currentStep}`}
              className="viz-spec"
              style={{
                padding: "3px 9px",
                backgroundColor: "var(--viz-accent-soft)",
                border: "1px solid var(--viz-accent-line)",
                borderRadius: "999px",
                color: "var(--viz-accent-bright)",
                opacity: 1
              }}
            >
              {currentStep}
            </span>
          )}
        </div>
      </div>

      {projectName && (
        <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "6px", fontWeight: 500 }}>{projectName}</div>
      )}

      <div className="viz-eyebrow" style={{ marginTop: "3px", opacity: 0.55 }}>
        AI-assisted &middot; local plan monitoring &middot; verify all output
      </div>

      <div className="viz-header-divider" />
    </div>
  );
}
