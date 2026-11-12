import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'

/** Shown when the server could not match some figures in the prose to your data. */
export function UnverifiedNotice() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-surface px-3.5 py-2.5 text-sm text-warning-foreground">
      <DashboardIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {floContent.unverified.notice}
    </p>
  )
}
