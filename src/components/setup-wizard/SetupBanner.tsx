import { setupWizardContent } from '@/content/setup-wizard'
import { SetupStepper } from '@/components/setup-wizard/SetupStepper'

interface SetupBannerProps {
  currentIndex: number
  completedSteps?: boolean[]
  onSkip?: () => void
  onStepClick?: (index: number) => void
}

/** Setup wizard top banner — title, subtitle, skip action, and horizontal stepper. */
export function SetupBanner({ currentIndex, completedSteps, onSkip, onStepClick }: SetupBannerProps) {
  const { title, subtitle, footer } = setupWizardContent

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">
              {title}
            </h1>
            <p className="mt-1 text-[15px] text-muted sm:text-base">{subtitle}</p>
          </div>

          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface hover:text-muted"
            >
              {footer.skip}
            </button>
          ) : null}
        </header>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
          <SetupStepper
            currentIndex={currentIndex}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
          />
        </div>
      </div>
    </div>
  )
}
