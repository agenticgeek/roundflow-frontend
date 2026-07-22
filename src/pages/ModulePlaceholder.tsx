import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { appShellContent } from '@/content/app-shell'
import { AppShell } from '@/components/app/AppShell'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import type { AppQuickActions } from '@/hooks/use-app-quick-actions'
import { isSetupDeferred } from '@/lib/setup-deferred'

interface ModulePlaceholderScreenProps {
  moduleId: string
}

function ModulePlaceholderScreen({ moduleId }: ModulePlaceholderScreenProps) {
  const navigate = useNavigate()
  const navItem = appShellContent.sidebar.nav.find((item) => item.id === moduleId)
  const title = navItem?.label ?? 'Module'
  const { backLabel } = appShellContent.modulePlaceholder
  const showSkippedSetupCard = moduleId === 'settings' && isSetupDeferred()

  function handleOpenSetup() {
    navigate(ROUTES.setupWizard)
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {showSkippedSetupCard ? (
        <PanelCard interactive={false}>
          <h1 className="text-xl font-semibold text-foreground">Finish Setup Wizard</h1>
          <p className="mt-2 text-sm text-muted">
            You skipped setup earlier. Open the wizard to finish your business profile, rounds,
            technicians, and services.
          </p>
          <button
            type="button"
            onClick={handleOpenSetup}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            Open Setup Wizard
          </button>
        </PanelCard>
      ) : null}

      <PanelCard interactive={false} className="text-center">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">This screen is coming soon.</p>
        <Link
          to={ROUTES.dashboard}
          className="mt-6 inline-flex text-sm font-semibold text-primary hover:text-primary/80"
        >
          {backLabel}
        </Link>
      </PanelCard>
    </div>
  )
}

interface ModulePlaceholderPageProps {
  moduleId: string
  quickActions: AppQuickActions
  onSignOut: () => void
  signingOut: boolean
}

/** Placeholder page wrapped in the app shell for upcoming modules. */
export function ModulePlaceholderPage({
  moduleId,
  quickActions,
  onSignOut,
  signingOut,
}: ModulePlaceholderPageProps) {
  return (
    <AppShell quickActions={quickActions} onSignOut={onSignOut} signingOut={signingOut}>
      <ModulePlaceholderScreen moduleId={moduleId} />
    </AppShell>
  )
}
