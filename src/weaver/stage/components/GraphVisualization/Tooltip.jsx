import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

export function Tooltip({ content, children, customPosition }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, yAbove: 0 });
  const anchorRef = useRef();

  const handleMouseEnter = (e) => {
    if (customPosition) {
      setPos(customPosition);
      setShow(true);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      yAbove: rect.top - 8,
    });
    setShow(true);
  };

  const handleMouseLeave = () => setShow(false);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: "relative" }}
      >
        {children}
      </span>
      {(show || customPosition) && content && createPortal(
        <TooltipBubble content={content} pos={pos} anchorRef={anchorRef} customPosition={customPosition} />,
        document.body
      )}
    </>
  );
}

function TooltipBubble({ content, pos, anchorRef, customPosition }) {
  const [placement, setPlacement] = useState("bottom");
  const bubbleRef = useRef();

  React.useLayoutEffect(() => {
    if (bubbleRef.current && !customPosition) {
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - pos.y;
      if (spaceBelow < bubbleRect.height + 16 && pos.yAbove > bubbleRect.height) {
        setPlacement("top");
      } else {
        setPlacement("bottom");
      }
    }
  }, [pos, customPosition]);

  const style = customPosition
    ? {
        position: "fixed",
        left: customPosition.x,
        top: customPosition.y,
        transform: "translate(-50%, -10%)",
        zIndex: 9999,
        pointerEvents: "none",
        width: 250,
        minHeight: 50,
      }
    : {
        position: "fixed",
        left: pos.x,
        top: placement === "bottom" ? pos.y : undefined,
        bottom: placement === "top" ? window.innerHeight - pos.yAbove + 20 : undefined,
        transform: "translate(-50%, 15%)",
        zIndex: 9999,
        pointerEvents: "none",
      };

  return (
    <div
      ref={bubbleRef}
      style={style}
      className="
        w-[250px] px-4 py-2 bg-white border border-green-400
        rounded-xl shadow-xl text-green-900 text-sm font-semibold 
        leading-snug animate-fadeIn
      "
    >
      <span className="text-green-950 font-bold tracking-wide text-md block mb-1 italic">
        Inspira AI: Slide To Storypoint Fit
      </span>
      <span>{content}</span>
    </div>
  );
}
