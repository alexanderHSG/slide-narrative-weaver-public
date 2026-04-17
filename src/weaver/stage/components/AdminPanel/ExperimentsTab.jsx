import { useState, useMemo } from 'react';
import { supabase } from '@/weaver/signals/lib/auth/supabaseClient';
import { Copy, ExternalLink, KeyRound, Dice5 } from 'lucide-react';

function clamp(n, min, max) {
  const v = Number(n || 0);
  return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
}
function genPid() {
  const base = Date.now().toString(36).slice(-6);
  const rnd = Math.random().toString(36).slice(2, 4);
  return `exp-${base}-${rnd}`;
}

export default function ExperimentsTab({ notify }) {
  const [pid, setPid] = useState(genPid());
  const [prototype, setPrototype] = useState('I1');
  const [ttl, setTtl] = useState(10800);
  const [next, setNext] = useState('/app');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const disabled = useMemo(() => !pid || !prototype || busy, [pid, prototype, busy]);

  const generate = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('You are not signed in (no Supabase access token).');

      const payload = {
        pid: String(pid).trim(),
        prototype: ['I1', 'I2', 'C1', 'C2'].includes(prototype) ? prototype : 'I1',
        ttl: clamp(ttl, 60, 86400),
        next: next?.startsWith('/') ? next : '/app',
      };

      const res = await fetch('/.netlify/functions/admin-issue-exp-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setResult(data);
      notify?.({ type: 'ok', title: 'Token created', message: 'Login link is ready.' });
    } catch (e) {
      notify?.({ type: 'err', title: 'Token creation failed', message: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      notify?.({ title: 'Copied', message: 'Copied to clipboard.' });
    } catch {}
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <KeyRound size={16} className="text-emerald-600" />
        Issue experimental access tokens (Qualtrics / manual distribution).
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="grid gap-1 md:col-span-2">
          <label className="text-xs text-neutral-600">Participant ID (pid)</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-md px-2 py-1 text-sm"
              placeholder="e.g. exp-123"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setPid(genPid())}
              className="px-2 py-1 border rounded-md text-sm hover:bg-white"
              title="Generate PID"
            >
              <Dice5 size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-neutral-600">Prototype</label>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={prototype}
            onChange={(e) => setPrototype(e.target.value)}
          >
            <option value="I1">I1</option>
            <option value="I2">I2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-neutral-600">TTL (seconds)</label>
          <input
            type="number"
            min={60}
            max={86400}
            className="border rounded-md px-2 py-1 text-sm"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-xs text-neutral-600">Next path</label>
          <input
            className="border rounded-md px-2 py-1 text-sm"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="/app"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Generating…' : 'Generate token & link'}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50 grid gap-3">
          <div className="grid gap-1">
            <div className="text-xs text-neutral-600">Login URL</div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                className="flex-1 border rounded-md px-2 py-1 text-sm bg-white"
                value={result.login_url || ''}
              />
              <button
                onClick={() => copy(result.login_url || '')}
                className="px-2 py-1 border rounded-md text-sm hover:bg-white"
                title="Copy link"
              >
                <Copy size={16} />
              </button>
              <a
                className="px-2 py-1 border rounded-md text-sm hover:bg-white"
                href={result.login_url || '#'}
                target="_blank"
                rel="noreferrer"
                title="Open"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-[120px,1fr] gap-2 text-sm">
            <div className="text-neutral-500">Prototype</div>
            <div>{result.prototype}</div>

            <div className="text-neutral-500">Expires in</div>
            <div>{result.expires_in}s</div>

            <div className="text-neutral-500">Raw token</div>
            <div className="flex items-center gap-2">
              <code className="break-all text-[11px] bg-white border px-2 py-1 rounded">
                {result.token}
              </code>
              <button
                onClick={() => copy(result.token || '')}
                className="px-2 py-1 border rounded-md text-xs hover:bg-white"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
