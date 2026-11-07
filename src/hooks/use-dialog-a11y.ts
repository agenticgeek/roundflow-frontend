import { useEffect, useRef } from 'react'

/**
 * Open dialogs, outermost first. Only the top one reacts to Escape and Tab, so closing a
 * confirmation on top of a modal leaves the modal open (WEB-13).
 */
const openDialogs: symbol[] = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => !element.closest('[hidden]'))
}

/**
 * Shared dialog behaviour for `Modal` and `SidePanel` (WEB-13, WCAG 2.4.3 / 2.1.2):
 *  - focus moves into the dialog on open (`[data-autofocus]`, else the first control, else the
 *    dialog itself) unless a child already took it with `autoFocus`;
 *  - Tab and Shift+Tab wrap inside the dialog;
 *  - Escape closes only the topmost dialog;
 *  - the rest of the page is `inert` while it is open (toast viewports stay usable);
 *  - focus returns to the element that opened it.
 *
 * Attach `rootRef` to the portal's outermost element and `dialogRef` to the element with
 * `role="dialog"` (give it `tabIndex={-1}`).
 */
export function useDialogA11y<Root extends HTMLElement = HTMLDivElement, Dialog extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
) {
  const rootRef = useRef<Root>(null)
  const dialogRef = useRef<Dialog>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const id = Symbol('dialog')
    openDialogs.push(id)
    const opener = document.activeElement as HTMLElement | null

    const inerted: Element[] = []
    for (const element of Array.from(document.body.children)) {
      if (element === rootRef.current || element.hasAttribute('inert') || element.hasAttribute('data-toast-viewport')) continue
      element.setAttribute('inert', '')
      inerted.push(element)
    }
    // Dialogs mounted in the same commit inert each other's roots first; this one stays usable.
    rootRef.current?.removeAttribute('inert')

    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      const target = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? focusableIn(dialog)[0] ?? dialog
      target.focus()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (openDialogs[openDialogs.length - 1] !== id) return
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const active = document.activeElement
      // Focus is in something portalled out of the dialog (a dropdown menu): leave it alone.
      if (active && active !== document.body && !dialog.contains(active)) return
      const focusable = focusableIn(dialog)
      const first = focusable[0] ?? dialog
      const last = focusable[focusable.length - 1] ?? dialog
      if (!active || active === document.body || active === dialog) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      openDialogs.splice(openDialogs.indexOf(id), 1)
      for (const element of inerted) element.removeAttribute('inert')
      // Give focus back to the opener — unless the user (or the action) already moved it on.
      const active = document.activeElement
      if (opener?.isConnected && (!active || active === document.body)) opener.focus()
    }
  }, [open])

  return { rootRef, dialogRef }
}
