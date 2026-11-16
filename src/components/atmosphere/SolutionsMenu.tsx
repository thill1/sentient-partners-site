import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  SOLUTIONS_PANEL,
  hrefOnPage,
  type HeaderItem,
} from "../../content/siteNav";

export const SOLUTIONS_PANEL_ID = "solutions-panel";

export interface SolutionsMenuProps {
  /** The header item that opens the panel (its label is the button text). */
  item: HeaderItem;
  /** True on the homepage, where section links stay in-page. */
  isHome: boolean;
}

/**
 * The desktop "Solutions" item: a button that opens one flat panel listing
 * every solution, Relay and the capabilities overview. Single level, never
 * nested. Closes on Escape, on an outside click, when focus leaves, and when a
 * link is followed.
 */
export default function SolutionsMenu({ item, isHome }: SolutionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // Set when the panel is opened with the Down arrow, so focus moves into it.
  const focusFirstLink = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (focusFirstLink.current) {
      focusFirstLink.current = false;
      panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={wrapper}
      className="solutions-menu"
      onBlur={(event) => {
        // Focus moved somewhere outside the button and panel.
        if (!wrapper.current?.contains(event.relatedTarget)) close();
      }}
    >
      <button
        ref={button}
        type="button"
        className="solutions-menu-button"
        aria-expanded={open}
        aria-controls={SOLUTIONS_PANEL_ID}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          if (open) {
            panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
          } else {
            focusFirstLink.current = true;
            setOpen(true);
          }
        }}
      >
        {item.label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {/* tabIndex -1: a click on the panel's padding keeps focus inside the
          menu instead of blurring it shut. */}
      <div
        ref={panel}
        id={SOLUTIONS_PANEL_ID}
        className="solutions-panel"
        hidden={!open}
        tabIndex={-1}
      >
        <ul className="solutions-panel-links">
          {SOLUTIONS_PANEL.links.map((link) => (
            <li key={link.id}>
              <a href={hrefOnPage(link.href, isHome)} onClick={close}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <ul className="solutions-panel-footer">
          {SOLUTIONS_PANEL.footerLinks.map((link) => (
            <li key={link.id}>
              <a href={hrefOnPage(link.href, isHome)} onClick={close}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
