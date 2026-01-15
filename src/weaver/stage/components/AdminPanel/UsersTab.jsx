import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { API, ROLES, ADMIN_DATABASES } from './api';

export default function UsersTab({ notify, currentEmail, onSelfDemoted }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, userId: null });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API.listUsers, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setItems(json.items || []);
    } catch (e) {
      notify?.({ type: 'err', title: 'Load failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onSaveUser = async (user) => {
    setSavingId(user.user_id);
    try {
      const res = await fetch(API.upsertUser, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          preferred_db: user.preferred_db,
          user_type: user.user_type,
          started_at: user.started_at
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');

      setItems(prev => prev.map(x => x.user_id === user.user_id ? json.item : x));
      notify?.({ type: 'ok', title: 'User updated' });

      const isMe = (user.email || '').toLowerCase() === (currentEmail || '').toLowerCase();
      if (isMe && String(json.item.role).toLowerCase() !== 'admin') {
        onSelfDemoted?.();
      }
    } catch (e) {
      notify?.({ type: 'err', title: 'Update failed', message: e.message });
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (user_id, alsoDeleteAuth = false) => {
    setDeletingId(user_id);
    try {
      const res = await fetch(API.deleteUser, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, alsoDeleteAuth })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');

      const removed = items.find(x => x.user_id === user_id);
      setItems(prev => prev.filter(x => x.user_id !== user_id));
      notify?.({ type: 'ok', title: 'User deleted' });

      const isMe = (removed?.email || '').toLowerCase() === (currentEmail || '').toLowerCase();
      if (isMe) onSelfDemoted?.();
    } catch (e) {
      notify?.({ type: 'err', title: 'Delete failed', message: e.message });
      setDeletingId(null);
    } finally {
      setConfirm({ open: false, userId: null });
    }
  };

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(x =>
      (x.email || '').toLowerCase().includes(s) ||
      (x.user_id || '').toLowerCase().includes(s) ||
      (x.role || '').toLowerCase().includes(s) ||
      (x.preferred_db || '').toLowerCase().includes(s)
    );
  }, [q, items]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter by email / user_id / role / db…"
          className="text-sm bg-white border border-neutral-300 rounded-xl px-3 py-2 w-full"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2 w-[120px]">Role</th>
              <th className="text-left px-3 py-2 w-[140px]">Preferred DB</th>
              <th className="text-left px-3 py-2">User ID</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Started</th>
              <th className="text-right px-12 py-2 w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">No users found</td></tr>
            ) : filtered.map(u => {
              const isSaving = savingId === u.user_id;
              const isDeleting = deletingId === u.user_id;

              return (
                <tr key={u.user_id} className="border-t align-middle">
                  <td className="px-3 py-2">{u.email || <span className="text-neutral-400">—</span>}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) =>
                        setItems(prev => prev.map(x =>
                          x.user_id === u.user_id ? { ...x, role: e.target.value } : x
                        ))
                      }
                      disabled={isSaving || isDeleting}
                      className="text-xs bg-white border border-neutral-300 rounded-lg px-2 pr-10 py-1 w-full"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={u.preferred_db || ADMIN_DATABASES[0]}
                      onChange={(e) =>
                        setItems(prev => prev.map(x =>
                          x.user_id === u.user_id ? { ...x, preferred_db: e.target.value } : x
                        ))
                      }
                      disabled={isSaving || isDeleting}
                      className="text-xs bg-white border border-neutral-300 rounded-lg px-2 pr-10 py-1 w-full"
                    >
                      {ADMIN_DATABASES.map(db => <option key={db} value={db}>{db}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{u.user_id}</td>
                  <td className="px-3 py-2">{u.user_type}</td>
                  <td className="px-3 py-2">{u.started_at ? new Date(u.started_at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={() => onSaveUser(u)}
                        disabled={isSaving || isDeleting}
                        className={`px-3 py-1 text-xs rounded-lg border text-white w-full
                          ${isSaving
                            ? 'bg-neutral-600 border-neutral-600 cursor-wait'
                            : 'bg-green-700 hover:bg-green-800 border-green-700'}`}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setConfirm({ open: true, userId: u.user_id })}
                        disabled={isSaving || isDeleting}
                        className={`px-3 py-1 text-xs rounded-lg border text-white w-full
                          ${isDeleting
                            ? 'bg-neutral-600 border-neutral-600 cursor-wait'
                            : 'bg-red-700 hover:bg-red-800 border-red-700'}`}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete user?"
        message={
          "This will remove the user from app_users.\n" +
          "Related records with ON DELETE CASCADE will be removed as well.\n\n" +
          "Also delete Auth account? (irreversible)"
        }
        confirmLabel="Delete (app_users)"
        cancelLabel="Cancel"
        onCancel={() => setConfirm({ open: false, userId: null })}
        onConfirm={() => onDelete(confirm.userId, false)}
      />
      {confirm.open && (
        <div className="flex justify-end">
          <button
            className="mt-2 px-2 py-1 text-xs rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => onDelete(confirm.userId, true)}
          >
            Delete app_users + Auth
          </button>
        </div>
      )}
    </div>
  );
}
