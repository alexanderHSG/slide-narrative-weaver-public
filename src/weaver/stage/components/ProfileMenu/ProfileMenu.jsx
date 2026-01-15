import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ProfilePanel from './ProfilePanel';
import { useSession } from '@/weaver/signals/lib/auth/supabaseClient';

export default function ProfileMenu({ onClose, open = true }) {
  window.dispatchEvent(new Event('modal:opened'));

  const session = useSession();
  const boxRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stop = (e) => e.stopPropagation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            onClick={stop}
            initial={{ y: 8, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="relative"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3 -right-3 z-10 inline-flex items-center justify-center
                         rounded-full bg-white text-neutral-600 shadow ring-1 ring-black/5
                         hover:bg-neutral-50 hover:text-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>

            <ProfilePanel session={session} onSignOut={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
