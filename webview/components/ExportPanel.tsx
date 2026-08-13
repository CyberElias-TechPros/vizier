import React from "react";

interface ExportPanelProps {
  files: string[];
  onExport: () => void;
  exporting: boolean;
  exported: boolean;
  error: string | null;
}

export function ExportPanel({ files, onExport, exporting, exported, error }: ExportPanelProps) {
  const [showFiles, setShowFiles] = React.useState(false);

  if (exported) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
        <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>Plan Exported!</h2>
        <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "16px" }}>
          Your plan has been written to the /plan/ folder in your workspace.
        </p>
        <button
          onClick={() => setShowFiles(!showFiles)}
          style={{ background: "none", border: "none", color: "var(--vscode-textLink-foreground)", cursor: "pointer", fontSize: "13px" }}
        >
          {showFiles ? "Hide" : "Show"} files ({files.length})
        </button>
        {showFiles && (
          <div style={{ marginTop: "16px", textAlign: "left", padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px" }}>
            {files.map((file, i) => (
              <div key={i} style={{ fontSize: "12px", fontFamily: "monospace", padding: "2px 0" }}>
                📄 {file}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>Export Plan</h2>
      <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "16px" }}>
        Write your plan to files in the /plan/ folder of your workspace.
      </p>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "var(--vscode-inputValidation-errorBackground)", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", color: "var(--vscode-errorForeground)" }}>
          {error}
        </div>
      )}

      <div style={{ padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px", marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>Files to be created:</div>
        <div style={{ fontSize: "12px", opacity: 0.85 }}>
          <div>📁 plan/</div>
          <div style={{ paddingLeft: "16px" }}>📄 overview.md</div>
          <div style={{ paddingLeft: "16px" }}>📄 architecture.md</div>
          <div style={{ paddingLeft: "16px" }}>📄 schema.md</div>
          <div style={{ paddingLeft: "16px" }}>📄 tasks.md</div>
          <div style={{ paddingLeft: "16px" }}>📄 decisions.md</div>
          <div style={{ paddingLeft: "16px" }}>📁 context/ (per-task context packs)</div>
        </div>
      </div>

      <button
        onClick={onExport}
        disabled={exporting}
        style={{
          width: "100%",
          padding: "12px 20px",
          backgroundColor: exporting ? "var(--vscode-button-secondaryBackground)" : "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
          border: "none",
          borderRadius: "6px",
          cursor: exporting ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "600"
        }}
      >
        {exporting ? "Exporting..." : "Export to Files"}
      </button>
    </div>
  );
}
