import React from "react";

interface DecreeTourProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    eyebrow: "Decree I",
    title: "Hail, sovereign builder",
    body: "Vizier is your royal architect. Describe an idea and it will draft a full plan — vision, architecture, data model, and a sequenced task list — worthy of your realm."
  },
  {
    eyebrow: "Decree II",
    title: "The Drafting Table",
    body: "Begin on the Drafting Table: write a sentence or two about the app you envision, then command Vizier to Plan This App."
  },
  {
    eyebrow: "Decree III",
    title: "The Questionnaire",
    body: "Vizier will ask a few regal questions to shape scope, stack, and priorities. Your selections are pre-marked with a crown — adjust them as you see fit."
  },
  {
    eyebrow: "Decree IV",
    title: "The Blueprint",
    body: "Watch the blueprint assemble live. Then explore Tasks, the Royal Roadmap, and Decisions — each a different facet of your decree."
  },
  {
    eyebrow: "Decree V",
    title: "Counsel & Command",
    body: "Tap the golden crown (bottom-left) for Vizier's Counsel, or press Cmd/Ctrl + K for the command palette to leap between chambers."
  },
  {
    eyebrow: "Decree VI",
    title: "Seal the plan",
    body: "When satisfied, Export writes a reviewable plan to /plan/ in your workspace. Review it with care — it is AI-forged and must be verified."
  }
];

export function DecreeTour({ open, onClose }: DecreeTourProps) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="viz-tour-scrim" onClick={onClose} aria-hidden="true">
      <div
        className="viz-tour-card viz-anim-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Vizier introduction tour"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="viz-tour-crown" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" />
          </svg>
        </div>
        <div className="viz-eyebrow viz-tour-step">{current.eyebrow}</div>
        <h2 className="viz-display" style={{ fontSize: "19px", margin: "4px 0 10px" }}>{current.title}</h2>
        <p style={{ fontSize: "13.5px", opacity: 0.8, lineHeight: 1.6, margin: "0 0 18px" }}>{current.body}</p>

        <div className="viz-tour-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`viz-tour-dot ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={onClose} className="viz-btn viz-btn-ghost" style={{ padding: "8px 14px", fontSize: "13px" }}>Skip</button>
          <div style={{ flex: 1 }} />
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="viz-btn viz-btn-secondary" style={{ padding: "8px 14px", fontSize: "13px" }}>Back</button>
          )}
          <button
            onClick={() => (isLast ? onClose() : setStep((s) => s + 1))}
            className="viz-btn viz-btn-primary"
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            {isLast ? "Begin" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
