import { useEffect, useRef } from "react";

/** Keep keyboard focus in a modal and return it to the trigger when dismissed. */
export function useDialogAccessibility(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, textarea, select, iframe, [tabindex="0"]',
        ) ?? [],
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") && element.getClientRects().length,
      );
    // Make everything outside the dialog inert, so focus cannot leave it even
    // from inside an embedded frame (the cal.com booking iframe swallows the
    // Tab key events the trap below relies on). Toasts stay live.
    const inerted: HTMLElement[] = [];
    for (let node: HTMLElement | null = ref.current; node?.parentElement; node = node.parentElement) {
      if (node === document.body) break;
      for (const sibling of Array.from(node.parentElement.children)) {
        if (
          sibling === node ||
          !(sibling instanceof HTMLElement) ||
          sibling.inert ||
          sibling.matches("script, style, [role='status'], [role='alert']") ||
          sibling.querySelector(":scope > [role='status'], :scope > [role='alert']")
        )
          continue;
        sibling.inert = true;
        inerted.push(sibling);
      }
    }
    const timer = window.setTimeout(() => focusable()[0]?.focus(), 0);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable(),
        first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      // Restore the page before returning focus: an inert trigger can't take it.
      inerted.forEach((element) => {
        element.inert = false;
      });
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open]);
  return ref;
}
