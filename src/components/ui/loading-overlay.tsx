import { useEffect, useState, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

/** Loads quicker than this never show the overlay, so fast responses don't flash. */
const SHOW_DELAY_MS = 150

/**
 * Fades `children` and shows a circular loader in the middle of the screen while `loading`
 * — for refreshes where the old content stays on screen (paging, filtering).
 */
export function LoadingOverlay({
  loading,
  label = 'Loading…',
  children,
  className,
}: {
  loading: boolean
  label?: string
  children: ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!loading) {
      setVisible(false)
      return
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  return (
    <div className={cn('relative', className)} aria-busy={loading || undefined}>
      <div
        className={cn(
          'transition-opacity duration-200',
          visible && 'pointer-events-none opacity-40 select-none',
        )}
      >
        {children}
      </div>

      {visible ? (
        <div className="pointer-events-none fixed inset-0 z-30 grid place-items-center">
          <div
            role="status"
            className="flex animate-fade-in flex-col items-center gap-3 rounded-2xl border border-border bg-card/95 px-7 py-6 shadow-lg backdrop-blur-sm"
          >
            <Spinner className="h-9 w-9 text-primary" />
            <span className="text-sm font-medium text-muted">{label}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
