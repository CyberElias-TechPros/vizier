import React from "react";

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

interface QuestionPanelProps {
  questionId: string;
  text: string;
  type: string;
  options?: QuestionOption[];
  default_value: string;
  tooltip: string;
  progress: { answered: number; total: number; percentage: number };
  onAnswer: (questionId: string, value: string) => void;
  onSkip: (questionId: string) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export function QuestionPanel({
  questionId,
  text,
  type,
  options,
  default_value,
  tooltip,
  progress,
  onAnswer,
  onSkip,
  onBack,
  canGoBack
}: QuestionPanelProps) {
  const [selected, setSelected] = React.useState<string>("");
  const [showTooltip, setShowTooltip] = React.useState(false);

  const handleSubmit = () => {
    onAnswer(questionId, selected || default_value);
    setSelected("");
  };

  const handleSkip = () => {
    onSkip(questionId);
    setSelected("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px", opacity: 0.75 }}>
          <span>Question {progress.answered + 1} of {progress.total}</span>
          <span>{progress.percentage}%</span>
        </div>
        <div style={{ width: "100%", height: "4px", backgroundColor: "var(--vscode-panel-border)", borderRadius: "2px" }}>
          <div style={{ width: `${progress.percentage}%`, height: "100%", backgroundColor: "var(--vscode-focusBorder)", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Question text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0, flex: 1 }}>{text}</h2>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          title="Why this matters"
          style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, fontSize: "14px" }}
        >
          ?
        </button>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div style={{ backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {tooltip}
        </div>
      )}

      {/* Options */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {type === "select" && options && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px",
                  border: selected === option.value ? "1px solid var(--vscode-focusBorder)" : "1px solid var(--vscode-panel-border)",
                  borderRadius: "6px",
                  backgroundColor: selected === option.value ? "var(--vscode-editor-inactiveSelectionBackground)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--vscode-editor-foreground)"
                }}
              >
                <span style={{ fontWeight: "600", fontSize: "14px" }}>{option.label}</span>
                {option.description && (
                  <span style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>{option.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--vscode-panel-border)" }}>
        <button
          onClick={onBack}
          disabled={!canGoBack}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid var(--vscode-panel-border)",
            borderRadius: "4px",
            color: "var(--vscode-editor-foreground)",
            cursor: canGoBack ? "pointer" : "not-allowed",
            opacity: canGoBack ? 1 : 0.5
          }}
        >
          Back
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: "4px",
              color: "var(--vscode-editor-foreground)",
              cursor: "pointer"
            }}
          >
            Skip (use default)
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--vscode-button-background)",
              border: "none",
              borderRadius: "4px",
              color: "var(--vscode-button-foreground)",
              cursor: "pointer"
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
