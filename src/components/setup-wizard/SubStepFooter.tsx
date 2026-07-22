import { setupWizardContent } from '@/content/setup-wizard'
import { cn } from '@/lib/utils'

interface SubStepFooterProps {
  currentStep: number
  totalSteps: number
  isFirstStep: boolean
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
}

/** Footer for internal multi-step flows — card shell differentiates from the main wizard Continue. */
export function SubStepFooter({
  currentStep,
  totalSteps,
  isFirstStep,
  onBack,
  onContinue,
  continueLabel,
}: SubStepFooterProps) {
  const { footer } = setupWizardContent
  const stepLabel = footer.stepLabel
    .replace('{current}', String(currentStep))
    .replace('{total}', String(totalSteps))

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className={cn(
            'inline-flex items-center gap-1.5 justify-self-start text-sm font-medium transition-colors',
            isFirstStep ? 'cursor-not-allowed text-muted/50' : 'text-muted hover:text-foreground',
          )}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          {footer.back}
        </button>

        <span className="text-sm text-muted">{stepLabel}</span>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-2 justify-self-end rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          {continueLabel ?? footer.continue}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
