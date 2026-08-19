import React from "react";
import { Task } from "../types";

interface RoadmapViewProps {
  tasks: Task[];
  onBack: () => void;
  onSelectTask: (task: Task) => void;
}

function topoOrder(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const result: Task[] = [];
  const visit = (t: Task) => {
    if (visited.has(t.id)) return;
    visited.add(t.id);
    t.depends_on.forEach((d) => {
      const dt = byId.get(d);
      if (dt) visit(dt);
    });
    result.push(t);
  };
  tasks.forEach(visit);
  return result;
}

const PHASE_LABELS = ["Foundation", "Core Build", "Integration", "Polish", "Launch"];

const PHASE_COLORS = [
  "var(--viz-sapphire)",
  "var(--viz-royal-purple)",
  "var(--viz-emerald)",
  "var(--viz-gold)",
  "var(--viz-ruby)"
];

export function RoadmapView({ tasks, onBack, onSelectTask }: RoadmapViewProps) {
  const ordered = React.useMemo(() => topoOrder(tasks), [tasks]);

  const { schedule, totalHours, layers, layerOf } = React.useMemo(() => {
    const depth = new Map<string, number>();
    const getDepth = (id: string): number => {
      if (depth.has(id)) return depth.get(id)!;
      const t = ordered.find((x) => x.id === id);
      const d = t && t.depends_on.length ? Math.max(...t.depends_on.map((dep) => getDepth(dep))) + 1 : 0;
      depth.set(id, d);
      return d;
    };
    ordered.forEach((t) => getDepth(t.id));

    const byLayer = new Map<number, Task[]>();
    let maxLayer = 0;
    ordered.forEach((t) => {
      const d = depth.get(t.id) ?? 0;
      maxLayer = Math.max(maxLayer, d);
      if (!byLayer.has(d)) byLayer.set(d, []);
      byLayer.get(d)!.push(t);
    });

    let cursor = 0;
    const start = new Map<string, number>();
    const dur = new Map<string, number>();
    ordered.forEach((t) => {
      const h = t.estimated_hours || Math.max(1, t.story_points);
      start.set(t.id, cursor);
      dur.set(t.id, h);
      cursor += h;
    });
    const layerOfMap = new Map<string, number>();
    depth.forEach((v, k) => layerOfMap.set(k, v));

    return {
      schedule: { start, dur },
      totalHours: cursor || 1,
      layers: Array.from(byLayer.keys()).sort((a, b) => a - b),
      layerOf: layerOfMap
    };
  }, [ordered]);

  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="viz-royal-card" style={{ margin: "16px", borderBottom: "1px solid var(--viz-border)", borderRadius: "0 0 var(--viz-radius-lg) var(--viz-radius-lg)", boxShadow: "var(--viz-shadow-card)" }}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 18V8m5 10V5m5 13v-7m5 7V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M3 21h18" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
            </svg>
            <h2 className="viz-display" style={{ fontSize: "16px", margin: 0 }}>Royal Roadmap</h2>
            <button onClick={onBack} className="viz-btn viz-btn-ghost" style={{ marginLeft: "auto", padding: "4px 12px", fontSize: "12px" }}>← Blueprint</button>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }} className="viz-spec">
            <span><strong style={{ color: "var(--viz-gold-bright)" }}>{tasks.length}</strong> tasks</span>
            <span><strong style={{ color: "var(--viz-emerald-bright)" }}>~{Math.round(totalHours)}</strong> hours</span>
            <span><strong style={{ color: "var(--viz-sapphire-bright)" }}>{layers.length}</strong> phases</span>
            <span><strong style={{ color: "var(--viz-accent-bright)" }}>{doneCount}/{tasks.length}</strong> done</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px" }}>
        {layers.map((layer, li) => {
          const color = PHASE_COLORS[li % PHASE_COLORS.length];
          const label = PHASE_LABELS[li] || `Phase ${li + 1}`;
          const layerTasks = ordered.filter((t) => (layerOf.get(t.id) ?? 0) === layer);
          return (
            <div key={layer} style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "6px 0 10px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                <span className="viz-eyebrow" style={{ opacity: 0.85 }}>{label}</span>
                <span className="viz-spec" style={{ opacity: 0.45 }}>· {layerTasks.length} tasks</span>
              </div>
              {layerTasks.map((t) => {
                const start = schedule.start.get(t.id) ?? 0;
                const dur = schedule.dur.get(t.id) ?? 1;
                const left = (start / totalHours) * 100;
                const width = Math.max(2.5, (dur / totalHours) * 100);
                const isDone = t.status === "done";
                const isActive = t.status === "in_progress";
                const barColor = isDone ? color : isActive ? "var(--viz-accent)" : "color-mix(in srgb, " + color + " 55%, transparent)";
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t.id} ${t.title}, ${dur} hours`}
                    onClick={() => onSelectTask(t)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectTask(t); } }}
                    className="viz-roadmap-row"
                    style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", cursor: "pointer" }}
                  >
                    <div style={{ width: "92px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
                      <span className="viz-spec" style={{ fontSize: "10px", opacity: 0.55 }}>[{t.id}]</span>
                      <span className="viz-display" style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                    </div>
                    <div style={{ flex: 1, position: "relative", height: "26px", backgroundColor: "var(--viz-soft)", borderRadius: "6px", overflow: "hidden" }}
                         className="viz-roadmap-track">
                      <div
                        title={`${dur}h · ${t.story_points} pts`}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 0,
                          bottom: 0,
                          backgroundColor: barColor,
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: "8px",
                          fontSize: "10px",
                          color: isDone ? "#fff" : "var(--vscode-editor-foreground)",
                          opacity: isDone || isActive ? 1 : 0.85,
                          boxShadow: isActive ? "0 0 0 1px var(--viz-accent-line)" : undefined,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          transition: "filter 0.2s"
                        }}
                        className="viz-roadmap-bar"
                      >
                        {width > 12 ? `${dur}h` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
