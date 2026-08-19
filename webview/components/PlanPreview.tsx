import React from "react";

interface PlanPreviewProps {
  blueprint: any;
  projectName: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "22px" }}>
      <h2 className="viz-display viz-doc-h2" style={{ fontSize: "16px", margin: "0 0 10px", paddingBottom: "6px", borderBottom: "1px solid var(--viz-border)" }}>{title}</h2>
      {children}
    </section>
  );
}

export function PlanPreview({ blueprint, projectName }: PlanPreviewProps) {
  if (!blueprint) return <div style={{ padding: "20px", opacity: 0.6 }}>No plan to preview yet.</div>;

  const product = blueprint.product || {};
  const arch = blueprint.architecture || {};
  const entities = blueprint.entities || [];
  const tasks = blueprint.tasks || [];
  const decisions = blueprint.decisions || [];
  const perspectives = blueprint.perspectives || [];
  const api = blueprint.api_contract || {};

  return (
    <div className="viz-plan-doc" style={{ maxWidth: "760px", margin: "0 auto", padding: "8px 4px" }}>
      <div className="viz-royal-card" style={{ marginBottom: "22px" }}>
        <div className="viz-royal-card--header viz-cat-gold">
          <span className="viz-crown" style={{ width: 18, height: 18, color: "var(--viz-gold-bright)" }} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 8l4 4 5-6 5 6 4-4-2 11H5L3 8z" /></svg>
          </span>
          <h1 className="viz-display" style={{ fontSize: "20px", margin: "0 0 0 6px", flex: 1 }}>{projectName || product.name || "Your App"}</h1>
        </div>
        <div className="viz-royal-card--body">
          <p style={{ fontSize: "14px", opacity: 0.82, lineHeight: 1.6, margin: "0 0 12px" }}>{product.vision || product.tagline || ""}</p>
          {product.target_users && (
            <p style={{ fontSize: "13px", opacity: 0.7, margin: 0 }}>
              <span className="viz-eyebrow" style={{ opacity: 0.6 }}>Target users · </span>{product.target_users}
            </p>
          )}
        </div>
      </div>

      {product.core_features?.length > 0 && (
        <Section title="Core Features">
          <ul className="viz-doc-list">
            {product.core_features.map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </Section>
      )}

      {arch.components?.length > 0 && (
        <Section title="Architecture">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px", marginBottom: "12px" }}>
            {arch.components.map((c: any, i: number) => (
              <div key={i} className="viz-royal-card" style={{ margin: 0 }}>
                <div className="viz-royal-card--body" style={{ padding: "10px 12px" }}>
                  <div className="viz-display" style={{ fontSize: "13px" }}>{c.name}</div>
                  {c.responsibility && <div className="viz-spec" style={{ fontSize: "11px", opacity: 0.65, marginTop: 2 }}>{c.responsibility}</div>}
                </div>
              </div>
            ))}
          </div>
          {arch.patterns && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(Array.isArray(arch.patterns) ? arch.patterns : [arch.patterns]).map((p: string, i: number) => (
                <span key={i} className="viz-tag viz-tag--purple">{p}</span>
              ))}
            </div>
          )}
        </Section>
      )}

      {entities.length > 0 && (
        <Section title="Data Model">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {entities.map((e: any, i: number) => (
              <div key={i} className="viz-royal-card" style={{ margin: 0 }}>
                <div className="viz-royal-card--header viz-cat-emerald">
                  <span className="viz-display" style={{ fontSize: "14px" }}>{e.name}</span>
                </div>
                <div className="viz-royal-card--body" style={{ padding: "10px 12px" }}>
                  <table className="viz-doc-table">
                    <tbody>
                      {(e.fields || []).map((f: any, fi: number) => (
                        <tr key={fi}>
                          <td style={{ fontWeight: 600, paddingRight: 10 }}>{f.name}</td>
                          <td style={{ opacity: 0.7 }}>{f.type}</td>
                          {f.constraints?.length > 0 && (
                            <td style={{ paddingLeft: 8 }}>
                              {f.constraints.map((c: string, ci: number) => (
                                <span key={ci} className="viz-tag" style={{ marginLeft: 4 }}>{c}</span>
                              ))}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {api?.endpoints?.length > 0 && (
        <Section title="API Contract">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {api.endpoints.map((ep: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", background: "var(--viz-soft)", borderRadius: "6px" }}>
                <span className={`viz-method viz-method--${(ep.method || "get").toLowerCase()}`}>{ep.method}</span>
                <code style={{ fontFamily: "var(--viz-font-mono)", fontSize: "12px" }}>{ep.path}</code>
                <span className="viz-spec" style={{ opacity: 0.6, fontSize: "12px" }}>{ep.purpose}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tasks.length > 0 && (
        <Section title="Build Tasks">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tasks.map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "5px 0", borderBottom: "1px solid var(--viz-border)" }}>
                <span className="viz-spec" style={{ fontSize: "11px", opacity: 0.55 }}>[{t.id}]</span>
                <span className="viz-display" style={{ fontSize: "13px", flex: 1 }}>{t.title}</span>
                {t.estimated_effort && <span className="viz-tag viz-tag--sapphire">{t.estimated_effort}</span>}
                {t.depends_on?.length > 0 && <span className="viz-spec" style={{ fontSize: "11px", opacity: 0.5 }}>↳ {t.depends_on.join(", ")}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {decisions.length > 0 && (
        <Section title="Key Decisions">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {decisions.map((d: any, i: number) => (
              <div key={i} className="viz-royal-card viz-cat-gold" style={{ margin: 0 }}>
                <div className="viz-royal-card--body" style={{ padding: "10px 12px" }}>
                  <div className="viz-display" style={{ fontSize: "13px", marginBottom: 4 }}>{d.topic}</div>
                  <div className="viz-spec" style={{ fontSize: "12px", opacity: 0.75 }}>Chosen: <strong style={{ color: "var(--viz-gold-bright)" }}>{d.chosen}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {perspectives.length > 0 && (
        <Section title="Perspectives Considered">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {perspectives.map((p: any, i: number) => (
              <div key={i} className="viz-royal-card" style={{ margin: 0, flex: "1 1 200px" }}>
                <div className="viz-royal-card--body" style={{ padding: "10px 12px" }}>
                  <div className="viz-display" style={{ fontSize: "13px", marginBottom: 4 }}>{p.name}</div>
                  <div className="viz-spec" style={{ fontSize: "11.5px", opacity: 0.7, lineHeight: 1.45 }}>{p.summary || p.focus}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
