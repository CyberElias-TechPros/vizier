import React from "react";
import { Decision } from "../types";

interface DecisionLogProps {
  decisions: Decision[];
}

export function DecisionLog({ decisions }: DecisionLogProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>Decision Register</h2>
      <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "16px" }}>
        Key architectural decisions made for this project.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {decisions.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            expanded={expandedId === decision.id}
            onToggle={() => setExpandedId(expandedId === decision.id ? null : decision.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DecisionCard({ decision, expanded, onToggle }: { decision: Decision; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        padding: "12px",
        backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
        borderRadius: "6px",
        border: "1px solid var(--vscode-panel-border)"
      }}
    >
      <div
        onClick={onToggle}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
      >
        <div>
          <span style={{ fontSize: "12px", opacity: 0.5 }}>{decision.id}</span>
          <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "4px 0" }}>{decision.topic}</h3>
          <span style={{ fontSize: "13px", color: "var(--vscode-textLink-foreground)" }}>
            Chosen: {decision.chosen}
          </span>
        </div>
        <span style={{ fontSize: "12px", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      
      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--vscode-panel-border)" }}>
          <p style={{ fontSize: "13px", marginBottom: "8px" }}>{decision.rationale}</p>
          {decision.options.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", opacity: 0.75 }}>Alternatives considered:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {decision.options.map((opt, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: opt.name === decision.chosen ? "var(--vscode-testing-iconPassed)" : "var(--vscode-badge-background)",
                      color: opt.name === decision.chosen ? "var(--vscode-editor-background)" : "var(--vscode-badge-foreground)",
                      borderRadius: "4px",
                      fontSize: "12px"
                    }}
                  >
                    {opt.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {decision.impacts.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.75 }}>
              <strong>Impacts:</strong> {decision.impacts.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
