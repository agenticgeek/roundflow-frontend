import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { getSetupProgress } from '@/features/setup/lib/wizard'
import {
  dismissSetupCard,
  isSetupCardDismissed,
} from '@/lib/setup-deferred'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

/** Dashboard card — live setup progress until the wizard is completed. */
export function WorkspaceSetupCard() {
  const { setupStatus, setupCompleted } = useAppBootstrap()
  const [dismissed, setDismissed] = useState(() => isSetupCardDismissed())

  if (setupCompleted || !setupStatus || dismissed) return null

  const { percent, continueStep } = getSetupProgress(setupStatus)

  function handleDismiss() {
    dismissSetupCard()
    setDismissed(true)
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-label="Workspace setup progress"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          Workspace Setup — {percent}% Complete
        </h2>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss setup progress"
          className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          to={`${ROUTES.setupWizard}?step=${continueStep}`}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary',
            'transition-opacity hover:opacity-80',
          )}
        >
          <span aria-hidden="true">+</span>
          Continue to Setup
        </Link>
      </div>
    </section>
  )
}
