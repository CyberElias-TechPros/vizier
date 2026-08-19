import React from "react";

interface StatusReportProps {
  report: any;
  onBack: () => void;
  onCheckAgain: () => void;
}

export function StatusReport({ report, onBack, onCheckAgain }: StatusReportProps) {
  if (!report) return null;

  const total = report.total || 0;
  const progress = report.progressPercent || 0;
  const byStatus = report.byStatus || {};

  return (
    <div role="region" aria-label="Plan progress report" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="viz-royal-card" style={{ margin: "16px", borderBottom: "1px solid var(--viz-border)", borderRadius: "0 0 var(--viz-radius-lg) var(--viz-radius-lg)" }}>
        <div className="viz-royal-card--body" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
              <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <h1 className="viz-display" style={{ fontSize: "16px", margin: 0 }}>Plan Progress</h1>
            <span
              className="viz-badge viz-badge--sapphire"
              style={{ marginLeft: "auto", fontSize: "11px", padding: "2px 8px" }}
            >
              {progress}%
            </span>
          </div>
          <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>{report.planName || "Vizier plan"}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Plan progress"
            className="viz-track"
            style={{ flex: 1, height: "8px" }}
          >
            <div className="viz-shimmer" style={{ height: "100%", width: `${progress}%`, borderRadius: "4px", transition: "width 0.6s var(--viz-ease)" }} />
          </div>
          <span style={{ fontSize: "11px", opacity: 0.6 }}>
            {report.trend === 0 ? "no change" : report.trend > 0 ? `▲ ${report.trend}%` : `▼ ${report.trend}%`}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {(["done", "in_progress", "not_started", "blocked"] as const).map((s) => (
            <div
              key={s}
              className={`viz-badge ${s === "done" ? "viz-badge--emerald" : s === "in_progress" ? "viz-badge--sapphire" : s === "blocked" ? "viz-badge--ruby" : "viz-badge--gold"}`}
              style={{ fontSize: "11px", padding: "4px 10px", opacity: 0.9, display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <span className={`viz-status-dot ${s.replace("_", "-").replace("not-", "not")}`} style={{ width: 7, height: 7 }} />
              {s === "in_progress" ? "in progress" : s === "not_started" ? "not started" : s.replace("_", " ")}: <b>{byStatus[s] || 0}</b>
            </div>
          ))}
          <div className="viz-badge viz-badge--purple" style={{ fontSize: "11px", padding: "4px 10px", opacity: 0.9, display: "inline-flex", alignItems: "center", gap: "5px" }}>
            ✓ verified: <b>{report.verifiedCount || 0}</b>
          </div>
          {report.coverage && (
            <div className="viz-badge viz-badge--gold" style={{ fontSize: "11px", padding: "4px 10px", opacity: 0.9, display: "inline-flex", alignItems: "center", gap: "5px" }}>
              ☂ coverage: <b>{report.coverage.lines ?? report.coverage.statements}%</b>
            </div>
          )}
          {report.testReport && (
            <div className="viz-badge" style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--viz-emerald-bright)", background: "var(--viz-emerald-soft)", borderColor: "var(--viz-emerald-soft)" }}>
              ✔ tests: <b>{`${report.testReport.passed}/${report.testReport.tests}`}</b>
              {report.testReport.failed > 0 ? (
                <span style={{ color: "var(--viz-ruby-bright)" }}> ({report.testReport.failed} failed)</span>
              ) : null}
            </div>
          )}
        </div>

        {report.blocked && report.blocked.length > 0 && (
          <div className="viz-q-summary" style={{ marginBottom: "16px", background: "color-mix(in srgb, var(--viz-ruby) 10%, transparent)" }}>
            <span className="viz-spec" style={{ color: "var(--viz-ruby-bright)" }}>⚠ Blocked tasks:</span> {report.blocked.join(", ")}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5v8h-2V9a3 3 0 00-6 0v4H5V5h10z" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
          </svg>
          <span className="viz-eyebrow" style={{ opacity: 0.7, fontSize: "10px" }}>Tasks</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {(report.tasks || []).map((t: any) => (
            <div key={t.id} className="viz-royal-card" style={{ padding: "8px 10px", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={`viz-status-dot ${t.status === "done" ? "done" : t.status === "in_progress" ? "in-progress" : t.status === "blocked" ? "blocked" : "not-started"}`} />
                <span style={{ fontFamily: "var(--viz-font-mono)", opacity: 0.7, color: "var(--viz-sapphire-bright)" }}>{t.id}</span>
                <span style={{ flex: 1 }}>{t.title}</span>
                {t.verified && <span className="viz-tag viz-tag--emerald" title="Verified by git commits or test file">✓</span>}
                <span className="viz-badge" style={{ fontSize: "10px", padding: "1px 6px", color: "var(--viz-accent-bright)" }}>{t.status.replace("_", " ")}</span>
              </div>
            </div>
          ))}
          {total === 0 && (
            <div className="viz-q-summary" style={{ fontSize: "12px" }}>
              No plan found. Generate and export a plan first, then check progress.
            </div>
          )}
        </div>

        <p style={{ fontSize: "11px", opacity: 0.45, marginTop: "16px", lineHeight: 1.5 }}>
          Local-only, privacy-preserving check: it inspects file existence and task references in your workspace.
          No source code is sent to any LLM. Progress is heuristic — acceptance criteria and tests are not auto-verified.
          AI-generated plans may be inaccurate; verify before use.
        </p>
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--viz-border)", display: "flex", gap: "8px" }}>
        <button onClick={onCheckAgain} className="viz-btn viz-btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }}>
          Check Again
        </button>
        <button onClick={onBack} className="viz-btn viz-btn-ghost" style={{ padding: "6px 14px", fontSize: "12px" }}>
          Back
        </button>
      </div>
    </div>
  );
}
