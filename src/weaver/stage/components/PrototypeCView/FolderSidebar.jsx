import { Folder } from 'lucide-react';

export function SidebarFolders({ folders, selectedFolder, onSelect }) {
  const items = (folders || []).map(f => ({
    key: f.folder_topic,
    name: f.folder_topic,
    count: (f.decks || []).length,
  }));

  return (
    <aside className="hidden md:flex w-72 border-r h-full min-h-0 flex-col">
      <div className="px-3 py-3 shrink-0">
        <div className="mb-2 px-2 text-xs uppercase tracking-wider text-gray-500">Categories</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable]">
        <ul className="space-y-1 pr-1 pt-1">
          {items.map((it) => {
            const active = it.key === selectedFolder;
            return (
              <li key={it.key}>
                <button
                  onClick={() => onSelect?.(it.key)}
                  className={[
                    'w-full flex items-center text-left gap-2 rounded-lg px-2 py-2 text-sm',
                    'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-600',
                    active
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                      : 'text-gray-700',
                  ].join(' ')}
                  title={`${it.name} (${it.count})`}
                >
                  <Folder className={`h-4 w-4 ${active ? 'text-emerald-700' : 'text-gray-400'}`} />
                  <span className="truncate flex-1">{it.name}</span>
                  <span
                    className={[
                      'ml-2 rounded-full px-2 py-0.5 text-[11px]',
                      active ? 'bg-white text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700',
                    ].join(' ')}
                  >
                    {it.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
