import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export const Toast = ({ toast }) => {
  if (!toast || !toast.msg) return null;
  const isError = toast.type === "error";
  const isSuccess = toast.type === "success";

  return (
    <AnimatePresence>
      <motion.div
        key="toast"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className={`
          absolute left-0 right-0 m-auto top-40 z-[9999] 
          max-w-fit px-5 py-3 rounded-lg shadow-lg flex 
          items-center font-semibold text-base
          ${isError
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"}
        `}
        style={{
          pointerEvents: 'none',
        }}
      >
        {isError && <XCircle className="w-5 h-5 mx-2 text-white" />}
        {isSuccess && <CheckCircle className="w-5 h-5 mx-2 text-white" />}
        <span className="font-medium">{toast.msg}</span>
      </motion.div>
    </AnimatePresence>
  );
};
