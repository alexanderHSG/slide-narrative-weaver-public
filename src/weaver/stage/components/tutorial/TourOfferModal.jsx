export function TourOfferModal({ open, onAccept, onDecline, onNever }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <h3 className="text-lg text-center font-semibold text-gray-900">
          Hands‑on Graph Tutorial
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Would you like to open a guided, full‑screen tutorial that shows how to work
          with a Story Point and slides?
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onAccept}
            className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Yes, open the tutorial
          </button>

          <button
            onClick={onDecline}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Not now
          </button>

          <button
            onClick={onNever}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Never show this again
          </button>
        </div>
      </div>
    </div>
  );
}