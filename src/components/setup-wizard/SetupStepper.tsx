import { useEffect } from 'react'
import { SETUP_STEPS } from '@/config/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { useHorizontalScroll } from '@/hooks/use-horizontal-scroll'
import { ScrollArrowButton } from '@/components/ui/scroll-arrow-button'
import { cn } from '@/lib/utils'

interface SetupStepperProps {
  currentIndex: number
  completedSteps?: boolean[]
  onStepClick?: (index: number) => void
}

export function SetupStepper({ currentIndex, completedSteps, onStepClick }: SetupStepperProps) {
  const { stepper } = setupWizardContent
  const {
    trackRef,
    containerRef,
    offset,
    canScrollStart,
    canScrollEnd,
    scrollNext,
    scrollPrev,
    scrollItemIntoView,
    transitionClass,
  } = useHorizontalScroll<HTMLOListElement, HTMLDivElement>()

  useEffect(() => {
    scrollItemIntoView(`[data-step-index="${currentIndex}"]`)
  }, [currentIndex, scrollItemIntoView])

  return (
    <div className="flex items-center gap-2">
      <ScrollArrowButton
        direction="left"
        ariaLabel={stepper.showPreviousSteps}
        onClick={scrollPrev}
        visuallyHidden={!canScrollStart}
      />

      <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
        <ol
          ref={trackRef}
          className={cn('flex w-max items-center gap-5 sm:gap-6', transitionClass)}
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {SETUP_STEPS.map((step, index) => {
            const isActive = index === currentIndex
            const isComplete = completedSteps?.[index] ?? index < currentIndex

            return (
              <li key={step.id} data-step-index={index} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  disabled={!onStepClick}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 transition-opacity',
                    onStepClick && 'cursor-pointer hover:opacity-75',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors duration-300',
                      isActive && 'bg-primary text-primary-foreground',
                      !isActive && 'bg-border/70 text-muted',
                      isComplete && !isActive && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {isComplete && !isActive ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
                        <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap text-sm transition-colors duration-300 sm:text-[15px]',
                      isActive || isComplete ? 'font-medium text-foreground' : 'font-normal text-muted',
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <ScrollArrowButton
        direction="right"
        ariaLabel={stepper.showNextSteps}
        onClick={scrollNext}
        visuallyHidden={!canScrollEnd}
      />
    </div>
  )
}
