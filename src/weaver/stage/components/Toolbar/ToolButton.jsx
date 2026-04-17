
const ToolButton = ({ 
  icon: Icon, 
  active, 
  onClick, 
  disabled, 
  tooltip,
  text,
  className, 
}) => (
  <div className="relative group">
    <button
      className={`flex items-center p-2 w-full rounded transition-colors ${
        active
          ? 'bg-green-100 text-green-900'
          : disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-black hover:bg-green-100'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={20} />
      {text && <span className={`ml-2 ${className}`}>{text}</span>}
    </button>
    {tooltip && (
      <div className="
        absolute bottom-full mb-2 hidden 
        group-hover:block bg-gray-800 
        text-white text-xs px-2 py-1 rounded"
      >
        {tooltip}
      </div>
    )}
  </div>
);

export default ToolButton;
