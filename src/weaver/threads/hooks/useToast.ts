import { useCallback, useState, useRef } from "react";

export type Toast = { msg: string; type: string } | null;

export function useToast(defaultTimeoutMs = 3000): [
  Toast,
  (msg: string|{msg?:string;message?:string;type?:string}, type?: string, durationMs?: number) => void,
  () => void
] {
  const [toast, setToast] = useState<Toast>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((
    rawMsg: string | { msg?: string; message?: string; type?: string },
    rawType = "success",
    durationMs?: number
  ) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    let msg: string;
    let type = rawType;
    if (typeof rawMsg === "object" && rawMsg !== null) {
      msg = rawMsg.message ?? rawMsg.msg ?? JSON.stringify(rawMsg);
      type = rawMsg.type ?? rawType;
    } else {
      msg = String(rawMsg);
    }

    setToast({ msg, type });

    const timeout = durationMs !== undefined ? durationMs : defaultTimeoutMs;
    if (timeout > 0) {
      hideTimer.current = setTimeout(() => {
        setToast(null);
        hideTimer.current = null;
      }, timeout);
    }
  }, [defaultTimeoutMs]);

  const dismissToast = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setToast(null);
  }, []);

  return [toast, showToast, dismissToast];
}
