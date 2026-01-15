import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { API } from './api';

export default function AllowedEmailsTab({ notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [suffix, setSuffix] = useState('');
  const [confirm, setConfirm] = useState({ open: false, value: null });

  const [adding, setAdding] = useState(false);
  const [deletingValue, setDeletingValue] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(API.listRules, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setItems(json.items || []);
    } catch (e) {
      notify?.({ type: 'err', title: 'Load failed', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(x => (x.email_suffix || '').toLowerCase().includes(s));
  }, [q, items]);

  const onAdd = async (ev) => {
    ev.preventDefault();
    const value = suffix.trim().toLowerCase();
    if (!value) return;
    setAdding(true);
    try {
      const res = await fetch(API.upsertRule, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_suffix: value })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Add failed');

      notify?.({ type: 'ok', title: 'Added', message: value });
      setSuffix('');
      await fetchItems();
    } catch (e) {
      notify?.({ type: 'err', title: 'Add failed', message: e.message });
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (value) => {
    setDeletingValue(value);
    try {
      const res = await fetch(API.deleteRule, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_suffix: value })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');

      notify?.({ type: 'ok', title: 'Deleted', message: value });
      setItems(prev => prev.filter(x => x.email_suffix !== value));
    } catch (e) {
      notify?.({ type: 'err', title: 'Delete failed', message: e.message });
    } finally {
      setDeletingValue(null);
      setConfirm({ open: false, value: null });
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={onAdd} className="grid gap-3 rounded-xl border border-neutral-200 p-4">
        <div className="font-medium">Allow email / domain</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={suffix}
            onChange={e => setSuffix(e.target.value)}
            placeholder="john@domain.com lub domain.com"
            className="text-sm bg-white border border-neutral-300 rounded-xl px-3 py-2"
            disabled={adding}
          />
          <button
            className={`px-3 py-2 text-sm rounded-xl border text-white min-w-[120px]
              ${adding ? 'bg-neutral-600 border-neutral-600 cursor-wait'
                       : 'bg-green-700 hover:bg-green-800 border-green-700'}`}
            disabled={adding}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        <p className="text-xs text-neutral-600">
          Entry may be a full email or just a domain.
        </p>
      </form>

      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter…"
          className="text-sm bg-white border border-neutral-300 rounded-xl px-3 py-2 w-full"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="text-left p-3">Email / Domain</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className="p-6 text-center text-neutral-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={2} className="p-6 text-center text-neutral-500">No entries</td></tr>
            ) : filtered.map((x) => {
              const isDeleting = deletingValue === x.email_suffix;
              return (
                <tr key={x.email_suffix} className="border-t">
                  <td className="p-3">{x.email_suffix}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setConfirm({ open: true, value: x.email_suffix })}
                      disabled={isDeleting}
                      className={`px-2 py-1 text-xs rounded-lg border
                        ${isDeleting
                          ? 'border-red-300 text-red-400 cursor-wait'
                          : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete entry?"
        message={`Remove "${confirm.value}" from allowed list?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirm({ open: false, value: null })}
        onConfirm={() => onDelete(confirm.value)}
      />
    </div>
  );
}
