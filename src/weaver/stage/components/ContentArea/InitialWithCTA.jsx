import InformationSteps from '../InformationSteps/InformationSteps.jsx';
import { Eye } from 'lucide-react';

export function InitialWithCTA({ hasSP, onOpenPreview }) {
  return (
    <div className="max-w-5xl mx-auto w-full">
      <InformationSteps />

      <div className="mt-10 flex justify-center">
        <div className="w-full sm:w-auto">
          <div className="bg-white/70 backdrop-blur-sm border border-green-100 rounded-2xl shadow-sm p-6 sm:p-7 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {hasSP
                ? 'Open Preview to arrange and refine your story'
                : 'Open Preview to add your first story points'}
            </h3>
            <p className="mt-1.5 text-sm text-gray-600">
              {hasSP
                ? 'Reorder slides, swap alternatives, and finalize the flow.'
                : 'Create story points manually and start arranging your deck.'}
            </p>

            <button
              type="button"
              onClick={onOpenPreview}
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full
                         bg-green-600 text-white font-medium shadow-lg
                         hover:bg-green-700 focus:outline-none
                         focus:ring-2 focus:ring-offset-2 focus:ring-green-600
                         active:scale-[0.99] transition"
            >
              <Eye className="w-5 h-5" />
              Open Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
