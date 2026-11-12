import type { FloDeclined } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { FollowUps } from '@/components/flo/FollowUps'

/** Flo said no. Fixed server copy and a few questions it can answer: calm, not an error. */
export function DeclinedNotice({
  declined,
  onAsk,
  disabled,
}: {
  declined: FloDeclined
  onAsk: (question: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <p className="flex items-start gap-2 text-sm font-medium text-foreground">
        <DashboardIcon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        {declined.text}
      </p>
      {declined.suggestions.length > 0 ? (
        <FollowUps items={declined.suggestions} title={floContent.declined.suggestionsTitle} disabled={disabled} onAsk={onAsk} />
      ) : null}
    </div>
  )
}
