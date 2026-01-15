import { clsx } from './utils';

export default function TabBar({ tabs, active, onChange, buttonMinW }) {
  return (
    <div className="px-2 py-2 rounded-xl bg-neutral-100 border border-neutral-200 w-fit">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'px-3 py-2 text-sm rounded-lg transition',
            active === t.key ? 'bg-white shadow-sm border border-neutral-200' : 'hover:bg-neutral-200/50',
            buttonMinW
          )}
          aria-pressed={active === t.key}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
