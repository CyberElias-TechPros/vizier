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
    if (options && options.length > 0 && default_value) {
      return default_value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

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
    <div className="viz-page" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span className="viz-spec" style={{ opacity: 0.7 }}>[Q&middot;{String(progress.answered + 1).padStart(2, "0")}/{String(progress.total).padStart(2, "0")}]</span>
          <span className="viz-spec" style={{ color: "var(--viz-accent-bright)" }}>{progress.percentage}%</span>
        </div>
        <div className="viz-track" style={{ height: "4px", overflow: "hidden" }}>
          <div className="viz-shimmer" style={{ width: `${progress.percentage}%`, height: "100%", borderRadius: "2px", transition: "width 0.4s var(--viz-ease)" }} />
        </div>
      </div>

      {/* Question text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "16px" }}>
        <h2 className="viz-display viz-fade-item" style={{ fontSize: "17px", margin: 0, flex: 1, lineHeight: 1.35, fontWeight: 600 }}>{text}</h2>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="Show context for this question"
          aria-expanded={showTooltip}
          aria-controls="q-tooltip"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowTooltip(!showTooltip);
            }
          }}
          title="Why this matters"
          className="viz-btn viz-btn-ghost"
          style={{ padding: 0, width: "24px", height: "24px", borderRadius: "50%", fontSize: "12px", flexShrink: 0 }}
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
        <div id="q-tooltip" role="region" aria-label="Question context" className="viz-callout viz-fade-item" style={{ padding: "12px", marginBottom: "16px", fontSize: "13px" }}>
          {tooltip}
        </div>
      )}

      {/* Options */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {options && options.length > 0 && (
          <div
            role={isMulti ? "group" : "radiogroup"}
            aria-label={text}
            aria-required={isMulti ? undefined : true}
            className="viz-q-options"
          >
            {options.map((option, idx) => {
              const selected = isSelected(option.value);
              const isRecommended = default_value?.split(",").map((s) => s.trim()).filter(Boolean).includes(option.value);
              const optionId = `q-${questionId}-opt-${idx}`;
              const descId = option.description ? `${optionId}-desc` : undefined;
              return (
                <button
                  key={option.value}
                  ref={(el) => { optionRefs.current[idx] = el; }}
                  role={isMulti ? "checkbox" : "radio"}
                  aria-checked={selected}
                  aria-labelledby={optionId}
                  aria-describedby={descId}
                  tabIndex={isMulti ? 0 : focusedIndex === idx ? 0 : -1}
                  onKeyDown={(e) => {
                    if (isMulti) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = (idx + 1) % options.length;
                      setFocusedIndex(next);
                      optionRefs.current[next]?.focus();
                    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const prev = (idx - 1 + options.length) % options.length;
                      setFocusedIndex(prev);
                      optionRefs.current[prev]?.focus();
                    }
                  }}
                  onClick={() => (isMulti ? toggleMulti(option.value) : setSelectedValues([option.value]))}
                  className={`viz-stagger-item viz-q-option${selected ? " selected" : ""}`}
                  style={{ ["--viz-delay" as any]: `${idx * 45}ms` }}
                >
                  {!isMulti && <span className="viz-q-radio" aria-hidden="true" />}
                  {isMulti && <span className="viz-q-checkbox" aria-hidden="true" />}
                  <span id={optionId} className="viz-q-label">
                    {isRecommended && (
                      <span
                        className="viz-crown"
                        aria-label="Recommended"
                        title="Recommended by Vizier"
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7.91 15.14 4 9.27z" />
                        </svg>
                      </span>
                    )}
                    {option.label}
                    {option.description && (
                      <span id={descId} className="viz-q-desc">{option.description}</span>
                    )}
                  </span>
                  {selected && (
                    <span className="viz-q-badge" aria-hidden="true">
                      ✓ Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live selection summary */}
      {options && options.length > 0 && (
        <div className={`viz-q-summary${selectedValues.length > 0 ? " has-selection" : ""}`}>
          <span className="viz-q-summary-text">
            {selectedValues.length > 0
              ? `Selected (${selectedValues.length}): ${options.filter((o) => selectedValues.includes(o.value)).map((o) => o.label).join(", ")}`
              : "Nothing selected yet — pick an option above"}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--viz-border)" }}>
        <button
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Go back to previous question"
          className="viz-btn viz-btn-ghost"
        >
          Back
        </button>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSkip} className="viz-btn viz-btn-ghost">
            Skip (use default)
          </button>
          <button onClick={handleSubmit} className="viz-btn viz-btn-primary">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
