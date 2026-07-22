import { useEffect } from 'react'
import { SETUP_STEPS } from '@/config/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { useHorizontalScroll } from '@/hooks/use-horizontal-scroll'
import { ScrollArrowButton } from '@/components/ui/scroll-arrow-button'
import { cn } from '@/lib/utils'

interface SetupStepperProps {
  currentIndex: number
  completedSteps?: boolean[]
}

export function SetupStepper({ currentIndex, completedSteps }: SetupStepperProps) {
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
          className={cn('flex w-max items-center gap-6 sm:gap-8 lg:gap-10', transitionClass)}
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {SETUP_STEPS.map((step, index) => {
            const isActive = index === currentIndex
            const isComplete = completedSteps?.[index] ?? index < currentIndex

            return (
              <li
                key={step.id}
                data-step-index={index}
                className="flex shrink-0 items-center gap-2.5"
              >
                <span
                  aria-current={isActive ? 'step' : undefined}
                  aria-hidden="true"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300',
                    isActive && 'bg-primary text-primary-foreground',
                    !isActive && 'bg-surface text-muted',
                    isComplete && !isActive && 'bg-primary/10 text-primary',
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-sm transition-colors duration-300 sm:text-[15px]',
                    isActive ? 'font-semibold text-foreground' : 'font-normal text-foreground',
                  )}
                >
                  {step.label}
                </span>
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
