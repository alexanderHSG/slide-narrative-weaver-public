import { motion, AnimatePresence } from 'framer-motion';

const AlertDialog = ({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-gray-700 mb-6">{description}</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AlertDialog;
