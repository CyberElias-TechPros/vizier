import React from "react";

interface BlueprintViewProps {
  product: any;
  architecture: any;
  entities: any[];
  tasks: any[];
  apiContract: any;
  perspectives?: any;
}

const sectionIcons: Record<string, JSX.Element> = {
  overview: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  architecture: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6a2 2 0 012-2h2.5a1 1 0 01.8.4l1.2 1.6a1 1 0 00.8.4H18a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 12a2 2 0 012-2h2.5a1 1 0 01.8.4l1.2 1.6a1 1 0 00.8.4H18a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  schema: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10h18M9 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  api: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  perspectives: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7.91 15.14 4 9.27z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
};

const archIcons: Record<string, JSX.Element> = {
  frontend: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12l9-9 9 9M5 10v10h6v-6h4v6h6V10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  backend: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 10h18M7 14h10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  database: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="8" rx="7" ry="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M19 8v6c0 1.65-3.58 3-8 3s-8-1.35-8-3V8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 14c0 1.65 3.58 3 8 3s8-1.35 8-3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  auth: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 17V7M12 7v0M9 12h6M9 12l3-3M15 12l-3 3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  storage: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 11h16" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 15h6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  infrastructure: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="9" r="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="9" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9h6M6 12l6 6 6-6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
};

export function BlueprintView({ product, architecture, entities, tasks, apiContract, perspectives }: BlueprintViewProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "architecture" | "schema" | "api" | "perspectives">("overview");

  const hasPerspectives = perspectives && Object.keys(perspectives).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tab bar */}
      <div role="tablist" aria-label="Blueprint sections" style={{ display: "flex", borderBottom: "1px solid var(--viz-border)", padding: "0 16px", flexWrap: "wrap" }}>
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
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                const tabs = ["overview", "architecture", "schema", "api", ...(hasPerspectives ? ["perspectives"] : [])];
                const currentIndex = tabs.indexOf(activeTab);
                const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                setActiveTab(prevTab as any);
              } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                const tabs = ["overview", "architecture", "schema", "api", ...(hasPerspectives ? ["perspectives"] : [])];
                const currentIndex = tabs.indexOf(activeTab);
                const nextTab = tabs[(currentIndex + 1) % tabs.length];
                setActiveTab(nextTab as any);
              }
            }}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tab-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            className="viz-press"
            style={{
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--viz-accent)" : "2px solid transparent",
              color: activeTab === tab ? "var(--vscode-editor-foreground)" : "var(--vscode-descriptionForeground)",
              cursor: "pointer",
              fontFamily: activeTab === tab ? "var(--viz-font-mono)" : "inherit",
              fontSize: "12px",
              fontWeight: activeTab === tab ? "600" : "400",
              letterSpacing: activeTab === tab ? "0.03em" : "normal",
              textTransform: "uppercase",
              transition: "color var(--viz-duration-base) var(--viz-ease), border-color var(--viz-duration-base) var(--viz-ease)",
              outline: activeTab === tab ? "2px solid var(--viz-accent)" : "none",
              outlineOffset: "-2px"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div key={activeTab} id={`tab-${activeTab}`} role="tabpanel" className="viz-anim-fade-up" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {sectionIcons.overview}
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>Product Vision</h2>
      </div>
      <p style={{ marginBottom: "24px", lineHeight: 1.6 }}>{product.vision}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div className="viz-royal-card">
          <div className="viz-royal-card--header viz-cat-frontend">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>{archIcons.frontend}Target Audience</span>
          </div>
          <div className="viz-royal-card--body viz-cat-frontend">
            <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{product.target_audience}</p>
          </div>
        </div>
        <div className="viz-royal-card">
          <div className="viz-royal-card--header viz-cat-storage">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>{archIcons.storage}MVP Scope</span>
          </div>
          <div className="viz-royal-card--body viz-cat-storage">
            <p style={{ margin: 0, whiteSpace: "pre-line", opacity: 0.85, lineHeight: 1.5 }}>{product.mvp_scope}</p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div className="viz-royal-card">
          <div className="viz-royal-card--header viz-cat-backend">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>{archIcons.backend}Phase 2</span>
          </div>
          <div className="viz-royal-card--body viz-cat-backend">
            <p style={{ margin: 0, whiteSpace: "pre-line", opacity: 0.85, lineHeight: 1.5 }}>{product.phase2_scope}</p>
          </div>
        </div>
        <div className="viz-royal-card">
          <div className="viz-royal-card--header viz-cat-emerald">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>{archIcons.database}Core Workflows</span>
          </div>
          <div className="viz-royal-card--body viz-cat-emerald">
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {product.core_workflows?.map((w: string, i: number) => (
                <li key={i} style={{ marginBottom: "4px", opacity: 0.8, lineHeight: 1.5 }}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureTab({ architecture }: { architecture: any }) {
  if (!architecture) return <p style={{ opacity: 0.75 }}>Loading...</p>;

  const sections = [
    { key: "frontend", label: "Frontend", icon: archIcons.frontend },
    { key: "backend", label: "Backend", icon: archIcons.backend },
    { key: "database", label: "Database", icon: archIcons.database },
    { key: "auth", label: "Authentication", icon: archIcons.auth },
    { key: "storage", label: "Storage", icon: archIcons.storage },
    { key: "infrastructure", label: "Infrastructure", icon: archIcons.infrastructure }
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {sectionIcons.architecture}
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>Tech Stack</h2>
      </div>
      {sections.map(({ key, label, icon }) => (
        <div key={key} className="viz-royal-card" style={{ marginBottom: "16px" }}>
          <div className={`viz-royal-card--header viz-cat-${key}`}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {icon}
              {label}
            </span>
          </div>
          <div className={`viz-royal-card--body viz-cat-${key}`}>
            {architecture[key] && Object.entries(architecture[key]).map(([k, v]) => (
              <div key={k} style={{ marginBottom: "6px", display: "flex", fontSize: "13px" }}>
                <strong style={{ textTransform: "capitalize", minWidth: "110px", opacity: 0.7 }}>{k.replace(/_/g, " ")}:</strong>
                <span style={{ opacity: 0.85, marginLeft: "8px" }}>{v as string}</span>
              </div>
            ))}
            {architecture.rationale?.[key] && (
              <p style={{ marginTop: "8px", fontSize: "12px", opacity: 0.65, fontStyle: "italic", lineHeight: 1.5 }}>
                ։ {architecture.rationale[key]}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SchemaTab({ entities }: { entities: any[] }) {
  if (!entities || entities.length === 0) return <p style={{ opacity: 0.75 }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {sectionIcons.schema}
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>Data Model</h2>
      </div>
      {entities.map((entity: any) => (
        <div key={entity.id} className="viz-royal-card viz-cat-database" style={{ marginBottom: "20px" }}>
          <div className="viz-royal-card--header viz-cat-database">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {archIcons.database}
              {entity.name}
            </span>
            <span className="viz-spec" style={{ opacity: 0.6, fontWeight: 400, marginLeft: "auto" }}>{entity.id}</span>
          </div>
          <div className="viz-royal-card--body">
            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--viz-border)" }}>
                  <th style={{ textAlign: "left", padding: "5px 8px", color: "var(--viz-accent-bright)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em" }}>Field</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", color: "var(--viz-accent-bright)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "5px 8px", color: "var(--viz-accent-bright)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.04em" }}>Constraints</th>
                </tr>
              </thead>
              <tbody>
                {entity.fields?.map((field: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--viz-border)" }}>
                    <td style={{ padding: "5px 8px", fontFamily: "var(--viz-font-mono)", color: "var(--viz-sapphire-bright)" }}>{field.name}</td>
                    <td style={{ padding: "5px 8px", opacity: 0.8 }}>{field.type}</td>
                    <td style={{ padding: "5px 8px", opacity: 0.65 }}>
                      {field.required && <span className="viz-badge viz-badge--ruby" style={{ marginRight: "4px" }}>req</span>}
                      {field.unique && <span className="viz-badge viz-badge--sapphire" style={{ marginRight: "4px" }}>uniq</span>}
                      {field.indexed && <span className="viz-badge viz-badge--gold" style={{ marginRight: "4px" }}>idx</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entity.relationships?.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "12px" }}>
                <span style={{ fontWeight: 600, opacity: 0.75 }}>Relationships:</span>
                {entity.relationships.map((rel: any, i: number) => (
                  <span key={i} style={{ marginLeft: "8px", opacity: 0.8, fontFamily: "var(--viz-font-mono)" }}>
                    {rel.type} → {rel.target_entity}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApiTab({ apiContract }: { apiContract: any }) {
  if (!apiContract || !apiContract.endpoints || apiContract.endpoints.length === 0) {
    return <p style={{ opacity: 0.75 }}>No API contract defined.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {sectionIcons.api}
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>
          API Contract <span style={{ opacity: 0.5, fontSize: "13px", fontWeight: 400 }}>({apiContract.endpoints.length} endpoints)</span>
        </h2>
      </div>
      {apiContract.endpoints.map((ep: any, i: number) => (
        <div key={i} className="viz-royal-card" style={{ marginBottom: "14px" }}>
          <div className="viz-royal-card--header viz-cat-backend">
            <span className={`viz-method ${ep.method?.toUpperCase().toLowerCase()}`}>{ep.method?.toUpperCase()}</span>
            <code style={{ fontFamily: "var(--viz-font-mono)", fontSize: "12px", opacity: 0.7, marginLeft: "8px" }}>{ep.path}</code>
            {ep.auth && (
              <span className="viz-badge viz-badge--purple" style={{ marginLeft: "auto" }}>auth</span>
            )}
          </div>
          <div className="viz-royal-card--body">
            <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "6px", fontWeight: 500 }}>{ep.summary}</p>
            {ep.description && <p style={{ fontSize: "12px", opacity: 0.65, marginBottom: "6px" }}>{ep.description}</p>}
            {ep.tags && ep.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {ep.tags.map((tag: string, j: number) => (
                  <span key={j} className="viz-badge" style={{ fontSize: "10px", padding: "1px 6px", color: "var(--viz-accent-bright)", background: "var(--viz-accent-soft)", borderColor: "var(--viz-accent-line)" }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {apiContract.notes && (
        <div className="viz-callout" style={{ padding: "10px 14px", fontSize: "12px", opacity: 0.65, fontStyle: "italic" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        {sectionIcons.perspectives}
        <h2 className="viz-display" style={{ fontSize: "17px", margin: 0 }}>Expert Perspectives</h2>
      </div>
      {Object.keys(perspectives).map((id) => {
        const p = perspectives[id];
        return (
          <div key={id} className="viz-royal-card viz-cat-purple" style={{ marginBottom: "20px" }}>
            <div className="viz-royal-card--header viz-cat-purple">
              <span className="viz-display" style={{ fontSize: "14px", margin: 0 }}>{p.label}</span>
              <span className="viz-spec" style={{ opacity: 0.55, marginLeft: "auto" }}>{p.roleId}</span>
            </div>
            <div className="viz-royal-card--body">
              <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "12px", whiteSpace: "pre-line", lineHeight: 1.6 }}>{p.summary}</p>

              {p.recommendations?.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <span className="viz-eyebrow" style={{ marginBottom: "4px", opacity: 0.7, fontSize: "10px" }}>Recommendations</span>
                  <ul style={{ listStyle: "none", margin: 0, paddingLeft: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {p.recommendations.map((r: any, i: number) => (
                      <li key={i} style={{ fontSize: "12px", display: "flex", alignItems: "baseline", gap: "6px" }}>
                        {r.priority ? <span className="viz-badge viz-badge--ruby" style={{ flexShrink: 0 }}>{r.priority}</span> : null}
                        <span style={{ fontWeight: 600 }}>{r.title}</span>
                        {r.detail ? <span style={{ opacity: 0.75 }}>— {r.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.risks?.length > 0 && (
                <div className="viz-q-summary" style={{ marginBottom: "10px" }}>
                  <span className="viz-spec" style={{ opacity: 0.8 }}>Risks</span>
                  <ul style={{ listStyle: "none", margin: "4px 0 0", paddingLeft: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {p.risks.map((risk: string, i: number) => (
                      <li key={i} style={{ fontSize: "12px", opacity: 0.8, display: "flex", alignItems: "center", gap: "5px" }}>
                        <span className="viz-status-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--viz-ruby)" }} />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.open_questions?.length > 0 && (
                <div>
                  <span className="viz-spec" style={{ opacity: 0.75, fontSize: "11px" }}>Open Questions</span>
                  <ul style={{ listStyle: "none", margin: "4px 0 0", paddingLeft: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {p.open_questions.map((q: string, i: number) => (
                      <li key={i} style={{ fontSize: "12px", opacity: 0.8, display: "flex", alignItems: "center", gap: "5px" }}>
                        <span className="viz-status-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--viz-warning)" }} />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
