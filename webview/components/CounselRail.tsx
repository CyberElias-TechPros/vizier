import React from "react";
import { Task } from "../types";

interface CounselRailProps {
  open: boolean;
  onClose: () => void;
  blueprint: any;
  view: string;
  tasksDone: number;
  tasksTotal: number;
}

type CounselKind = "insight" | "warn" | "tip";

interface Counsel {
  kind: CounselKind;
  title: string;
  body: string;
}

const ICONS: Record<CounselKind, JSX.Element> = {
  insight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3a6 6 0 00-3 11v2h6v-2a6 6 0 00-3-11z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 20h6M10 22h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 4l8 14H4L12 4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  tip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 15l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
};

function buildCounsel(props: CounselRailProps): Counsel[] {
  const { blueprint, view, tasksDone, tasksTotal } = props;
  const items: Counsel[] = [];

  if (view === "blueprint" || view === "tasks" || view === "roadmap" || view === "decisions") {
    if (!blueprint) return items;
    const tasks: Task[] = blueprint.tasks || [];
    const high = tasks.filter((t) => (t.story_points || 0) >= 8);
    const decisions = blueprint.decisions || [];
    const perspectives = blueprint.perspectives || [];
    const tokenUsage = blueprint.meta?.tokenUsage;

    items.push({
      kind: "insight",
      title: "Plan at a glance",
      body: `${tasks.length} tasks across ${perspectives.length} perspectives. Estimated ~${tasks.reduce((s: number, t: Task) => s + (t.estimated_hours || 0), 0)} build hours.`
    });

    if (high.length > 0) {
      items.push({
        kind: "warn",
        title: `${high.length} high-complexity task${high.length > 1 ? "s" : ""}`,
        body: `Consider splitting ${high.map((t) => t.id).join(", ")} into smaller increments to reduce risk.`
      });
    }

    if (decisions.length > 0) {
      items.push({
        kind: "tip",
        title: "Confirm your decrees",
        body: `${decisions.length} key decision${decisions.length > 1 ? "s" : ""} were made. Review the Decisions panel to align your team.`
      });
    }

    if (tokenUsage) {
      const total = (tokenUsage.input || 0) + (tokenUsage.output || 0);
      items.push({
        kind: "insight",
        title: "Tokens invested",
        body: `~${total.toLocaleString()} tokens shaped this blueprint. Refine your idea to tune the scope.`
      });
    }

    const done = tasks.filter((t) => t.status === "done").length;
    if (done > 0) {
      items.push({
        kind: "tip",
        title: "Momentum",
        body: `You've completed ${done} task${done > 1 ? "s" : ""}. Keep the chain moving — dependents are waiting.`
      });
    }
  }

  if (view === "tasks" && tasksTotal > 0) {
    const pct = Math.round((tasksDone / tasksTotal) * 100);
    if (pct < 100) {
      items.push({
        kind: "insight",
        title: "Roadmap ahead",
        body: `Open the Royal Roadmap to see how these tasks sequence by dependency and effort.`
      });
    }
  }

  items.push({
    kind: "tip",
    title: "Vizier's etiquette",
    body: "Refine the original idea and re-draft to explore alternate architectures before committing."
  });

  return items;
}

export function CounselRail({ open, onClose, ...rest }: CounselRailProps) {
  const counsel = React.useMemo(() => buildCounsel({ open, onClose, ...rest }), [open, onClose, rest.blueprint, rest.view, rest.tasksDone, rest.tasksTotal]);

  return (
    <>
      {open && <div className="viz-counsel-scrim" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`viz-counsel-rail ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-label="Vizier's Counsel"
      >
        <div className="viz-counsel-head">
          <span className="viz-crown" style={{ width: 16, height: 16, color: "var(--viz-gold-bright)" }} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" />
            </svg>
          </span>
          <h3 className="viz-display" style={{ fontSize: "15px", margin: 0 }}>Vizier's Counsel</h3>
          <button onClick={onClose} aria-label="Close counsel" className="viz-btn viz-btn-ghost" style={{ marginLeft: "auto", padding: "2px 8px", fontSize: "12px" }}>✕</button>
        </div>
        <div className="viz-counsel-body">
          {counsel.map((c, i) => (
            <div key={i} className={`viz-counsel-item viz-counsel-${c.kind}`}>
              <span className="viz-counsel-icon" aria-hidden="true">{ICONS[c.kind]}</span>
              <div>
                <div className="viz-counsel-title">{c.title}</div>
                <div className="viz-counsel-text">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
