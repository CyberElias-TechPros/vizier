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
  const [selectedValues, setSelectedValues] = React.useState<string[]>(() => {
    if (type === "multi_select" && default_value) {
      return default_value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [showTooltip, setShowTooltip] = React.useState(false);

  const isMulti = type === "multi_select";

  const toggleMulti = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = () => {
    const value = isMulti ? selectedValues.join(",") : selectedValues[0] || default_value;
    onAnswer(questionId, value);
    setSelectedValues([]);
  };

  const handleSkip = () => {
    onSkip(questionId);
    setSelectedValues([]);
  };

  const isSelected = (value: string) => selectedValues.includes(value);

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

      {isMulti && (
        <p style={{ fontSize: "12px", opacity: 0.6, marginTop: 0, marginBottom: "12px" }}>
          Select all that apply (recommended are pre-selected).
        </p>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div style={{ backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", padding: "12px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {tooltip}
        </div>
      )}

      {/* Options */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {options && options.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {options.map((option) => {
              const selected = isSelected(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => (isMulti ? toggleMulti(option.value) : setSelectedValues([option.value]))}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "12px",
                    border: selected ? "1px solid var(--vscode-focusBorder)" : "1px solid var(--vscode-panel-border)",
                    borderRadius: "6px",
                    backgroundColor: selected ? "var(--vscode-editor-inactiveSelectionBackground)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--vscode-editor-foreground)"
                  }}
                >
                  {isMulti && (
                    <span
                      style={{
                        marginTop: "2px",
                        width: "16px",
                        height: "16px",
                        flexShrink: 0,
                        borderRadius: "3px",
                        border: "1px solid var(--vscode-focusBorder)",
                        backgroundColor: selected ? "var(--vscode-focusBorder)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        color: "var(--vscode-button-foreground)"
                      }}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  )}
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "600", fontSize: "14px" }}>{option.label}</span>
                    {option.description && (
                      <span style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>{option.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
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
