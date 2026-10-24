import { useId, useState, type ReactNode } from "react";

/**
 * On phones, keeps secondary copy folded behind one tap so the main message
 * reads first. On larger screens everything shows and the toggle is hidden.
 */
export function MobileMore({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mobile-more" data-open={open ? "true" : "false"}>
      <div className="mobile-more-body" id={id}>
        {children}
      </div>
      <button
        type="button"
        className="mobile-more-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Show less" : label}
      </button>
    </div>
  );
}
