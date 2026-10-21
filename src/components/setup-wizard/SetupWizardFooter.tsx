import { setupWizardContent } from '@/content/setup-wizard'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface SetupWizardFooterProps {
  currentStep: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  onBack: () => void
  onContinue: () => void
  onSkipStep?: () => void
  loading?: boolean
  continueLabel?: string
  continueDisabled?: boolean
  /** The step finishes with its own action (Activate) — no Continue in the footer. */
  hideContinue?: boolean
}

export function SetupWizardFooter({
  currentStep,
  totalSteps,
  isFirstStep,
  isLastStep,
  onBack,
  onContinue,
  onSkipStep,
  loading,
  continueLabel,
  continueDisabled,
  hideContinue = false,
}: SetupWizardFooterProps) {
  const { footer } = setupWizardContent
  const stepLabel = footer.stepLabel
    .replace('{current}', String(currentStep))
    .replace('{total}', String(totalSteps))
  const resolvedContinueLabel =
    continueLabel ?? (isLastStep ? footer.launch : footer.continue)
  const showSkipStep = Boolean(onSkipStep) && !isLastStep

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className={cn(
            'inline-flex items-center gap-1.5 justify-self-start text-sm font-medium transition-colors sm:text-[15px]',
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

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm text-muted sm:text-[15px]">{stepLabel}</span>
          {showSkipStep ? (
            <button
              type="button"
              onClick={onSkipStep}
              disabled={loading}
              className="text-xs font-medium text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {footer.skipStep}
            </button>
          ) : null}
        </div>

        {hideContinue ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={onContinue}
            disabled={loading || continueDisabled}
            className="inline-flex items-center gap-2 justify-self-end rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[15px]"
          >
            {resolvedContinueLabel}
            {loading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
