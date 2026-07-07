import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils.js';

export default function SidebarTooltip({ children, label, disabled }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const show = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      }
      setVisible(true);
    }, 400);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="relative"
    >
      {children}
      {visible && !disabled && (
        <div
          role="tooltip"
          className={cn(
            "fixed z-[9999] px-2.5 py-1.5 text-xs font-medium text-popover-foreground",
            "bg-popover rounded-md shadow-lg pointer-events-none",
            "border border-border",
            "animate-in fade-in-0 zoom-in-95",
            "whitespace-nowrap"
          )}
          style={{ top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
        >
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-popover rotate-45 border-l border-t border-border" />
        </div>
      )}
    </div>
  );
}
