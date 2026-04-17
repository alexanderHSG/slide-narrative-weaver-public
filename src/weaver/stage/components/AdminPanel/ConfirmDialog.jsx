import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) {
  const firstBtn = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstBtn.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 p-5"
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-neutral-700 whitespace-pre-line">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={firstBtn}
            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="px-3 py-2 text-sm rounded-lg bg-black text-white hover:bg-neutral-900"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
