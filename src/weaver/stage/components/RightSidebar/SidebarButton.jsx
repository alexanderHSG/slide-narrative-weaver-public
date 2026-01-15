const SidebarButton = ({
  icon: Icon,
  onClick,
  tooltip,
  title,
  className = '',
  disable,
}) => (
  <button
    onClick={onClick}
    title={title} 
    className={`p-3 rounded-lg hover:bg-gray-100 text-gray-600 relative group ${className} ${
      disable
        ? 'cursor-not-allowed opacity-50'
        : 'hover:bg-gray-100 text-gray-600'
    }`}
  >
    <Icon size={20} />
    {tooltip && (
      <div className={`
        absolute
        top-1/2
        right-full
        -translate-y-1/2
        mr-3
        hidden
        group-hover:block
        bg-black
        text-white
        text-xs
        px-2
        py-1
        rounded
        whitespace-nowrap
        z-50`
      }
      >
        {tooltip}
      </div>
    )}
  </button>
);

export default SidebarButton;
