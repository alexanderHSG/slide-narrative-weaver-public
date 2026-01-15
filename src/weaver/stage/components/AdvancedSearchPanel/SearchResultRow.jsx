import SlideThumbnail from '../AdvancedSearchPanel/SlideThumbnail';

export default function SearchResultRow({ result, onRowClick, onPreview }) {
  return (
    <div
      key={result.id}
      draggable
      onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(result))}
      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-3"
      onClick={onRowClick}
    >
      <SlideThumbnail
        objectId={result.object_id}
        width={150}
        height={150}
        fit="contain"
        onClick={() => onPreview?.()}
      />

      <div className="flex-1">
        {!!result.type && (
          <span className="text-xs text-green-600 font-medium">
            {String(result.type).toUpperCase()}
          </span>
        )}
        <p className="text-sm px-1 text-gray-600 mt-1 line-clamp-2 overflow-hidden text-ellipsis max-w-[140px]">
          {result.title}
        </p>
        <span className="text-xs px-1 text-gray-500 whitespace-nowrap">
          {Math.round((result.similarity || 0) * 100)}% match
        </span>
      </div>
    </div>
  );
}
