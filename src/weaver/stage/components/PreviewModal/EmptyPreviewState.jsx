import { Plus, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

const EmptyPreviewState = ({ onAdd, onClose }) => {
  const bounce = {
    y: [0, -18, 0, -12, 0, -6, 0],
    boxShadow: [
      "0 6px 14px rgba(16,185,129,0.15)",
      "0 16px 26px rgba(16,185,129,0.25)",
      "0 6px 14px rgba(16,185,129,0.15)",
      "0 12px 22px rgba(16,185,129,0.22)",
      "0 6px 14px rgba(16,185,129,0.15)",
      "0 8px 16px rgba(16,185,129,0.18)",
      "0 6px 14px rgba(16,185,129,0.15)",
    ],
    transition: {
      duration: 1.8,
      times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1],
      ease: ["easeOut", "easeIn", "easeOut", "easeIn", "easeOut", "easeIn", "easeOut"],
      repeat: Infinity,
      repeatDelay: 2.2,
    },
  };

  return (
    <div className="relative flex-1 bg-white overflow-y-auto">
      <div className="flex items-start justify-center min-h-full py-8 sm:py-12 md:py-16 lg:py-20 px-4">
        <div className="flex flex-col items-center w-full max-w-2xl text-center">
          <motion.div
            animate={bounce}
            className="mx-auto mb-3 sm:mb-4 inline-flex items-center justify-center rounded-full bg-emerald-50 p-2.5 sm:p-3"
            style={{ willChange: "transform, box-shadow" }}
            aria-hidden
          >
            <Lightbulb className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
          </motion.div>

          <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-md p-4 sm:p-5 md:p-6 w-full text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
              Build Your Storyline with Story Points
            </h3>
            <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
              Story Points are the building blocks of your narrative. Each point represents a key message, 
              insight, or transition you want your audience to follow. Together, 
              they help you structure your deck into a clear and compelling flow.
            </p>

            <ul className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-1.5 text-left inline-block max-w-full">
              <li className="break-words">• <b>Add your first Story Point</b> with "Add Story Point.".</li>
              <li className="break-words">• <b>Edit details</b> by clicking on any Story Point.</li>
              <li className="break-words">• <b>Refine your flow</b> by dragging Story Points into the right order.</li>
              <li className="break-words">• <b>Navigate easily</b> using the right panel to jump between points.</li>
            </ul>

            <div className="mt-4 sm:mt-5 md:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                onClick={onAdd}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-medium hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Storypoint
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyPreviewState;
