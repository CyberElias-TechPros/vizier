import React from "react";
import { Task } from "../types";

interface TaskDagViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMarkDone: (taskId: string) => void;
}

export function TaskDagView({ tasks, onTaskClick, onMarkDone }: TaskDagViewProps) {
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "graph" | "heatmap" | "detail">("list");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setViewMode("detail");
    onTaskClick(task);
  };

  const doneCount = tasks.filter(t => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="viz-royal-card" style={{ margin: "16px", borderBottom: "1px solid var(--viz-border)", borderRadius: "0 0 var(--viz-radius-lg) var(--viz-radius-lg)", boxShadow: "var(--viz-shadow-card)" }}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
              <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <h2 className="viz-display" style={{ fontSize: "16px", margin: 0 }}>Build Tasks</h2>
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px", background: "var(--viz-soft)", borderRadius: "8px", padding: "3px" }}>
              {(["list", "graph", "heatmap"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`viz-btn ${viewMode === mode ? "viz-btn-secondary" : "viz-btn-ghost"}`}
                  style={{ padding: "4px 12px", fontSize: "12px", textTransform: "capitalize" }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tasks completed: ${doneCount} of ${tasks.length}`}
              className="viz-track"
              style={{ flex: 1, height: "7px", overflow: "hidden" }}
            >
              <div className="viz-shimmer" style={{ width: `${progress}%`, height: "100%", borderRadius: "4px", transition: "width 0.6s var(--viz-ease)" }} />
            </div>
            <span className="viz-spec" style={{ opacity: 0.7 }} aria-live="polite">{doneCount}/{tasks.length}</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {viewMode === "graph" ? (
          <TaskGraph tasks={tasks} onSelect={handleTaskClick} onMarkDone={onMarkDone} />
        ) : viewMode === "heatmap" ? (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <EffortHeatmap tasks={tasks} onSelect={handleTaskClick} />
          </div>
        ) : viewMode === "list" ? (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <TaskList tasks={tasks} onTaskClick={handleTaskClick} onMarkDone={onMarkDone} />
          </div>
        ) : (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <TaskDetail task={selectedTask} onBack={() => setViewMode("list")} onMarkDone={onMarkDone} />
          </div>
        )}
      </div>
    </div>
  );
}

function TaskList({ tasks, onTaskClick, onMarkDone }: { tasks: Task[]; onTaskClick: (task: Task) => void; onMarkDone: (taskId: string) => void }) {
  return (
    <div style={{ padding: "8px" }} role="list">
      {tasks.map((task) => {
        const priority = task.story_points >= 8 ? "high" : task.story_points >= 5 ? "medium" : "low";
        const statusClass =
          task.status === "done" ? "done" :
          task.status === "in_progress" ? "in-progress" : "not-started";
        return (
          <div
            key={task.id}
            role="listitem"
            onClick={() => onTaskClick(task)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTaskClick(task);
              }
            }}
            tabIndex={0}
            className="viz-royal-card viz-lift"
            style={{ marginBottom: "10px", margin: "0 8px 10px", cursor: "pointer" }}
          >
            <div className="viz-royal-card--body" style={{ display: "flex", alignItems: "center", padding: "12px" }}>
              <span className={`viz-status-dot ${statusClass}`} style={{ marginRight: "10px", flexShrink: 0 }} />
              {task.task_type && task.task_type !== "feature" && (
                <span className={`viz-priority ${priority}`} style={{ marginRight: "8px" }}>{task.task_type}</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onMarkDone(task.id); }}
                aria-label={task.status === "done" ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
                aria-pressed={task.status === "done"}
                className="viz-q-checkbox"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "5px",
                  border: task.status === "done" ? "none" : "2px solid var(--viz-border)",
                  backgroundColor: task.status === "done" ? "var(--viz-accent)" : "transparent",
                  cursor: "pointer",
                  marginRight: "12px",
                  flexShrink: 0,
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: task.status === "done" ? "0 0 0 3px var(--viz-accent-line)" : undefined
                }}
              >
                {task.status === "done" && <span style={{ display: "inline-block", width: 12, height: 6, border: "2px solid #fff", borderTop: "none", borderRight: "none", transform: "rotate(-45deg) translate(1px, 0)" }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "7px", marginBottom: "4px" }}>
                  <span className="viz-spec">[{task.id}]</span>
                  <span className="viz-display" style={{ fontSize: "14px" }}>{task.title}</span>
                </div>
                <div style={{ fontSize: "12px", opacity: 0.7, display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <span className="viz-tag viz-tag--sapphire">{task.estimated_effort}</span>
                  {task.estimated_hours ? <span className="viz-tag">~{task.estimated_hours}h</span> : ""}
                  {task.story_points ? <span className="viz-tag">★ {task.story_points} pts</span> : ""}
                  {task.depends_on.length > 0 && <span className="viz-tag">depends on: {task.depends_on.join(", ")}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskDetail({ task, onBack, onMarkDone }: { task: Task | null; onBack: () => void; onMarkDone: (taskId: string) => void }) {
  if (!task) return <div style={{ padding: "16px" }}>No task selected</div>;

  return (
    <div style={{ padding: "16px" }}>
      <button
        onClick={onBack}
        className="viz-btn viz-btn-ghost"
        style={{ padding: "4px 10px", fontSize: "12px", marginBottom: "16px" }}
      >
        ← Back to list
      </button>
      <div className="viz-royal-card" style={{ marginBottom: "16px" }}>
        <div className="viz-royal-card--header viz-cat-sapphire">
          <span className="viz-spec">[{task.id}]</span>
          <h3 className="viz-display" style={{ fontSize: "16px", margin: "0 0 0 6px", flex: 1 }}>{task.title}</h3>
          {task.task_type && (
            <span className={`viz-priority ${task.story_points >= 8 ? "high" : task.story_points >= 5 ? "medium" : "low"}`}>{task.task_type}</span>
          )}
        </div>
        <div className="viz-royal-card--body">
          <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "16px", lineHeight: 1.6 }}>{task.description}</p>
          <div style={{ marginBottom: "16px" }}>
            <span className="viz-eyebrow" style={{ marginBottom: "6px", opacity: 0.7 }}>Acceptance Criteria</span>
            <ul style={{ listStyle: "none", margin: 0, paddingLeft: 0, fontSize: "13px" }}>
              {task.acceptance_criteria.map((ac, i) => (
                <li key={i} style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", opacity: 0.85 }}>
                  <span className="viz-status-dot done" style={{ width: 6, height: 6 }} />
                  {ac}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <span className="viz-eyebrow" style={{ marginBottom: "6px", opacity: 0.7 }}>Expected Files</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {task.files_expected.map((file, i) => (
                <code key={i} style={{ padding: "3px 8px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace", color: "var(--viz-sapphire-bright)", border: "1px solid var(--viz-border)" }}>{file}</code>
              ))}
            </div>
          </div>
          <div className="viz-q-summary" style={{ fontSize: "12px", opacity: 0.8 }}>
            <span className="viz-eyebrow" style={{ opacity: 0.6 }}>Estimate</span>
            <span style={{ marginLeft: "8px" }}>{task.estimated_effort}</span>
            {task.estimated_hours && <span className="viz-tag" style={{ marginLeft: "8px" }}>~{task.estimated_hours}h</span>}
            {task.story_points && <span className="viz-tag viz-tag--gold" style={{ marginLeft: "8px" }}>★ {task.story_points} pts</span>}
          </div>
        </div>
      </div>
      {task.status !== "done" && (
        <button
          onClick={() => onMarkDone(task.id)}
          className="viz-btn viz-btn-primary"
          style={{ width: "100%", padding: "10px", fontSize: "14px" }}
        >
          Mark as Done
        </button>
      )}
    </div>
  );
}

const NODE_W = 168;
const NODE_H = 46;
const COL_GAP = 60;
const ROW_GAP = 16;
const PAD = 24;

function statusClass(status: Task["status"]) {
  return status === "done" ? "done" : status === "in_progress" ? "in-progress" : "not-started";
}

function TaskGraph({ tasks, onSelect, onMarkDone }: { tasks: Task[]; onSelect: (t: Task) => void; onMarkDone: (id: string) => void }) {
  const byId = React.useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const { positions, width, height, layers } = React.useMemo(() => {
    const depth = new Map<string, number>();
    const getDepth = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      const t = byId.get(id);
      const d = t && t.depends_on.length ? Math.max(...t.depends_on.map((dep) => getDepth(dep))) + 1 : 0;
      depth.set(id, d);
      return d;
    };
    tasks.forEach((t) => getDepth(t.id));

    const byLayer = new Map<number, Task[]>();
    let maxLayer = 0;
    tasks.forEach((t) => {
      const d = depth.get(t.id) ?? 0;
      maxLayer = Math.max(maxLayer, d);
      if (!byLayer.has(d)) byLayer.set(d, []);
      byLayer.get(d)!.push(t);
    });

    const pos = new Map<string, { x: number; y: number }>();
    byLayer.forEach((layerTasks, layer) => {
      layerTasks.forEach((t, row) => {
        pos.set(t.id, {
          x: PAD + layer * (NODE_W + COL_GAP),
          y: PAD + row * (NODE_H + ROW_GAP)
        });
      });
    });

    const w = PAD * 2 + (maxLayer + 1) * NODE_W + maxLayer * COL_GAP;
    const h = PAD * 2 + Math.max(...Array.from(byLayer.values()).map((l) => l.length)) * (NODE_H + ROW_GAP);
    const layers = Array.from(byLayer.keys()).sort((a, b) => a - b);
    return { positions: pos, width: w, height: h, layers };
  }, [tasks, byId]);

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "4px" }}>
      <div style={{ position: "relative", width, height, minWidth: "100%" }}>
        <svg
          width={width}
          height={height}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          aria-hidden="true"
        >
          <defs>
            <marker id="viz-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L6 3 L0 6 Z" fill="var(--viz-border)" />
            </marker>
            <marker id="viz-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L6 3 L0 6 Z" fill="var(--viz-accent-bright)" />
            </marker>
          </defs>
          {tasks.flatMap((t) =>
            t.depends_on
              .map((dep) => ({ dep, t }))
              .filter(({ dep }) => positions.has(dep) && positions.has(t.id))
              .map(({ dep }) => {
                const a = positions.get(dep)!;
                const b = positions.get(t.id)!;
                const x1 = a.x + NODE_W;
                const y1 = a.y + NODE_H / 2;
                const x2 = b.x;
                const y2 = b.y + NODE_H / 2;
                const dx = Math.max(20, (x2 - x1) / 2);
                const active = hovered === dep || hovered === t.id;
                return (
                  <path
                    key={`${dep}->${t.id}`}
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={active ? "var(--viz-accent-bright)" : "var(--viz-border)"}
                    strokeWidth={active ? 2.2 : 1.2}
                    markerEnd={active ? "url(#viz-arrow-active)" : "url(#viz-arrow)"}
                    style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                  />
                );
              })
          )}
        </svg>

        {tasks.map((t) => {
          const p = positions.get(t.id)!;
          const isHover = hovered === t.id;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              aria-label={`Task ${t.id}: ${t.title}`}
              onClick={() => onSelect(t)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(t);
                }
              }}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              className="viz-royal-card viz-lift"
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: NODE_W,
                height: NODE_H,
                margin: 0,
                cursor: "pointer",
                boxShadow: isHover ? "0 0 0 2px var(--viz-accent-bright), var(--viz-shadow-card)" : undefined,
                transition: "box-shadow 0.2s"
              }}
            >
              <div className="viz-royal-card--body" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", height: "100%" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkDone(t.id); }}
                  aria-label={t.status === "done" ? `Mark ${t.title} as incomplete` : `Mark ${t.title} as complete`}
                  aria-pressed={t.status === "done"}
                  className="viz-q-checkbox"
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "5px",
                    border: t.status === "done" ? "none" : "2px solid var(--viz-border)",
                    backgroundColor: t.status === "done" ? "var(--viz-accent)" : "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "bold",
                    boxShadow: t.status === "done" ? "0 0 0 3px var(--viz-accent-line)" : undefined
                  }}
                >
                  {t.status === "done" && <span style={{ display: "inline-block", width: 11, height: 6, border: "2px solid #fff", borderTop: "none", borderRight: "none", transform: "rotate(-45deg) translate(1px, 0)" }} />}
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="viz-spec" style={{ fontSize: "10px", opacity: 0.6 }}>[{t.id}]</div>
                  <div className="viz-display" style={{ fontSize: "12px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                </div>
                <span className={`viz-status-dot ${statusClass(t.status)}`} style={{ flexShrink: 0 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function heatColor(intensity: number): string {
  // 0 (calm) -> sapphire, 0.5 -> royal purple, 1 (intense) -> ruby/gold
  if (intensity < 0.5) {
    const t = intensity / 0.5;
    return `color-mix(in srgb, var(--viz-sapphire-bright) ${40 + t * 40}%, var(--viz-royal-purple))`;
  }
  const t = (intensity - 0.5) / 0.5;
  return `color-mix(in srgb, var(--viz-royal-purple) ${(1 - t) * 80 + 20}%, var(--viz-ruby-bright))`;
}

function EffortHeatmap({ tasks, onSelect }: { tasks: Task[]; onSelect: (t: Task) => void }) {
  const maxEffort = Math.max(1, ...tasks.map((t) => t.story_points || t.estimated_hours || 1));
  const totalEffort = tasks.reduce((s, t) => s + (t.story_points || t.estimated_hours || 1), 0);
  const highCount = tasks.filter((t) => (t.story_points || 0) >= 8).length;

  return (
    <div style={{ padding: "16px" }}>
      <div className="viz-royal-card" style={{ marginBottom: "16px" }}>
        <div className="viz-royal-card--header viz-cat-ruby">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
          </svg>
          <h3 className="viz-display" style={{ fontSize: "15px", margin: 0 }}>Effort Heatmap</h3>
        </div>
        <div className="viz-royal-card--body">
          <p style={{ fontSize: "12.5px", opacity: 0.72, margin: "0 0 12px", lineHeight: 1.55 }}>
            Each tile is a task; deeper colour means greater complexity. Brighter stones demand more care.
          </p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }} className="viz-spec">
            <span>Total effort <strong style={{ color: "var(--viz-gold-bright)" }}>{totalEffort} pts</strong></span>
            <span>High-complexity <strong style={{ color: "var(--viz-ruby-bright)" }}>{highCount}</strong></span>
            <span>Average <strong style={{ color: "var(--viz-sapphire-bright)" }}>{Math.round((totalEffort / tasks.length) * 10) / 10} pts</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px" }}>
            <span className="viz-spec" style={{ opacity: 0.5 }}>Low</span>
            <div style={{ flex: 1, height: "10px", borderRadius: "5px", background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.5)}, ${heatColor(1)})` }} />
            <span className="viz-spec" style={{ opacity: 0.5 }}>High</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))",
          gap: "8px"
        }}
      >
        {[...tasks]
          .sort((a, b) => (b.story_points || 0) - (a.story_points || 0))
          .map((t) => {
            const effort = t.story_points || t.estimated_hours || 1;
            const intensity = effort / maxEffort;
            const isDone = t.status === "done";
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                aria-label={`${t.id} ${t.title}, effort ${effort}`}
                className="viz-heat-cell"
                style={{
                  backgroundColor: heatColor(intensity),
                  opacity: isDone ? 0.5 : 1,
                  borderColor: "color-mix(in srgb, #ffffff 12%, transparent)"
                }}
              >
                <span className="viz-spec" style={{ fontSize: "10px", opacity: 0.7 }}>[{t.id}]</span>
                <span className="viz-display" style={{ fontSize: "12px", lineHeight: 1.2, display: "block", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <span className="viz-spec" style={{ fontSize: "10px", marginTop: "6px", display: "inline-block" }}>{effort} pts</span>
                {isDone && <span className="viz-spec" style={{ fontSize: "10px", marginLeft: "6px", color: "#fff" }}>✓</span>}
              </button>
            );
          })}
      </div>
    </div>
  );
}
