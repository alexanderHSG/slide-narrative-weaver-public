import Spinner from './Spinner';

export default function LoadingOverlay({ label = 'Loading…' }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-sm" aria-live="polite">
      <div className="flex items-center gap-3 rounded-full border bg-white px-4 py-2 shadow">
        <Spinner />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
    </div>
  );
}
