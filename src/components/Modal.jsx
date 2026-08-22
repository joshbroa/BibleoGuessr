import { useEffect, useRef } from 'react';

/**
 * Accessible modal dialog: focus moves in on open, Escape closes, and focus is
 * trapped inside while it is up.
 */
export default function Modal({ open, onClose, title, children, labelledBy = 'modal-title' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Held in a ref so the effects below can depend on `open` alone. Callers
  // almost always pass an inline arrow function, which changes identity on
  // every render — and a focus effect that re-runs on every render yanks the
  // caret back to the first field on every single keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Move focus into the dialog once, when it opens.
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    panelRef.current?.querySelector('input, button, [tabindex]')?.focus?.();

    return () => previouslyFocused.current?.focus?.();
  }, [open]);

  // Keep focus inside the dialog, and close it on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="panel relative z-10 w-full max-w-md animate-fade-up"
      >
        <h2 id={labelledBy} className="mb-4 font-display text-xl font-bold text-parchment-50">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
