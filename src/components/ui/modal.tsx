import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Toggle } from '@/components/ui'
import { dashboardCtaShadowClass } from '@/components/dashboard/dashboard-styles'
import { site } from '@/content/site'
import { cn } from '@/lib/utils'

/** Cyan info panel — property details, summaries, etc. inside modals. */
export const modalInfoPanelClass =
  'rounded-lg border border-accent/25 bg-accent-surface px-4 py-3'

/** Square inputs inside modals — matches sharp modal shell. */
export const modalInputClass = 'rounded-none bg-card'

/** Amber warning callout inside modals. */
export const modalWarningPanelClass =
  'rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-foreground'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /** Max width utility — defaults to `max-w-lg`. */
  maxWidthClass?: string
  closeLabel?: string
  showCloseButton?: boolean
  /** `compact` tightens padding, type scale, and spacing. */
  size?: 'default' | 'compact'
  /** Hide the built-in title header — use for custom in-body headers. */
  showHeader?: boolean
  bodyClassName?: string
  /** Extra classes on the dialog panel. */
  className?: string
  /** Pin header/footer; scroll only the body with a slim custom scrollbar. */
  stacked?: boolean
  headerClassName?: string
  footerClassName?: string
}

/**
 * Reusable modal shell — overlay, square panel, title header,
 * body slot, and optional footer. Pass content as children; wire actions in footer.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  closeLabel = site.ui.closeDialog,
  size = 'default',
  showCloseButton = false,
  showHeader = true,
  bodyClassName,
  className,
  stacked = false,
  headerClassName,
  footerClassName,
}: ModalProps) {
  const isCompact = size === 'compact'
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-5">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-foreground/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full animate-fade-in-up rounded-none bg-card shadow-xl',
          stacked
            ? 'flex max-h-[min(92dvh,36rem)] flex-col overflow-hidden'
            : 'max-h-[min(100dvh-1.5rem,900px)] overflow-y-auto',
          !stacked && (isCompact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'),
          maxWidthClass,
          className,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn(
              'absolute z-10 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-foreground',
              stacked ? 'top-3.5 right-4' : 'top-4 right-4 sm:top-5 sm:right-5',
            )}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 1 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        ) : null}

        {showHeader ? (
          <header
            className={cn(
              'border-b border-border',
              stacked && 'shrink-0 px-5 py-3.5 pr-14',
              !stacked && (isCompact ? 'pb-3' : 'pb-4'),
              headerClassName,
            )}
          >
            <h2
              id={titleId}
              className={cn(
                'font-semibold text-foreground',
                isCompact ? 'text-base' : 'text-lg',
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className={cn('text-muted', isCompact ? 'mt-0.5 text-xs' : 'mt-1.5 text-sm')}>
                {subtitle}
              </p>
            ) : null}
          </header>
        ) : (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}

        <div
          className={cn(
            stacked && 'scrollbar-card min-h-0 flex-1 overflow-y-auto px-5 py-3',
            !stacked && showHeader && (isCompact ? 'mt-4' : 'mt-6'),
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              'border-t border-border',
              stacked
                ? 'shrink-0 px-5 py-3'
                : cn(isCompact ? 'mt-5 pt-4' : 'mt-6 pt-5', footerClassName),
              stacked && footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/** Right-aligned action row for modal footers. */
export function ModalFooter({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={cn('flex flex-wrap justify-end', compact ? 'gap-2' : 'gap-3')}>{children}</div>
}

export function ModalButton({
  variant = 'secondary',
  className,
  compact = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'secondary' | 'primary' | 'danger'
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-none font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-2.5 text-sm',
        variant === 'secondary' &&
          'border border-border bg-card text-foreground hover:bg-surface',
        variant === 'primary' &&
          cn('bg-primary text-primary-foreground hover:opacity-90', dashboardCtaShadowClass),
        variant === 'danger' && 'bg-danger text-primary-foreground hover:opacity-90',
        className,
      )}
      {...props}
    />
  )
}

/** Label + helper text on the left, toggle on the right — for modal forms. */
export function ModalToggleRow({
  label,
  description,
  checked,
  onChange,
  ariaLabel,
  compact = false,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
  compact?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>{label}</p>
        {description ? (
          <p className={cn('text-muted', compact ? 'mt-0.5 text-[11px] leading-snug' : 'mt-0.5 text-sm')}>
            {description}
          </p>
        ) : null}
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
    </div>
  )
}
