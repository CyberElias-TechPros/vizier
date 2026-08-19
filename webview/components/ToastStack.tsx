import React from "react";

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  duration?: number;
}

const ICONS: Record<ToastKind, JSX.Element> = {
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
};

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="viz-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const dur = toast.duration ?? 4200;
    const t1 = setTimeout(() => setLeaving(true), dur);
    const t2 = setTimeout(() => onDismiss(toast.id), dur + 280);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className={`viz-toast viz-toast--${toast.kind}${leaving ? " is-leaving" : ""}`} role="status">
      <span className="viz-toast-icon" aria-hidden="true">{ICONS[toast.kind]}</span>
      <div className="viz-toast-body">
        <div className="viz-toast-title">{toast.title}</div>
        {toast.message && <div className="viz-toast-msg">{toast.message}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="viz-btn viz-btn-ghost"
        style={{ padding: 0, width: "18px", height: "18px", fontSize: "11px", flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

let nextId = 1;

export function useToasts() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((kind: ToastKind, title: string, message?: string, duration?: number) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, kind, title, message, duration }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}
