import React from "react";

interface VizierSettingDefinition {
  key: string;
  label: string;
  type: "boolean" | "string" | "number" | "enum" | "json";
  description: string;
  defaultValue: any;
  enumValues?: string[];
  placeholder?: string;
  secret?: boolean;
}

interface SettingsPanelProps {
  settings: Record<string, any>;
  definitions: VizierSettingDefinition[];
  onChange: (key: string, value: any) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, definitions, onChange, onClose }: SettingsPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div>
          <div className="viz-eyebrow" style={{ marginBottom: "2px" }}>Configuration</div>
          <h2 className="viz-display" style={{ margin: 0, fontSize: "16px" }}>Vizier Settings</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="viz-btn viz-btn-secondary"
          style={{ padding: "6px 12px", fontSize: "12px" }}
        >
          Close
        </button>
      </div>

      <p style={{ margin: 0, fontSize: "12px", opacity: 0.65 }}>
        These settings are synced to the VS Code settings for Vizier and can be changed here without leaving the extension.
      </p>

      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
        {definitions.map((definition) => {
          const value = settings[definition.key] ?? definition.defaultValue;
          const inputId = `vizier-setting-${definition.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

          return (
            <div key={definition.key} className="viz-card" style={{ padding: "10px 12px" }}>
              <label htmlFor={inputId} style={{ display: "block", fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                {definition.label}
              </label>
              <div style={{ fontSize: "11px", opacity: 0.65, marginBottom: "8px" }}>{definition.description}</div>

              {definition.type === "boolean" && (
                <input
                  id={inputId}
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => onChange(definition.key, e.target.checked)}
                  aria-label={definition.label}
                  style={{ accentColor: "var(--viz-accent)" }}
                />
              )}

              {definition.type === "number" && (
                <input
                  id={inputId}
                  type="number"
                  value={value ?? 0}
                  placeholder={definition.placeholder}
                  onChange={(e) => onChange(definition.key, Number(e.target.value))}
                  aria-label={definition.label}
                  className="viz-input"
                />
              )}

              {(definition.type === "string" || definition.type === "json") && !definition.enumValues && (
                <input
                  id={inputId}
                  type={definition.secret ? "password" : "text"}
                  value={value ?? ""}
                  placeholder={definition.placeholder || ""}
                  onChange={(e) => onChange(definition.key, e.target.value)}
                  aria-label={definition.label}
                  className="viz-input"
                  style={{ fontFamily: definition.secret ? "var(--viz-font-mono)" : "inherit" }}
                />
              )}

              {definition.type === "enum" && definition.enumValues && (
                <select
                  id={inputId}
                  value={value ?? definition.defaultValue}
                  onChange={(e) => onChange(definition.key, e.target.value)}
                  aria-label={definition.label}
                  className="viz-input"
                >
                  {definition.enumValues.map((choice) => (
                    <option key={choice} value={choice}>{choice || "(default)"}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
