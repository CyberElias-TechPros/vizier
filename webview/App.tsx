import React from "react";
import { useBridge } from "./hooks/useBridge";
import { QuestionPanel } from "./components/QuestionPanel";
import { BlueprintView } from "./components/BlueprintView";
import { TaskDagView } from "./components/TaskDagView";
import { DecisionLog } from "./components/DecisionLog";
import { ExportPanel } from "./components/ExportPanel";
import { Header } from "./components/Header";
import { ErrorMessage } from "./components/ErrorMessage";

type View = "idea_input" | "questionnaire" | "blueprint" | "tasks" | "decisions" | "export" | "complete";

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

  React.useEffect(() => {
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
        setGenerating(true);
        sendMessage({ type: "GENERATE_BLUEPRINT" });
        break;
      case "BLUEPRINT_READY":
        setBlueprint(lastMessage.payload);
        setProjectName(lastMessage.payload?.name || "Your App");
        setTokenUsage(lastMessage.payload?.meta?.tokenUsage || null);
        setGenerating(false);
        setView("blueprint");
        break;
      case "EXPORT_COMPLETE":
        setExportFiles(lastMessage.payload?.files || []);
        setExporting(false);
        setExported(true);
        setView("complete");
        break;
      case "ERROR":
        setError(lastMessage.payload.message);
        setGenerating(false);
        setExporting(false);
        break;
    }
  }, [lastMessage]);

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

  if (error && view !== "idea_input") {
    return (
      <div style={{ padding: "16px" }}>
        <ErrorMessage
          message={error}
          onRetry={() => { setError(null); }}
          onDismiss={() => { setError(null); setView("idea_input"); }}
        />
      </div>
    );
  }

  if (view === "idea_input") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px" }}>
          <p style={{ marginBottom: "16px", opacity: 0.75, fontSize: "13px" }}>
            Describe your app idea and I will create a structured build plan for you.
          </p>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g., A habit tracking app for mobile with streaks and reminders, social features, and progress charts"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              border: "1px solid var(--vscode-input-border)",
              borderRadius: "6px",
              resize: "none",
              fontFamily: "inherit",
              fontSize: "14px",
              marginBottom: "12px"
            }}
          />
          <button
            onClick={handleSubmitIdea}
            disabled={idea.trim().length < 10}
            style={{
              padding: "10px 20px",
              backgroundColor: idea.trim().length < 10 ? "var(--vscode-button-secondaryBackground)" : "var(--vscode-button-background)",
              color: "var(--vscode-button-foreground)",
              border: "none",
              borderRadius: "6px",
              cursor: idea.trim().length < 10 ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Plan This App
          </button>
        </div>
      </div>
    );
  }

  if (view === "questionnaire" && question) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={category} currentStep={getStepLabel()} />
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
    );
  }

  if (view === "blueprint" && generating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", border: "3px solid var(--vscode-panel-border)", borderTopColor: "var(--vscode-focusBorder)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
        <p style={{ opacity: 0.75 }}>Generating your blueprint...</p>
        <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "8px" }}>This takes about 15-30 seconds</p>
      </div>
    );
  }

  if (view === "blueprint" && blueprint) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} />
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--vscode-panel-border)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={handleViewTasks} style={{ padding: "6px 12px", backgroundColor: "var(--vscode-button-background)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>View Tasks</button>
          <button onClick={handleViewDecisions} style={{ padding: "6px 12px", backgroundColor: "var(--vscode-button-secondaryBackground)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Decisions</button>
          <button onClick={handleViewExport} style={{ padding: "6px 12px", backgroundColor: "var(--vscode-button-background)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Export →</button>
          {tokenUsage && (
            <span style={{ fontSize: "11px", opacity: 0.6, marginLeft: "auto" }}>
              ~{tokenUsage.input + tokenUsage.output} tokens used
            </span>
          )}
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <BlueprintView product={blueprint.product} architecture={blueprint.architecture} entities={blueprint.entities} tasks={blueprint.tasks} apiContract={blueprint.api_contract} />
        </div>
      </div>
    );
  }

  if (view === "tasks" && blueprint) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} />
        <TaskDagView tasks={blueprint.tasks} onTaskClick={() => {}} onMarkDone={handleMarkTaskDone} />
      </div>
    );
  }

  if (view === "decisions" && blueprint) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <DecisionLog decisions={blueprint.decisions} />
        </div>
      </div>
    );
  }

  if (view === "export") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <ExportPanel files={exportFiles} onExport={handleExport} exporting={exporting} exported={false} error={error} />
        </div>
      </div>
    );
  }

  if (view === "complete") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Header projectName={projectName} currentStep={getStepLabel()} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <ExportPanel files={exportFiles} onExport={handleExport} exporting={exporting} exported={true} error={null} />
        </div>
        <div style={{ padding: "16px", borderTop: "1px solid var(--vscode-panel-border)" }}>
          <button onClick={handleReset} style={{ width: "100%", padding: "10px", backgroundColor: "var(--vscode-button-secondaryBackground)", color: "var(--vscode-button-foreground)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
            Plan Another App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <p>Unknown view: {view}</p>
    </div>
  );
}
