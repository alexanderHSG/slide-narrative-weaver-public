import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CanvasThumb from './CanvasThumb';

export default function SelectedSlideCard({ item, index, onRemove }) {
  if (!item || !item.key) return null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.key });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, border: 'none', outline: '0' }}
      className={[
        'group relative rounded-xl bg-white overflow-hidden transform-gpu',
        'outline-none ring-0 border-0',
        isDragging ? 'shadow-2xl shadow-emerald-300/40' : 'shadow-sm hover:shadow-md transition-shadow'
      ].join(' ')}
      data-scid={item.key}
    >
      <div className="absolute top-2 left-2 z-20">
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold grid place-items-center shadow">
          {index + 1}
        </div>
      </div>

      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-10 z-20 p-2 mr-0.5 rounded-md bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {onRemove && (
        <button
          onClick={() => onRemove(item.key)}
          className="absolute top-2 right-2 z-20 p-2 rounded-md bg-white/95 hover:bg-white text-red-600 border border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <CanvasThumb objectId={item.object_id} alt={item.title || 'Selected slide'} />

      <div className="p-3 space-y-1">
        <div className="text-sm font-semibold text-slate-900 truncate" title={item.title || 'Untitled'}>
          {item.title || 'Untitled'}
        </div>
        <div className="text-xs text-slate-500 truncate" title={item.deckTitle || 'Deck'}>
          {item.deckTitle || 'Deck'}
        </div>
      </div>
    </div>
  );
}
