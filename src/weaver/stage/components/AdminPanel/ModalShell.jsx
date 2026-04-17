import { useEffect } from 'react';
import { Settings, X } from 'lucide-react';

export default function ModalShell({ title = 'Admin Panel', onClose, headerRight, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute -inset-8 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-2xl bg-white border border-neutral-200 shadow-2xl overflow-hidden ring-1 ring-black/5">
          <div className="flex items-center justify-between px-5 py-4 border-b bg-neutral-50/60 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-green-700 text-white">
                <Settings size={18} />
              </span>
              <h2 className="text-lg my-auto font-semibold tracking-tight">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-neutral-100 text-green-700"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="px-5 py-4 max-h-[70vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
