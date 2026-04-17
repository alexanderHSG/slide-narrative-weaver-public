import { useEffect, useState } from 'react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import { ADMIN_DATABASES } from './api';

const OVERRIDE_KEY = 'dbOverride';

export default function DatabaseTab({ notify }) {
  const ctx = useUser();
  const isAdmin = ctx?.isAdmin ?? ((ctx?.userProfile?.role || 'user') === 'admin');
  const defaultDb = (ctx?.userProfile?.preferred_db === 'db_new') ? 'db_new' : 'db_old';
  const effectiveDb = ctx?.selectedDatabase || defaultDb;

  const [db, setDb] = useState(effectiveDb);
  const [overrideActive, setOverrideActive] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(OVERRIDE_KEY);
      if (saved === 'db_old' || saved === 'db_new') {
        setOverrideActive(true);
        setDb(saved);
        ctx?.setSelectedDatabase?.(saved);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!overrideActive) setDb(effectiveDb);
  }, [effectiveDb, overrideActive]);

  if (!isAdmin) return null;

  const apply = () => {
    sessionStorage.setItem(OVERRIDE_KEY, db);
    setOverrideActive(true);
    ctx?.setSelectedDatabase?.(db);
    notify?.({ type: 'ok', title: `Session DB switched to ${db}` });
  };

  const reset = () => {
    sessionStorage.removeItem(OVERRIDE_KEY);
    setOverrideActive(false);
    ctx?.setSelectedDatabase?.(defaultDb);
    setDb(defaultDb);
    notify?.({ type: 'ok', title: 'Session DB override cleared' });
  };

  return (
    <div className="grid gap-4">
      <div className="text-sm text-neutral-700 space-y-1">
        <div>Default DB (from profile): <b>{defaultDb}</b></div>
        <div>
          Effective DB (in use): <b>{effectiveDb}</b>
          {overrideActive && (
            <span className="ml-2 inline-block align-middle text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              session override
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Switch database for this session
        </label>
        <div className="flex items-center gap-3">
          <select
            aria-label="Select Database"
            value={db}
            onChange={(e) => setDb(e.target.value)}
            className="text-sm bg-white border border-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            {ADMIN_DATABASES.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>

          <button
            onClick={apply}
            className="px-3 py-2 text-sm rounded-xl border text-white bg-green-700 hover:bg-green-800 min-w-[140px]"
          >
            Apply (session)
          </button>

          {overrideActive && (
            <button
              onClick={reset}
              className="px-3 py-2 text-sm rounded-xl border bg-white min-w-[140px]"
            >
              Reset override
            </button>
          )}
        </div>

        <p className="mt-2 text-xs text-neutral-600">
          This change applies to <b>only this session</b>. The backend honors it for admins.
        </p>
      </div>
    </div>
  );
}
