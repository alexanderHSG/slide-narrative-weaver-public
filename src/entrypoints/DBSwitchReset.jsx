import { useEffect, useRef } from "react";
import { useUser } from "@/weaver/stage/components/UserAccessWrapper/UserAccessWrapper";

export default function DbSwitchReset({ onReset, children }) {
  const { selectedDatabase } = useUser();
  const isMounted = useRef(false);

  useEffect(() => {
    if (isMounted.current) {
      onReset?.(selectedDatabase);
  } else {
      isMounted.current = true;
    }
  }, [selectedDatabase, onReset]);

  return <div>{children}</div>;
}