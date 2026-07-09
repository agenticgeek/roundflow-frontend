import { setupWizardContent } from '@/content/setup-wizard'

export function PlaceholderStep() {
  const { placeholders } = setupWizardContent

  return (
    <div className="flex min-h-[20rem] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-lg font-semibold text-foreground">{placeholders.comingSoonTitle}</p>
      <p className="mt-2 max-w-sm text-sm text-muted">{placeholders.comingSoonBody}</p>
    </div>
  )
}
