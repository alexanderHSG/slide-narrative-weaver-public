import { useState, useMemo } from 'react';
import { supabase } from '@/weaver/signals/lib/auth/supabaseClient';
import { callLogout } from '@/weaver/signals/lib/api/apiClient';
import { logger } from '@/weaver/toolkit/utils/logger/logger';
import { dbStore } from '@/weaver/signals/lib/api/dbStore';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { Copy, LogOut, FlaskConical, User2, UserRoundCogIcon } from 'lucide-react';

export default function ProfilePanel({ session, onSignOut }) {
  window.dispatchEvent(new Event('modal:opened'));

  const u = useUser();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const isExp = !!u?.isExp;
  const proto = u?.prototype || null;

  const emailNamed =
    u?.userProfile?.email ||
    session?.user?.email ||
    '';

  const namedId =
    session?.user?.id ||
    u?.userProfile?.user_id ||
    u?.userProfile?.id ||
    '';

  const pid = isExp ? (u?.userId?.replace(/^exp:/, '') || '') : '';
  const identity = isExp ? pid : namedId;

  const accessLabel       = isExp ? 'Experimental access' : 'Named';
  const userRoleDisplay   = isExp ? 'Experimental' : (u?.userProfile?.role || 'user');
  const titleText         = isExp ? (identity || '—') : (emailNamed || '—');
  const headerLiftClass   = isExp ? '-mt-12' : '-mt-12';
  const chipsMarginClass  = isExp ? 'mt-1'  : 'mt-1';

  const initials = useMemo(() => {
    const source = (titleText || 'User').replace(/[^a-z0-9@._-]/gi, ' ');
    const parts  = source.split(/[\s@._-]+/).filter(Boolean);
    const a = (parts[0]?.[0] || 'U').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2);
  }, [titleText]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(identity || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      localStorage.clear();
      sessionStorage.clear();
      dbStore.set(null);
      logger.cleanup?.();

      if (!isExp && session) await supabase.auth.signOut();
      await callLogout();

      onSignOut?.();
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[440px] max-w-[92vw]">
      <div className="rounded-2xl border border-neutral-200 shadow-md overflow-hidden bg-white">
        <div className="relative">
          <div className="h-24 bg-gradient-to-r from-emerald-600 to-emerald-500" />
          <div className={`px-6 pb-6 ${headerLiftClass}`}>
            <div className="flex items-end gap-4">
              <div className="shrink-0">
                <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-white shadow ring-1 ring-black/5">
                  <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-2xl bg-emerald-600 text-white font-semibold text-xl">
                    {initials}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-neutral-900 truncate leading-6">
                    {titleText}
                  </span>

                  {isExp && (
                    <button
                      onClick={onCopy}
                      className="inline-flex items-center gap-1 text-[11px] leading-none px-2 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50 shrink-0"
                      title="Copy identity"
                    >
                      <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                <div className={`-ml-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 ${chipsMarginClass}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <User2 size={14} />
                    <span className="align-middle">type:</span>
                    <span className="align-middle">{accessLabel}</span>
                  </span>

                  {!isExp && (
                    <span className="inline-flex items-center gap-1.5">
                      <UserRoundCogIcon size={14} />
                      <span className="align-middle">role:</span>
                      <span className="align-middle">{userRoleDisplay}</span>
                    </span>
                  )}
                  
                  {isExp && proto && (
                    <span className="inline-flex items-center gap-1.5">
                      <FlaskConical size={14} />
                      <span className="align-middle">Prototype:</span>
                      <span className="font-mono align-middle">{proto}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-[88px,1fr] gap-y-2 items-baseline text-[13px] leading-6">
            <div className="text-neutral-500">Identity</div>
            <div className="font-mono text-neutral-800 truncate">{identity || '—'}</div>

            {!isExp && emailNamed && (
              <>
                <div className="text-neutral-500">Email</div>
                <div className="font-mono text-neutral-800 truncate">{emailNamed}</div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl
                       bg-red-600 text-white font-medium hover:bg-red-700
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600
                       disabled:opacity-60"
          >
            <LogOut size={18} />
            {loading
              ? (isExp ? 'Ending session…' : 'Signing out…')
              : (isExp ? 'End experimental session' : 'Sign out')}
          </button>
        </div>
      </div>
    </div>
  );
}
