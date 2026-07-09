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

/** Footer for internal multi-step flows — mirrors SetupWizardFooter with custom continue label. */
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
    <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
          isFirstStep ? 'cursor-not-allowed text-muted/50' : 'text-muted hover:text-foreground',
        )}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        {footer.back}
      </button>

      <span className="text-sm text-muted">{stepLabel}</span>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
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
  )
}
