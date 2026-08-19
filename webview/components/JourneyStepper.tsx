import React from "react";

const PHASES = [
  { key: "idea_input", label: "Idea" },
  { key: "questionnaire", label: "Questions" },
  { key: "blueprint", label: "Blueprint" },
  { key: "tasks", label: "Tasks" },
  { key: "export", label: "Export" }
] as const;

interface JourneyStepperProps {
  currentView: string;
}

export function JourneyStepper({ currentView }: JourneyStepperProps) {
  // Map secondary views onto the primary phase they belong to
  const resolved =
    currentView === "decisions" || currentView === "roadmap" ? "tasks" :
    currentView === "complete" ? "export" :
    currentView;

  const currentIndex = PHASES.findIndex((p) => p.key === resolved);
  if (currentIndex === -1) return null;

  return (
    <nav className="viz-stepper" aria-label="Planning journey progress">
      {PHASES.map((phase, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <React.Fragment key={phase.key}>
            <div className={`viz-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}>
              <span
                className={`viz-step-dot ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                aria-hidden="true"
              />
              <span className="viz-step-label">{phase.label}</span>
            </div>
            {i < PHASES.length - 1 && (
              <span className={`viz-step-connector ${isDone ? "is-done" : ""}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
