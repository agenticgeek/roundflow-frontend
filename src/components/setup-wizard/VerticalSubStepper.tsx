import { cn } from '@/lib/utils'

interface VerticalSubStepperProps {
  steps: readonly { label: string }[]
  currentIndex: number
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a.75.75 0 0 1 .006 1.06l-7.25 7.5a.75.75 0 0 1-1.083 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.946 2.946 6.72-6.95a.75.75 0 0 1 1.06-.006Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Vertical progress stepper for multi-panel flows (e.g. add property). */
export function VerticalSubStepper({ steps, currentIndex }: VerticalSubStepperProps) {
  return (
    <nav aria-label="Progress" className="hidden shrink-0 sm:block">
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex
          const isActive = index === currentIndex

          return (
            <li key={step.label} className="flex items-start gap-0">
              <div className="flex flex-col items-center">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                    isComplete && 'bg-primary text-primary-foreground',
                    isActive && !isComplete && 'border border-border bg-background text-muted',
                    !isActive && !isComplete && 'border border-border bg-background text-muted',
                  )}
                >
                  {isComplete ? <CheckIcon /> : step.label}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'my-1 h-8 w-px',
                      isComplete ? 'bg-primary' : 'bg-border',
                    )}
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
