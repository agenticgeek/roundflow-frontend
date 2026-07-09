import { setupWizardContent } from '@/content/setup-wizard'
import { SetupStepper } from '@/components/setup-wizard/SetupStepper'

interface SetupBannerProps {
  currentIndex: number
}

/** Setup wizard top banner — title, subtitle, and horizontal stepper. */
export function SetupBanner({ currentIndex }: SetupBannerProps) {
  const { title, subtitle } = setupWizardContent

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
            {title}
          </h1>
          <p className="mt-1.5 text-[15px] text-muted sm:text-base">{subtitle}</p>
        </header>

        <div className="mt-6 sm:mt-8">
          <SetupStepper currentIndex={currentIndex} />
        </div>
      </div>
    </div>
  )
}
