import React from "react";
import { PlanPreview } from "./PlanPreview";

interface ExportPanelProps {
  files: string[];
  onExport: () => void;
  exporting: boolean;
  exported: boolean;
  error: string | null;
  reviewed?: boolean;
  onReviewChange?: (v: boolean) => void;
  /** When false (vizier.requireReviewBeforeExport=false), skip the review gate. Default true. */
  requireReview?: boolean;
  blueprint?: any;
  projectName?: string;
}

export function ExportPanel({ files, onExport, exporting, exported, error, reviewed, onReviewChange, requireReview = true, blueprint, projectName }: ExportPanelProps) {
  const [showFiles, setShowFiles] = React.useState(false);
  const [tab, setTab] = React.useState<"export" | "preview">("export");
  const canExport = requireReview ? !!reviewed : true;

  if (exported) {
    return (
      <div role="region" aria-label="Export result" className="viz-anim-scale-in" style={{ padding: "28px 20px", textAlign: "center" }}>
        <div
          className="viz-crop"
          style={{
            position: "relative",
            width: "56px",
            height: "56px",
            margin: "0 auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div className="viz-burst" style={{ position: "absolute", inset: "-4px" }} aria-hidden="true">
            <span className="viz-burst-ring" />
            <span className="viz-burst-ring" />
            <span className="viz-burst-ring" />
          </div>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, var(--viz-accent-bright), var(--viz-accent))",
              boxShadow: "0 6px 20px color-mix(in srgb, var(--viz-accent) 35%, transparent)"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5L10 17.5L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="viz-eyebrow" style={{ marginBottom: "6px" }}>Plan exported</div>
        <h2 className="viz-display" style={{ fontSize: "17px", margin: "0 0 8px" }}>Ready to build</h2>
        <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "18px", lineHeight: 1.5 }}>
          Written to <code style={{ fontFamily: "var(--viz-font-mono)" }}>/plan/</code> in your workspace.
        </p>
        <button
          onClick={() => setShowFiles(!showFiles)}
          aria-expanded={showFiles}
          aria-controls="vizier-exported-files"
          className="viz-spec"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--viz-accent-bright)", opacity: 1 }}
        >
          {showFiles ? "hide" : "show"} files [{files.length}]
        </button>
        {showFiles && (
          <div id="vizier-exported-files" className="viz-card viz-anim-fade-up" style={{ marginTop: "14px", textAlign: "left", padding: "12px" }}>
            {files.map((file, i) => (
              <div key={i} style={{ fontSize: "12px", fontFamily: "var(--viz-font-mono)", padding: "3px 0", opacity: 0.85 }}>
                {file}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div role="region" aria-label="Export plan" style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "4px", background: "var(--viz-soft)", borderRadius: "8px", padding: "3px" }}>
          {(["export", "preview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              aria-pressed={tab === m}
              className={`viz-btn ${tab === m ? "viz-btn-secondary" : "viz-btn-ghost"}`}
              style={{ padding: "4px 12px", fontSize: "12px", textTransform: "capitalize" }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {tab === "preview" ? (
        <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto", paddingRight: 4 }}>
          <PlanPreview blueprint={blueprint} projectName={projectName || ""} />
        </div>
      ) : (
        <>
          <div className="viz-eyebrow" style={{ marginBottom: "6px" }}>Final step</div>
          <h2 className="viz-display" style={{ fontSize: "17px", margin: "0 0 8px" }}>Export plan</h2>
          <p style={{ fontSize: "13px", opacity: 0.68, marginBottom: "16px", lineHeight: 1.5 }}>
            Writes your plan to <code style={{ fontFamily: "var(--viz-font-mono)" }}>/plan/</code> in your workspace as reviewable files.
          </p>

      {error && (
        <div style={{ padding: "12px", backgroundColor: "var(--vscode-inputValidation-errorBackground)", borderRadius: "var(--viz-radius-md)", marginBottom: "16px", fontSize: "13px", color: "var(--vscode-errorForeground)" }}>
          {error}
        </div>
      )}

      <div className="viz-card viz-anim-scale-in" style={{ padding: "12px", marginBottom: "16px" }}>
        <div className="viz-spec" style={{ fontWeight: 600, marginBottom: "8px", opacity: 0.75 }}>Files to be created</div>
        <div style={{ fontSize: "12px", fontFamily: "var(--viz-font-mono)", opacity: 0.85, lineHeight: 1.9 }}>
          <div>plan/</div>
          <div style={{ paddingLeft: "16px" }}>overview.md</div>
          <div style={{ paddingLeft: "16px" }}>architecture.md</div>
          <div style={{ paddingLeft: "16px" }}>schema.md</div>
          <div style={{ paddingLeft: "16px" }}>tasks.md</div>
          <div style={{ paddingLeft: "16px" }}>decisions.md</div>
          <div style={{ paddingLeft: "16px" }}>context/ <span style={{ fontFamily: "inherit", opacity: 0.55 }}>&mdash; per-task context packs</span></div>
        </div>
      </div>

      {requireReview && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: "9px", fontSize: "12px", opacity: 0.85, marginBottom: "16px", lineHeight: 1.5, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!reviewed}
            onChange={(e) => onReviewChange?.(e.target.checked)}
            aria-label="I have reviewed this plan and understand it is AI-generated"
            style={{ marginTop: "2px", accentColor: "var(--viz-accent)" }}
          />
          I have reviewed this plan and understand it is AI-generated and must be verified before use.
        </label>
      )}

      <button
        onClick={onExport}
        disabled={exporting || !canExport}
        aria-label={exporting ? "Exporting plan to files" : "Export plan to workspace files"}
        aria-busy={exporting}
        className={`viz-btn ${exporting || !canExport ? "viz-btn-secondary" : "viz-btn-primary"}`}
        style={{ width: "100%", padding: "12px 20px", fontSize: "14px" }}
      >
        {exporting ? "Exporting…" : "Export to Files"}
      </button>
        </>
      )}
    </div>
  );
}
