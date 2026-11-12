import type { FloSuggestionGroup } from '@/api/flo.api'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { FollowUps } from '@/components/flo/FollowUps'
import { OUTLINE_CONTROL } from '@/components/flo/flo-styles'

/**
 * Under the question box before a conversation starts: area tags that start a question in the box,
 * then the server's suggested questions by area. Tapping a suggestion asks it.
 */
export function SuggestionGrid({
  groups,
  loading,
  disabled,
  onAsk,
  onPick,
}: {
  groups: readonly FloSuggestionGroup[]
  loading: boolean
  disabled: boolean
  onAsk: (question: string) => void
  /** An area tag was tapped: put its starter question in the box. */
  onPick?: (text: string) => void
}) {
  const copy = floContent.empty
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-[15px] text-muted-strong">{loading ? copy.loading : copy.hint}</p>
        {onPick ? (
          <ul aria-label={copy.areasTitle} className="flex flex-wrap justify-center gap-2">
            {copy.areas.map((area, index) => (
              <li key={area.label} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(area.starter)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm ${OUTLINE_CONTROL}`}
                >
                  <DashboardIcon name={area.icon} className="h-4 w-4 text-muted-strong" />
                  {area.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loading ? (
        <div aria-hidden="true" className="flex w-full flex-wrap justify-center gap-2">
          {[40, 56, 44, 52].map((width) => (
            <span key={width} className="h-10 animate-pulse rounded-full bg-hairline" style={{ width: `${width * 4}px` }} />
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="grid w-full gap-6 border-t border-hairline pt-6 sm:grid-cols-2">
          {groups.map((group) => (
            <FollowUps key={group.area} title={group.area} items={group.questions} disabled={disabled} onAsk={onAsk} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
