import React from "react";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  icon?: JSX.Element;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    (c.hint || "").toLowerCase().includes(query.toLowerCase())
  );

  const runAt = (i: number) => {
    const cmd = filtered[i];
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  return (
    <div className="viz-palette-scrim" onClick={onClose} aria-hidden="true">
      <div
        className="viz-palette"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="viz-palette-input-row">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); runAt(active); }
              else if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            placeholder="Type a command…"
            className="viz-palette-input"
            aria-label="Command search"
          />
          <span className="viz-spec" style={{ fontSize: "10px", opacity: 0.4 }}>ESC</span>
        </div>
        <div className="viz-palette-list">
          {filtered.length === 0 && (
            <div className="viz-palette-empty">No commands match “{query}”</div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => runAt(i)}
              className={`viz-palette-item ${i === active ? "is-active" : ""}`}
            >
              <span className="viz-palette-icon" aria-hidden="true">{c.icon}</span>
              <span className="viz-palette-label">{c.label}</span>
              {c.hint && <span className="viz-palette-hint">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
