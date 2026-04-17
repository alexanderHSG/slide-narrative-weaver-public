import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const NavigationControls = ({ networkRef }) => {
  const handleMove = direction => {
    if (networkRef?.current) {
      const currentPosition = networkRef.current.getViewPosition();
      const moveDistance = 100;
      let x = currentPosition.x;
      let y = currentPosition.y;

      switch (direction) {
        case 'left':
          x += moveDistance;
          break;
        case 'right':
          x -= moveDistance;
          break;
        case 'up':
          y += moveDistance;
          break;
        case 'down':
          y -= moveDistance;
          break;
        default:
          break;
      }

      networkRef.current.moveTo({
        position: { x, y },
        animation: {
          duration: 300,
          easingFunction: 'easeInOutQuad',
        },
      });
    }
  };
  return (
    <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-2 z-10">
      <div className="flex flex-col items-center gap-1">
        <button
          className="p-2 text-black hover:bg-gray-100 rounded"
          onClick={() => handleMove('down')}
          title="Move Up"
        >
          <ArrowUp size={20} />
        </button>
        <div className="flex items-center space-x-1">
          <button
            className="p-2 text-black hover:bg-gray-100 rounded"
            onClick={() => handleMove('right')}
            title="Move Left"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            className="p-2 text-black hover:bg-gray-100 rounded"
            onClick={() => handleMove('left')}
            title="Move Right"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        <button
          className="p-2 text-black hover:bg-gray-100 rounded"
          onClick={() => handleMove('up')}
          title="Move Down"
        >
          <ArrowDown size={20} />
        </button>
      </div>
    </div>
  );
};

export default NavigationControls;