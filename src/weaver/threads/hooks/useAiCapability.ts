import { useUser } from '@/weaver/stage/components/UserAccessWrapper/UserAccessWrapper'
import { isAiEnabledFor } from '@/weaver/signals/lib/capabilities/aiGuard';

export function useAiCapability() {
  const { prototype, chatgptEnabled } = useUser?.() ?? {};
  const variant = (prototype || '').trim();
  const aiEnabled = isAiEnabledFor({ prototype: variant, chatgptEnabled });
  return { aiEnabled, variant };
}
