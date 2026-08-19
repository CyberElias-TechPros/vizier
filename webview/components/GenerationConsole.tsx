import React from "react";

export interface ConsoleStage {
  label: string;
  status: "pending" | "active" | "done";
}

interface GenerationConsoleProps {
  stages: ConsoleStage[];
  percent: number;
  elapsedSeconds: number;
}

export function GenerationConsole({ stages, percent, elapsedSeconds }: GenerationConsoleProps) {
  const doneCount = stages.filter((s) => s.status === "done").length;
  const activeStage = stages.find((s) => s.status === "active");
  const total = stages.length > 0 ? stages.length : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="viz-mesh-bg viz-blueprint-grid" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 16px", backgroundSize: "22px 22px", overflowY: "auto" }}>
      {/* Hero / current phase */}
      <div style={{ textAlign: "center", marginBottom: "18px" }}>
        <div className="viz-eyebrow" style={{ marginBottom: "8px" }}>
          Drafting in progress
        </div>
        <h2 className="viz-display" style={{ fontSize: "18px", margin: "0 0 6px" }}>
          Building your blueprint
        </h2>
        {activeStage ? (
          <p className="viz-display" style={{ fontSize: "14px", margin: 0, color: "var(--viz-accent-bright)", lineHeight: 1.4 }}>
            {activeStage.label}
          </p>
        ) : (
          <p className="viz-spec" style={{ opacity: 0.55, margin: 0 }}>
            Warming up&hellip;
          </p>
        )}
      </div>

      {/* Overall progress rail + metrics */}
      <div className="viz-card viz-console viz-crop" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span className="viz-spec" style={{ opacity: 0.7 }}>
            {total > 0 ? `Stage ${Math.min(doneCount + (activeStage ? 1 : 0), total)} of ${total}` : "Preparing"}
          </span>
          <span className="viz-spec" style={{ color: "var(--viz-accent-bright)" }}>
            {percent}% &middot; {formatTime(elapsedSeconds)}
          </span>
        </div>
        <div style={{ width: "100%", height: "6px", backgroundColor: "var(--viz-soft-strong)", borderRadius: "3px", overflow: "hidden" }}>
          <div
            className="viz-shimmer"
            style={{ width: `${percent}%`, height: "100%", borderRadius: "3px", transition: "width 0.5s var(--viz-ease-out)" }}
          />
        </div>
      </div>

      {/* Staged checklist — the real feedback loop */}
      <div className="viz-card viz-console viz-crop" style={{ marginBottom: "16px" }}>
        {stages.length > 0 ? (
          stages.map((stage, i) => (
            <div
              key={`${stage.label}-${i}`}
              className={`viz-console-row is-${stage.status} viz-stagger-item`}
              style={{ ["--viz-delay" as any]: `${i * 60}ms` }}
            >
              <span className={`viz-console-icon is-${stage.status}`} aria-hidden="true">
                {stage.status === "done" && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path className="viz-check-path" d="M2 6.5L4.5 9L10 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {stage.status === "active" && <span className="viz-console-dot" />}
              </span>
              <span className="viz-console-label">{stage.label}</span>
              {stage.status === "active" && (
                <span className="viz-spec" style={{ marginLeft: "auto", opacity: 0.5 }}>working&hellip;</span>
              )}
              {stage.status === "done" && (
                <span className="viz-spec" style={{ marginLeft: "auto", opacity: 0.4 }}>done</span>
              )}
            </div>
          ))
        ) : (
          <div className="viz-console-row is-active">
            <span className="viz-console-icon is-active" aria-hidden="true"><span className="viz-console-dot" /></span>
            <span className="viz-console-label">Warming up&hellip;</span>
          </div>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: "11px", opacity: 0.45, lineHeight: 1.5, margin: "0 0 16px" }}>
        Vizier is reasoning through your product, architecture, data model, and task sequence.
        This usually takes 15&ndash;30 seconds. You can watch each stage complete above.
      </p>

      {/* Faint skeleton preview of the sections being drafted */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", opacity: 0.55 }}>
        {[
          { title: "Product vision", lines: [90, 70, 80] },
          { title: "Architecture", lines: [80, 90, 60] },
          { title: "Data model", lines: [70, 80, 75] },
          { title: "Task sequence", lines: [90, 60, 85] }
        ].map((card, ci) => (
          <div key={ci} className="viz-card viz-crop" style={{ padding: "12px 12px 14px" }}>
            <div className="viz-skeleton" style={{ height: "10px", width: "55%", marginBottom: "10px" }} />
            {card.lines.map((w, li) => (
              <div
                key={li}
                className="viz-skeleton"
                style={{ height: "8px", width: `${w}%`, marginBottom: "7px", animationDelay: `${(ci * 3 + li) * 120}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
