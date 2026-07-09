import { setupWizardContent } from '@/content/setup-wizard'
import { cn } from '@/lib/utils'

interface SetupWizardFooterProps {
  currentStep: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  onBack: () => void
  onContinue: () => void
  onSkip: () => void
  loading?: boolean
}

export function SetupWizardFooter({
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  onBack,
  onContinue,
  onSkip,
  loading,
}: SetupWizardFooterProps) {
  const { footer } = setupWizardContent
  const stepLabel = footer.stepLabel
    .replace('{current}', String(currentStep))
    .replace('{total}', String(totalSteps))
  const continueLabel = isLastStep ? footer.launch : footer.continue

  return (
    <div className="mt-8 flex items-center justify-between pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn(
          'text-sm font-medium transition-colors',
          isFirstStep ? 'cursor-not-allowed text-muted/50' : 'text-muted hover:text-foreground',
        )}
      >
        {footer.back}
      </button>

      <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-4">
        <span className="text-sm text-muted">{stepLabel}</span>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-muted"
        >
          {footer.skip}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {continueLabel}
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
