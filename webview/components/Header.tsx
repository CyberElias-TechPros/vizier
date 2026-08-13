import React from "react";

interface HeaderProps {
  projectName?: string;
  currentStep?: string;
}

export function Header({ projectName, currentStep }: HeaderProps) {
  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid var(--vscode-panel-border)",
      backgroundColor: "var(--vscode-sideBar-background)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>🚀 Vibe Plan</h1>
        {currentStep && (
          <span style={{ fontSize: "12px", opacity: 0.6, padding: "2px 8px", backgroundColor: "var(--vscode-badge-background)", color: "var(--vscode-badge-foreground)", borderRadius: "10px" }}>
            {currentStep}
          </span>
        )}
      </div>
      {projectName && (
        <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>{projectName}</div>
      )}
    </div>
  );
}
