import React from "react";
import { Decision } from "../types";

interface DecisionLogProps {
  decisions: Decision[];
}

export function DecisionLog({ decisions }: DecisionLogProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7.91 15.14 4 9.27z" stroke="var(--viz-gold)" strokeWidth="1.5" />
        </svg>
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>Decision Register</h2>
      </div>
      <p style={{ fontSize: "13px", opacity: 0.6, marginBottom: "16px" }}>
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
      className="viz-royal-card viz-royal-card--gold"
      style={{ overflow: "hidden" }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        aria-controls={`decision-${decision.id}-content`}
        className="viz-royal-card--header"
        style={{ cursor: "pointer", padding: "10px 14px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="viz-spec">[{decision.id}]</span>
          <h3 className="viz-display" style={{ fontSize: "14px", margin: 0 }}>{decision.topic}</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="viz-spec" style={{ color: "var(--viz-gold-bright)", opacity: 1, display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7.91 15.14 4 9.27z" /></svg>
            chosen: {decision.chosen}
          </span>
          <span style={{ fontSize: "12px", opacity: 0.55, transition: "transform 200ms var(--viz-ease)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      
      {expanded && (
        <div id={`decision-${decision.id}-content`} role="region" aria-label={`Details for decision: ${decision.topic}`} className="viz-royal-card--body">
          <p style={{ fontSize: "13px", marginBottom: "12px", lineHeight: 1.6, opacity: 0.85 }}>{decision.rationale}</p>
          {decision.options.length > 0 && (
            <div style={{ marginTop: "10px", marginBottom: "8px" }}>
              <span className="viz-eyebrow" style={{ opacity: 0.7, fontSize: "10px" }}>Alternatives considered</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {decision.options.map((opt, i) => (
                  <span
                    key={i}
                    className={`viz-badge ${opt.name === decision.chosen ? "viz-badge--gold" : "viz-badge--sapphire"}`}
                    style={{ fontSize: "11px", padding: "3px 9px" }}
                  >
                    {opt.name}{opt.name === decision.chosen && "  ✓"}
                  </span>
                ))}
              </div>
            </div>
          )}
          {decision.impacts.length > 0 && (
            <div style={{ marginTop: "10px", fontSize: "12px", opacity: 0.75, lineHeight: 1.6 }}>
              <strong>Impacts:</strong> {decision.impacts.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
