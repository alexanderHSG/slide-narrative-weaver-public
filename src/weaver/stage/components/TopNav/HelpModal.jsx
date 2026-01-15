import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const HelpModal = ({ onClose, setShouldOpenGraphTutorial }) => (
  window.dispatchEvent(new Event('modal:opened')),

  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6"
  >
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0.95 }}
      className="bg-white rounded-xl shadow-xl w-full max-w-3xl md:max-w-2xl sm:max-w-lg mx-auto p-4 sm:p-6 overflow-y-auto max-h-[90vh]"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-green-800">Help & Documentation</h2>
        <button onClick={onClose} className="p-2 hover:bg-[#efe1d1] rounded-full">
          <X className="w-5 h-5 text-green-800" />
        </button>
      </div>

      <div className="space-y-6 text-sm sm:text-base">
        <section>
          <h3 className="text-base sm:text-lg font-semibold mb-2">Getting Started</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Click the + button in the right side bar to create a new story</li>
            <li>Enter a description of your presentation topic</li>
            <li>Select the number of slides you want to generate</li>
            <li>Click "Create Story Points" to create your initial presentation</li>
            <li>After creating story, the Preview Modal will open where you can customize story points, reorder them, and more.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base sm:text-lg font-semibold mb-2">Working with Slides</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Double click on a slide to enlarge the view</li>
            <li>Click a slide to select it</li>
            <li>Drag slides to rearrange them</li>
            <li>Use the lock icon in the Top Bar to prevent modifications</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base sm:text-lg font-semibold mb-2">Customizing Your Presentation</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Double-click any story point to open edit mode</li>
            <li>Use the "Retrieve alternative slides" button on a StoryPoint</li>
            <li>Adjust slide count using the dropdown menu</li>
            <li>Click the export button to save your presentation</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base sm:text-lg font-semibold mb-2">Navigation</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use zoom controls, mouse, or touchpad to adjust view</li>
            <li>Click "Fit View" in Top Bar to see the whole presentation</li>
            <li>Use navigation buttons to move around the canvas</li>
            <li>Click "Reset" in Top Bar to return to default view</li>
            <li>Switch layout modes with the layout toggle in Top Bar</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-around">
        <button
          onClick={() => {
            window.dispatchEvent(new Event('joyride:restart'));
            localStorage.removeItem('hasSeenTour');
            onClose();
          }}
          className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          Check out the trial tour again
        </button>
        <button
          onClick={() => {
            sessionStorage.removeItem('tutorial.step');
            sessionStorage.removeItem('tutorial.skipped');
            setShouldOpenGraphTutorial(true);
            onClose();
          }}
          className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
        >
          Start interactive graph tutorial
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default HelpModal;