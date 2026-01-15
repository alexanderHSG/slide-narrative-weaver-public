import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { clsx } from './utils';

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const add = useCallback((t = {}) => {
    const id = Math.random().toString(36).slice(2);
    const toast = { id, type: 'ok', ...t };
    setToasts((xs) => [...xs, toast]);

    const duration = typeof t.duration === 'number' ? t.duration : 2500;
    if (t.autoClose !== false) {
      setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ add, dismiss }), [add, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastList toasts={toasts} dismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

function ToastList({ toasts, dismiss }) {
  return (
    <div className="fixed z-[60] bottom-4 right-4 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            'rounded-xl shadow-lg px-4 py-3 text-sm border',
            t.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : t.type === 'warn'
              ? 'bg-amber-500 text-black border-amber-600'
              : 'bg-neutral-900 text-white border-neutral-800'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="pt-0.5">{t.type === 'error' ? '⛔' : t.type === 'warn' ? '⚠️' : '✅'}</div>
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              {t.msg && <div className="opacity-90">{t.msg}</div>}
            </div>
            <button
              className="opacity-70 hover:opacity-100"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
