import React from "react";

interface BlueprintViewProps {
  product: any;
  architecture: any;
  entities: any[];
  tasks: any[];
  apiContract: any;
  perspectives?: any;
}

export function BlueprintView({ product, architecture, entities, tasks, apiContract, perspectives }: BlueprintViewProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "architecture" | "schema" | "api" | "perspectives">("overview");

  const hasPerspectives = perspectives && Object.keys(perspectives).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--vscode-panel-border)", padding: "0 16px", flexWrap: "wrap" }}>
        {([
          "overview",
          "architecture",
          "schema",
          "api",
          ...(hasPerspectives ? (["perspectives"] as const) : [])
        ] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--vscode-focusBorder)" : "2px solid transparent",
              color: activeTab === tab ? "var(--vscode-editor-foreground)" : "var(--vscode-descriptionForeground)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: activeTab === tab ? "600" : "400",
              textTransform: "capitalize"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {activeTab === "overview" && <OverviewTab product={product} />}
        {activeTab === "architecture" && <ArchitectureTab architecture={architecture} />}
        {activeTab === "schema" && <SchemaTab entities={entities} />}
        {activeTab === "api" && <ApiTab apiContract={apiContract} />}
        {activeTab === "perspectives" && <PerspectivesTab perspectives={perspectives} />}
      </div>
    </div>
  );
}

function OverviewTab({ product }: { product: any }) {
  if (!product) return <p style={{ opacity: 0.75 }}>Loading...</p>;
  
  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>Product Vision</h2>
      <p style={{ marginBottom: "24px", lineHeight: 1.6 }}>{product.vision}</p>

      <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Target Audience</h3>
      <p style={{ marginBottom: "24px", opacity: 0.85 }}>{product.target_audience}</p>

      <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>MVP Scope</h3>
      <p style={{ marginBottom: "24px", whiteSpace: "pre-line", opacity: 0.85 }}>{product.mvp_scope}</p>

      <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Phase 2</h3>
      <p style={{ marginBottom: "24px", whiteSpace: "pre-line", opacity: 0.85 }}>{product.phase2_scope}</p>

      <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>Core Workflows</h3>
      <ul style={{ paddingLeft: "20px" }}>
        {product.core_workflows?.map((w: string, i: number) => (
          <li key={i} style={{ marginBottom: "4px", opacity: 0.85 }}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

function ArchitectureTab({ architecture }: { architecture: any }) {
  if (!architecture) return <p style={{ opacity: 0.75 }}>Loading...</p>;

  const sections = [
    { key: "frontend", label: "Frontend", data: architecture.frontend },
    { key: "backend", label: "Backend", data: architecture.backend },
    { key: "database", label: "Database", data: architecture.database },
    { key: "auth", label: "Authentication", data: architecture.auth },
    { key: "storage", label: "Storage", data: architecture.storage },
    { key: "infrastructure", label: "Infrastructure", data: architecture.infrastructure }
  ];

  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>Tech Stack</h2>
      {sections.map(({ key, label, data }) => (
        <div key={key} style={{ marginBottom: "20px", padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", textTransform: "capitalize" }}>{label}</h3>
          {data && Object.entries(data).map(([k, v]) => (
            <div key={k} style={{ marginBottom: "4px", fontSize: "13px" }}>
              <strong style={{ textTransform: "capitalize" }}>{k.replace(/_/g, " ")}:</strong>{" "}
              <span style={{ opacity: 0.85 }}>{v as string}</span>
            </div>
          ))}
          {architecture.rationale?.[key] && (
            <p style={{ marginTop: "8px", fontSize: "12px", opacity: 0.7, fontStyle: "italic" }}>
              {architecture.rationale[key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SchemaTab({ entities }: { entities: any[] }) {
  if (!entities || entities.length === 0) return <p style={{ opacity: 0.75 }}>Loading...</p>;

  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>Data Model</h2>
      {entities.map((entity: any) => (
        <div key={entity.id} style={{ marginBottom: "20px", padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
            {entity.name} <span style={{ opacity: 0.5, fontSize: "12px" }}>{entity.id}</span>
          </h3>
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--vscode-panel-border)" }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Field</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Type</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Constraints</th>
              </tr>
            </thead>
            <tbody>
              {entity.fields?.map((field: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--vscode-panel-border)" }}>
                  <td style={{ padding: "4px 8px", fontFamily: "monospace" }}>{field.name}</td>
                  <td style={{ padding: "4px 8px" }}>{field.type}</td>
                  <td style={{ padding: "4px 8px", opacity: 0.7 }}>
                    {field.required && "required "}
                    {field.unique && "unique "}
                    {field.indexed && "indexed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entity.relationships?.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px" }}>
              <strong>Relationships:</strong>
              {entity.relationships.map((rel: any, i: number) => (
                <span key={i} style={{ marginLeft: "8px", opacity: 0.8 }}>
                  {rel.type} → {rel.target_entity}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiTab({ apiContract }: { apiContract: any }) {
  if (!apiContract || !apiContract.endpoints || apiContract.endpoints.length === 0) {
    return <p style={{ opacity: 0.75 }}>No API contract defined.</p>;
  }

  const methodColors: Record<string, string> = {
    GET: "var(--vscode-charts-green)",
    POST: "var(--vscode-charts-blue)",
    PUT: "var(--vscode-charts-yellow)",
    PATCH: "var(--vscode-charts-yellow)",
    DELETE: "var(--vscode-charts-red)"
  };

  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>
        API Contract ({apiContract.endpoints.length} endpoints)
      </h2>
      {apiContract.endpoints.map((ep: any, i: number) => (
        <div key={i} style={{ marginBottom: "16px", padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "monospace", fontWeight: "bold", color: methodColors[ep.method?.toUpperCase()] || "var(--vscode-editor-foreground)" }}>
              {ep.method?.toUpperCase()}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "13px" }}>{ep.path}</span>
            {ep.auth && (
              <span style={{ fontSize: "11px", padding: "2px 6px", backgroundColor: "var(--vscode-badge-background)", color: "var(--vscode-badge-foreground)", borderRadius: "4px" }}>
                auth
              </span>
            )}
          </div>
          <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "4px" }}>{ep.summary}</p>
          {ep.description && <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "4px" }}>{ep.description}</p>}
          {ep.tags && ep.tags.length > 0 && (
            <div style={{ fontSize: "11px", opacity: 0.6 }}>
              Tags: {ep.tags.join(", ")}
            </div>
          )}
        </div>
      ))}
      {apiContract.notes && (
        <div style={{ marginTop: "8px", fontSize: "12px", opacity: 0.7, fontStyle: "italic" }}>
          {apiContract.notes}
        </div>
      )}
    </div>
  );
}

function PerspectivesTab({ perspectives }: { perspectives: any }) {
  if (!perspectives || Object.keys(perspectives).length === 0) {
    return <p style={{ opacity: 0.75, padding: "16px" }}>No expert perspectives were selected for this plan.</p>;
  }

  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "16px" }}>Expert Perspectives</h2>
      {Object.keys(perspectives).map((id) => {
        const p = perspectives[id];
        return (
          <div key={id} style={{ marginBottom: "24px", padding: "12px", backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)", borderRadius: "6px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
              {p.label} <span style={{ opacity: 0.5, fontSize: "12px" }}>{p.roleId}</span>
            </h3>
            <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "8px", whiteSpace: "pre-line" }}>{p.summary}</p>

            {p.recommendations?.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ fontSize: "12px" }}>Recommendations</strong>
                <ul style={{ paddingLeft: "18px", marginTop: "4px" }}>
                  {p.recommendations.map((r: any, i: number) => (
                    <li key={i} style={{ fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "600" }}>{r.priority ? `[${r.priority}] ` : ""}{r.title}</span>
                      {r.detail ? <span style={{ opacity: 0.8 }}> — {r.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.risks?.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ fontSize: "12px" }}>Risks</strong>
                <ul style={{ paddingLeft: "18px", marginTop: "4px" }}>
                  {p.risks.map((risk: string, i: number) => (
                    <li key={i} style={{ fontSize: "12px", opacity: 0.85 }}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {p.open_questions?.length > 0 && (
              <div>
                <strong style={{ fontSize: "12px" }}>Open Questions</strong>
                <ul style={{ paddingLeft: "18px", marginTop: "4px" }}>
                  {p.open_questions.map((q: string, i: number) => (
                    <li key={i} style={{ fontSize: "12px", opacity: 0.85 }}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
