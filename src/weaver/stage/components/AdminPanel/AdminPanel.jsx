import { useEffect, useMemo, useState, useCallback } from 'react';
import { useUser } from '../UserAccessWrapper/UserAccessWrapper';
import ModalShell from './ModalShell';
import TabBar from './TabBar';
import ToastProvider, { useToast } from './ToastProvider';
import DatabaseTab from './DatabaseTab';
import AllowedEmailsTab from './AllowedEmailsTab';
import UsersTab from './UsersTab';
import ExperimentsTab from './ExperimentsTab';
import { Database, Mail, Users, KeyRound } from 'lucide-react';

export default function AdminPanel({ open: controlledOpen, onOpenChange, trigger }) {
  const user = useUser();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof controlledOpen === 'boolean' ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  if (!user?.userProfile) return null;
  if (user.userProfile.role !== 'admin') return null

  const Trigger = () =>
    trigger ? (
      <span onClick={() => setOpen(true)}>{trigger}</span>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="px-0.5 text-gray-600 hover:text-green-700 cursor-pointer py-1"
        aria-label="Open Admin Panel"
      >
        Admin
      </button>
    );

  return (
    <>
      <Trigger />

      {open && (
        <ToastProvider>
          <ModalShell
            title="Admin Panel"
            onClose={() => setOpen(false)}
            headerRight={
              <div className="text-xs text-neutral-500">
                Signed in as {user.userProfile?.email}{' '}
                <span className="ml-2 inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] border bg-emerald-50 text-emerald-700 border-emerald-200">
                  role: {user.userProfile?.role || '—'}
                </span>
              </div>
            }
          >
            <TabbedContent />
          </ModalShell>
        </ToastProvider>
      )}
    </>
  );
}

function TabbedContent() {
  const { add } = useToast() || {};
  const notify = useCallback(
    ({ type = 'ok', title, message } = {}) => {
      const mapped =
        type === 'err' ? 'error' :
        type === 'warn' ? 'warn'  :
        'ok';
      if (add) {
        add({ type: mapped, title, msg: message });
      } else {
        const text = [title, message].filter(Boolean).join(': ');
        (mapped === 'ok' ? console.log : console.error)('[toast]', text);
      }
    },
    [add]
  );

  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'database';
    return localStorage.getItem('admin_tab') || 'database';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('admin_tab', tab);
  }, [tab]);

  const tabs = useMemo(
    () => [
      { key: 'database', label: (<><Database color="green" size={16}/> Database</>) },
      { key: 'allowed',  label: (<><Mail     color="green" size={16}/> Allowed Emails</>) },
      { key: 'users',    label: (<><Users    color="green" size={16}/> Users</>) },
      { key: 'experiments', label: (<><KeyRound color="green" size={16}/> Experiments</>) },
    ],
    []
  );

  return (
    <div className="grid grid-rows-[auto,1fr] min-h-[560px] h-[60vh] max-h-[820px]">
      <div className="pb-3 border-b border-neutral-200">
        <TabBar tabs={tabs} active={tab} onChange={setTab} buttonMinW="w-32" />
      </div>

      <div className="overflow-auto pt-4">
        <div className="space-y-4">
          {tab === 'database' && (
            <Section title="Database">
              <DatabaseTab notify={notify} />
            </Section>
          )}

          {tab === 'allowed' && (
            <Section title="Allowed emails">
              <div className="overflow-auto">
                <AllowedEmailsTab notify={notify} />
              </div>
            </Section>
          )}

          {tab === 'users' && (
            <Section title="Users">
              <div className="overflow-auto">
                <UsersTab notify={notify} />
              </div>
            </Section>
          )}

          {tab === 'experiments' && (
            <Section title="Experimental access">
              <ExperimentsTab notify={notify} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="grid gap-3">
      <div className="text-sm font-medium text-neutral-800">{title}</div>
      <div className="min-h-[240px]">{children}</div>
    </section>
  );
}
