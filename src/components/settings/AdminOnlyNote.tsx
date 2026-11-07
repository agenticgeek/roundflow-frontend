import { cn } from '@/lib/utils'

/**
 * Visible explanation for a control a MANAGER cannot use (`403 ADMIN_ONLY`). Point the disabled
 * control at it with `aria-describedby={id}` so screen reader users hear the reason too.
 */
export function AdminOnlyNote({ id, children, className }: { id?: string; children: string; className?: string }) {
  return (
    <p id={id} className={cn('flex items-start gap-2 text-sm text-muted', className)}>
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0">
        <path d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6H8V5a2 2 0 1 1 4 0v2Z" />
      </svg>
      <span>{children}</span>
    </p>
  )
}
