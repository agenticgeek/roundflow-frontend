import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { site } from '@/content/site'
import { cn } from '@/lib/utils'

export interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Optional badge rendered beside the title (e.g. status chip). */
  titleBadge?: ReactNode
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
  widthClass?: string
  className?: string
  bodyClassName?: string
  footerClassName?: string
}

/**
 * Global right-side drawer.
 *
 * Use this for contextual detail panels that should not fully interrupt the
 * current screen, such as calendar item details, customer previews, or side
 * actions. The component owns the overlay, Escape-key close behavior, body
 * scroll lock, fixed header/footer regions, and a custom scrollable body so
 * feature modules only provide content.
 */
export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  titleBadge,
  children,
  footer,
  closeLabel = site.ui.closeDialog,
  widthClass = 'max-w-md',
  className,
  bodyClassName,
  footerClassName,
}: SidePanelProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'animate-slide-in-right absolute inset-y-0 right-0 flex h-full w-full flex-col overflow-hidden border-l border-border bg-background shadow-2xl',
          widthClass,
          className,
        )}
      >
        <header className="shrink-0 border-b border-border px-5 py-4 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {titleBadge}
          </div>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </header>

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <div
          className={cn(
            'scrollbar-card min-h-0 flex-1 overflow-y-auto px-5 py-4',
            footer && 'pb-6',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <footer
            className={cn(
              'relative z-10 shrink-0 border-t border-border bg-background px-5 py-4 shadow-[0_-10px_30px_rgba(10,10,10,0.08)]',
              footerClassName,
            )}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  )
}
