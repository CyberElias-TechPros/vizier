import React from "react";
import { useBridge } from "./hooks/useBridge";
import { QuestionPanel } from "./components/QuestionPanel";
import { BlueprintView } from "./components/BlueprintView";
import { TaskDagView } from "./components/TaskDagView";
import { RoadmapView } from "./components/RoadmapView";
import { CounselRail } from "./components/CounselRail";
import { CommandPalette, Command } from "./components/CommandPalette";
import { DecreeTour } from "./components/DecreeTour";
import { DecisionLog } from "./components/DecisionLog";
import { ExportPanel } from "./components/ExportPanel";
import { Header } from "./components/Header";
import { ErrorMessage } from "./components/ErrorMessage";
import { SettingsPanel } from "./components/SettingsPanel";
import { JourneyStepper } from "./components/JourneyStepper";
import { GenerationConsole, ConsoleStage } from "./components/GenerationConsole";
import { ToastStack, useToasts } from "./components/ToastStack";
import { vizierSettingDefinitions } from "../src/settings";

type View = "idea_input" | "questionnaire" | "blueprint" | "tasks" | "decisions" | "roadmap" | "export" | "complete";

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

interface QuestionData {
  questionId: string;
  text: string;
  type: string;
  options: QuestionOption[];
  default: string;
  tooltip: string;
  progress: { answered: number; total: number; percentage: number };
}

export function App() {
  const { sendMessage, lastMessage } = useBridge();
  const [view, setView] = React.useState<View>("idea_input");
  const [idea, setIdea] = React.useState("");
  const [question, setQuestion] = React.useState<QuestionData | null>(null);
  const [category, setCategory] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [blueprint, setBlueprint] = React.useState<any>(null);
  const [generating, setGenerating] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [exported, setExported] = React.useState(false);
  const [exportFiles, setExportFiles] = React.useState<string[]>([]);
  const [projectName, setProjectName] = React.useState<string>("");
  const [tokenUsage, setTokenUsage] = React.useState<{ input: number; output: number } | null>(null);
  const [settings, setSettings] = React.useState<Record<string, any>>({});
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [counselOpen, setCounselOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [tourOpen, setTourOpen] = React.useState(false);
  const prevBlueprintRef = React.useRef<any>(null);
  const [lastDiff, setLastDiff] = React.useState<{ added: number; removed: number; changed: boolean; summary: string } | null>(null);
  const [consoleStages, setConsoleStages] = React.useState<ConsoleStage[]>([]);
  const [consolePercent, setConsolePercent] = React.useState(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();
  let content: JSX.Element | undefined;

  React.useEffect(() => {
    // WEBVIEW_READY handshake: signal readiness to extension first
    // Use sendMessage (bridge) to post readiness signal to extension
    try {
      sendMessage({ type: "WEBVIEW_READY" });
    } catch (e) {}

  if (!lastMessage) return;

  switch (lastMessage.type) {
      case "CLASSIFICATION_RESULT":
        setCategory(lastMessage.payload.category);
        setView("questionnaire");
        break;
      case "QUESTION":
        setQuestion(lastMessage.payload);
        break;
      case "QUESTIONNAIRE_COMPLETE":
        setView("blueprint");
        setGenerating(true);
        setConsoleStages([]);
        setConsolePercent(0);
        setElapsedSeconds(0);
        sendMessage({ type: "GENERATE_BLUEPRINT" });
        break;
      case "PROGRESS": {
        const { stage, total, label } = lastMessage.payload || {};
        setConsolePercent(total ? Math.round((stage / total) * 100) : 0);
        setConsoleStages((prev) => {
          const withoutActive = prev.map((s) => (s.status === "active" ? { ...s, status: "done" as const } : s));
          if (withoutActive.some((s) => s.label === label)) {
            return withoutActive.map((s) => (s.label === label ? { ...s, status: "active" as const } : s));
          }
          return [...withoutActive, { label, status: "active" as const }];
        });
        break;
      }
      case "BLUEPRINT_READY": {
        const incoming = lastMessage.payload;
        if (blueprint) {
          const oldTasks = new Map((blueprint.tasks || []).map((t: any) => [t.id, t]));
          const newTasks = incoming?.tasks || [];
          const added = newTasks.filter((t: any) => !oldTasks.has(t.id)).length;
          const removed = (blueprint.tasks || []).filter((t: any) => !newTasks.find((n: any) => n.id === t.id)).length;
          const decisionsChanged = (blueprint.decisions?.length || 0) !== (incoming?.decisions?.length || 0);
          const entitiesChanged = (blueprint.entities?.length || 0) !== (incoming?.entities?.length || 0);
          const changed = added > 0 || removed > 0 || decisionsChanged || entitiesChanged;
          const summary = changed
            ? `Tasks ${added > 0 ? `+${added}` : ""}${removed > 0 ? ` −${removed}` : ""} · ${incoming?.tasks?.length || 0} total`
            : "Refined without structural changes";
          setLastDiff({ added, removed, changed, summary });
          if (changed) pushToast("info", "Blueprint revised", summary);
        }
        prevBlueprintRef.current = blueprint;
        setBlueprint(incoming);
        setProjectName(incoming?.name || "Your App");
        setTokenUsage(incoming?.meta?.tokenUsage || null);
        setGenerating(false);
        setConsoleStages((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
        setConsolePercent(100);
        setView("blueprint");
        if (!prevBlueprintRef.current) pushToast("success", "Blueprint drafted", "Your plan is ready to review.");
        break;
      }
      case "EXPORT_COMPLETE":
        setExportFiles(lastMessage.payload?.files || []);
        setExporting(false);
        setExported(true);
        setView("complete");
        pushToast("success", "Plan exported", `${lastMessage.payload?.files?.length || 0} files written to /plan/.`);
        break;
      case "SETTINGS_STATE":
        setSettings(lastMessage.payload?.settings || {});
        setSettingsOpen(true);
        break;
      case "ERROR":
        setError(lastMessage.payload.message);
        setGenerating(false);
        setExporting(false);
        break;
    }
  }, [lastMessage]);

  React.useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [generating]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    try {
      if (!localStorage.getItem("vizier_tour_seen")) setTourOpen(true);
    } catch {
      setTourOpen(true);
    }
  }, []);

  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem("vizier_tour_seen", "1"); } catch { /* ignore */ }
  };

  const commands: Command[] = React.useMemo(() => {
    const icon = (path: JSX.Element) => path;
    return [
      { id: "new", label: "Draft a new plan", hint: "reset", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>), run: () => handleReset() },
      { id: "settings", label: "Open settings", hint: "configure", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2l.4 2.5h4l.4-2.5a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /></svg>), run: () => setSettingsOpen(true) },
      { id: "counsel", label: "Open Vizier's Counsel", hint: "advice", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" /></svg>), run: () => setCounselOpen(true) },
      { id: "blueprint", label: "Go to Blueprint", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" /></svg>), run: () => blueprint && setView("blueprint") },
      { id: "tasks", label: "Go to Tasks", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>), run: () => blueprint && setView("tasks") },
      { id: "roadmap", label: "Go to Roadmap", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 18V8m5 10V5m5 13v-7m5 7V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>), run: () => blueprint && setView("roadmap") },
      { id: "decisions", label: "Go to Decisions", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" /></svg>), run: () => blueprint && setView("decisions") },
      { id: "export", label: "Go to Export", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>), run: () => blueprint && setView("export") },
      { id: "export-files", label: "Export plan to files", hint: "write", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h10l4 4v12H4z" stroke="currentColor" strokeWidth="1.4" /></svg>), run: () => { if (blueprint) { setView("export"); handleExport(); } } },
      { id: "tour", label: "Take the guided tour", hint: "intro", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" /></svg>), run: () => setTourOpen(true) },
      { id: "revise", label: "Revise this plan", hint: "regenerate", icon: icon(<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M18 3v4h-4M6 21v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>), run: () => { if (blueprint) setView("idea_input"); } }
    ];
  }, [blueprint]);

  const handleSubmitIdea = () => {
    if (idea.trim().length < 10) {
      setError("Please describe your idea in at least 10 characters");
      return;
    }
    setError(null);
    sendMessage({ type: "START_PLANNING", payload: { idea } });
  };

  const handleAnswer = (questionId: string, value: string) => {
    sendMessage({ type: "ANSWER_QUESTION", payload: { questionId, value } });
  };

  const handleSkip = (questionId: string) => {
    sendMessage({ type: "SKIP_QUESTION", payload: { questionId } });
  };

  const handleBack = () => {
    sendMessage({ type: "GO_BACK" });
  };

  const handleMarkTaskDone = (taskId: string) => {
    if (blueprint) {
      const updatedTasks = blueprint.tasks.map((t: any) =>
        t.id === taskId ? { ...t, status: "done" } : t
      );
      setBlueprint({ ...blueprint, tasks: updatedTasks });
    }
  };

  const handleViewTasks = () => setView("tasks");
  const handleViewDecisions = () => setView("decisions");
  const handleViewRoadmap = () => setView("roadmap");
  const handleViewExport = () => setView("export");

  const handleExport = () => {
    setExporting(true);
    setError(null);
    sendMessage({ type: "EXPORT_PLAN" });
  };

  const handleReset = () => {
    setView("idea_input");
    setIdea("");
    setCategory("");
    setError(null);
    setBlueprint(null);
    setExported(false);
    setExportFiles([]);
    setProjectName("");
    setTokenUsage(null);
  };

  const handleOpenSettings = () => {
    sendMessage({ type: "GET_SETTINGS" });
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    sendMessage({ type: "UPDATE_SETTING", payload: { key, value } });
  };

  const getStepLabel = () => {
    switch (view) {
      case "idea_input": return "Getting Started";
      case "questionnaire": return "Questionnaire";
      case "blueprint": return "Blueprint";
      case "tasks": return "Tasks";
      case "decisions": return "Decisions";
      case "export": return "Export";
      case "complete": return "Complete!";
      default: return "";
    }
  };

  if (settingsOpen) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header onOpenSettings={handleOpenSettings} />
        <SettingsPanel
          settings={settings}
          definitions={vizierSettingDefinitions}
          onClose={() => setSettingsOpen(false)}
          onChange={handleSettingChange}
        />
      </div>
    );
  }

  if (error && view !== "idea_input") {
    content = (
      <div style={{ padding: "16px" }} role="region" aria-live="assertive" aria-label="Error message">
        <ErrorMessage
          message={error}
          onRetry={() => { setError(null); }}
          onDismiss={() => { setError(null); setView("idea_input"); }}
        />
      </div>
    );
  }

  if (view === "idea_input") {
    const charCount = idea.trim().length;
    const ready = charCount >= 10;
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 16px", minHeight: 0 }}>
          <div className="viz-eyebrow" style={{ marginBottom: "6px" }}>New plan &middot; [P-000]</div>
          <h2 className="viz-display" style={{ fontSize: "19px", margin: "0 0 8px", lineHeight: 1.25 }}>
            What are you building?
          </h2>
          <p id="idea-hint" style={{ margin: "0 0 16px", opacity: 0.68, fontSize: "13px", lineHeight: 1.55 }}>
            Describe your app idea in a few sentences. Vizier drafts the product vision,
            architecture, data model, and a sequenced task list from it.
          </p>

          <div
            className="viz-crop viz-blueprint-grid"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: "160px",
              borderRadius: "var(--viz-radius-lg)",
              border: "1px solid var(--viz-border)",
              backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
              backgroundSize: "16px 16px",
              padding: "3px",
              marginBottom: "14px"
            }}
          >
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              aria-label="Describe your app idea"
              aria-describedby="idea-hint"
              placeholder="e.g., A habit tracking app for mobile with streaks and reminders, social features, and progress charts"
              className="viz-textarea"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                boxShadow: "none",
                fontSize: "14px",
                padding: "13px"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span className="viz-spec" style={{ opacity: 0.55 }}>
              {charCount}/500 &middot; min 10
            </span>
            {ready && (
              <span className="viz-spec" style={{ color: "var(--viz-accent-bright)" }}>
                ready to draft ?
              </span>
            )}
          </div>

          <button
            onClick={handleSubmitIdea}
            disabled={!ready}
            className={`viz-btn ${ready ? "viz-btn-primary" : "viz-btn-secondary"}`}
            style={{ width: "100%", fontSize: "14px", padding: "12px 20px" }}
          >
            Plan This App
          </button>
        </div>
      </div>
    );
  }

  if (view === "questionnaire" && question) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={category} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, minHeight: 0, display: "flex" }} key={question.questionId}>
          <QuestionPanel
            questionId={question.questionId}
            text={question.text}
            type={question.type}
            options={question.options}
            default_value={question.default}
            tooltip={question.tooltip}
            progress={question.progress}
            onAnswer={handleAnswer}
            onSkip={handleSkip}
            onBack={handleBack}
            canGoBack={question.progress.answered > 0}
          />
        </div>
      </div>
    );
  }

  if (view === "blueprint" && generating) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header currentStep={getStepLabel()} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <GenerationConsole stages={consoleStages} percent={consolePercent} elapsedSeconds={elapsedSeconds} />
        </div>
      </div>
    );
  }

  if (view === "blueprint" && blueprint) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--viz-border)", display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
          {tokenUsage && (
            <span className="viz-spec" style={{ marginRight: "auto", opacity: 0.5 }}>
              ~{tokenUsage.input + tokenUsage.output} tok
            </span>
          )}
          <button onClick={() => setView("idea_input")} className="viz-btn viz-btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }}>Revise</button>
          <button onClick={handleViewTasks} className="viz-btn viz-btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>Tasks</button>
          <button onClick={handleViewRoadmap} className="viz-btn viz-btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>Roadmap</button>
          <button onClick={handleViewDecisions} className="viz-btn viz-btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>Decisions</button>
          <button onClick={handleViewExport} className="viz-btn viz-btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }}>Export →</button>
        </div>
        {lastDiff?.changed && (
          <div className="viz-diff-banner" role="status">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: "var(--viz-accent-bright)" }}>
              <path d="M4 7h11M4 12h16M4 17h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M15 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="viz-spec">Revised draft · <strong>{lastDiff.summary}</strong></span>
            <button onClick={() => setLastDiff(null)} aria-label="Dismiss revision notice" style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "12px", opacity: 0.6 }}>✕</button>
          </div>
        )}
        <div className="viz-page" style={{ flex: 1, overflow: "hidden" }}>
          <BlueprintView product={blueprint.product} architecture={blueprint.architecture} entities={blueprint.entities} tasks={blueprint.tasks} apiContract={blueprint.api_contract} perspectives={blueprint.perspectives} />
        </div>
      </div>
    );
  }

  if (view === "tasks" && blueprint) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <TaskDagView tasks={blueprint.tasks} onTaskClick={() => {}} onMarkDone={handleMarkTaskDone} />
        </div>
      </div>
    );
  }

  if (view === "roadmap" && blueprint) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <RoadmapView tasks={blueprint.tasks} onBack={handleViewTasks} onSelectTask={() => handleViewTasks()} />
        </div>
      </div>
    );
  }

  if (view === "decisions" && blueprint) {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, overflowY: "auto" }}>
          <DecisionLog decisions={blueprint.decisions} />
        </div>
      </div>
    );
  }

  if (view === "export") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, overflowY: "auto" }}>
          <ExportPanel files={exportFiles} blueprint={blueprint} projectName={projectName} onExport={handleExport} exporting={exporting} exported={false} error={error} />
        </div>
      </div>
    );
  }

  if (view === "complete") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} onOpenSettings={handleOpenSettings} />
        <JourneyStepper currentView={view} />
        <div className="viz-page" style={{ flex: 1, overflowY: "auto" }}>
          <ExportPanel files={exportFiles} onExport={handleExport} exporting={exporting} exported={true} error={null} />
        </div>
        <div style={{ padding: "16px", borderTop: "1px solid var(--viz-border)" }}>
          <button onClick={handleReset} className="viz-btn viz-btn-secondary" style={{ width: "100%", padding: "10px", fontSize: "14px" }}>
            Plan Another App
          </button>
        </div>
      </div>
    );
  }

  if (!content) {
    content = (
      <div style={{ padding: "16px" }}>
        <p>Unknown view: {view}</p>
      </div>
    );
  }

  const tasksDone = blueprint?.tasks ? blueprint.tasks.filter((t: any) => t.status === "done").length : 0;
  const tasksTotal = blueprint?.tasks?.length || 0;
  const showCounselButton = view !== "idea_input" && view !== "questionnaire" && !settingsOpen;

  return (
    <>
      {content}
      {showCounselButton && (
        <button
          onClick={() => setCounselOpen((o) => !o)}
          aria-label={counselOpen ? "Close Vizier's Counsel" : "Open Vizier's Counsel"}
          aria-expanded={counselOpen}
          className={`viz-counsel-fab ${counselOpen ? "is-active" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" />
          </svg>
        </button>
      )}
      <CounselRail
        open={counselOpen}
        onClose={() => setCounselOpen(false)}
        blueprint={blueprint}
        view={view}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <DecreeTour open={tourOpen} onClose={closeTour} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
