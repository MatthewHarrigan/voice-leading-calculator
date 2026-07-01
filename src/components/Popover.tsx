// A minimal disclosure popover: a trigger button that toggles a floating
// panel, closed by an outside click or Escape. Used for the header settings
// and the chart Export menu — action menus and switch clusters, not modals.

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Popover({
  label,
  title,
  align = 'left',
  testid,
  children,
}: {
  /** Trigger button content. */
  label: ReactNode;
  /** Tooltip / accessible label for the trigger. */
  title?: string;
  align?: 'left' | 'right';
  testid?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="popover-root" ref={rootRef}>
      <button
        type="button"
        className={`btn btn-sm popover-trigger${open ? ' active' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        title={title}
        data-testid={testid}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && <div className={`popover-panel popover-${align}`}>{children}</div>}
    </div>
  );
}
