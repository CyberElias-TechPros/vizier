import React from "react";
import { Task } from "../types";

interface TaskDagViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMarkDone: (taskId: string) => void;
}

export function TaskDagView({ tasks, onTaskClick, onMarkDone }: TaskDagViewProps) {
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "detail">("list");

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setViewMode("detail");
    onTaskClick(task);
  };

  const doneCount = tasks.filter(t => t.status === "done").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--vscode-panel-border)" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>Build Tasks</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1, height: "6px", backgroundColor: "var(--vscode-panel-border)", borderRadius: "3px" }}>
            <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "var(--vscode-focusBorder)", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontSize: "12px", opacity: 0.75 }}>{doneCount}/{tasks.length}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {viewMode === "list" ? (
          <TaskList tasks={tasks} onTaskClick={handleTaskClick} onMarkDone={onMarkDone} />
        ) : (
          <TaskDetail task={selectedTask} onBack={() => setViewMode("list")} onMarkDone={onMarkDone} />
        )}
      </div>
    </div>
  );
}

function TaskList({ tasks, onTaskClick, onMarkDone }: { tasks: Task[]; onTaskClick: (task: Task) => void; onMarkDone: (taskId: string) => void }) {
  return (
    <div style={{ padding: "8px" }}>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onTaskClick(task)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "12px",
            marginBottom: "8px",
            backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
            borderRadius: "6px",
            cursor: "pointer",
            border: "1px solid transparent"
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onMarkDone(task.id); }}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: task.status === "done" ? "none" : "2px solid var(--vscode-panel-border)",
              backgroundColor: task.status === "done" ? "var(--vscode-testing-iconPassed)" : "transparent",
              cursor: "pointer",
              marginRight: "12px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--vscode-editor-background)",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            {task.status === "done" && "✓"}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              {task.id}: {task.title}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.75 }}>
              {task.estimated_effort}
              {task.estimated_hours ? ` • ~${task.estimated_hours}h` : ""}
              {task.story_points ? ` • ${task.story_points} pts` : ""}
              {task.task_type && task.task_type !== "feature" ? ` • ${task.task_type}` : ""}
              {task.depends_on.length > 0 && ` • Depends on: ${task.depends_on.join(", ")}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskDetail({ task, onBack, onMarkDone }: { task: Task | null; onBack: () => void; onMarkDone: (taskId: string) => void }) {
  if (!task) return <div style={{ padding: "16px" }}>No task selected</div>;

  return (
    <div style={{ padding: "16px" }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "var(--vscode-textLink-foreground)", cursor: "pointer", marginBottom: "16px", fontSize: "13px" }}
      >
        ← Back to list
      </button>
      <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>{task.title}</h3>
      <p style={{ fontSize: "13px", opacity: 0.75, marginBottom: "16px" }}>{task.description}</p>
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Acceptance Criteria</h4>
        <ul style={{ paddingLeft: "20px", fontSize: "13px" }}>
          {task.acceptance_criteria.map((ac, i) => (
            <li key={i} style={{ marginBottom: "4px", opacity: 0.85 }}>{ac}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Expected Files</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {task.files_expected.map((file, i) => (
            <span key={i} style={{ padding: "4px 8px", backgroundColor: "var(--vscode-textCodeBlock-background)", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>
              {file}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "16px", fontSize: "13px", opacity: 0.8 }}>
        <strong>Estimate:</strong> {task.estimated_effort}
        {task.estimated_hours ? ` · ~${task.estimated_hours}h` : ""}
        {task.story_points ? ` · ${task.story_points} pts` : ""}
        {task.task_type && task.task_type !== "feature" ? ` · ${task.task_type}` : ""}
      </div>
      {task.status !== "done" && (
        <button
          onClick={() => onMarkDone(task.id)}
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            marginTop: "16px"
          }}
        >
          Mark as Done
        </button>
      )}
    </div>
  );
}
