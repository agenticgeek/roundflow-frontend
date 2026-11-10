import type { FloSuggestionGroup } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { FollowUps } from '@/components/flo/FollowUps'

/** The empty state: the server's suggested questions by area. Tapping one asks it. */
export function SuggestionGrid({
  groups,
  loading,
  disabled,
  onAsk,
}: {
  groups: readonly FloSuggestionGroup[]
  loading: boolean
  disabled: boolean
  onAsk: (question: string) => void
}) {
  return (
    <div className="space-y-4 py-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{floContent.empty.title}</h2>
        <p className="text-sm text-muted">{loading ? floContent.empty.loading : floContent.empty.hint}</p>
      </div>
      {groups.map((group) => (
        <FollowUps key={group.area} title={group.area} items={group.questions} disabled={disabled} onAsk={onAsk} />
      ))}
    </div>
  )
}
