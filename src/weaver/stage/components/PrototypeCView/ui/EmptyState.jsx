export default function EmptyState({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-500">
            <path d="M4 17l6-6 4 4 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="mt-4 inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
