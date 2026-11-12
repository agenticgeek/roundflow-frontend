import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { OUTLINE_CONTROL } from '@/components/flo/flo-styles'

/** Suggested next questions as buttons. They send the question exactly as the server wrote it. */
export function FollowUps({
  items,
  title = floContent.followUps.title,
  disabled = false,
  onAsk,
}: {
  items: readonly string[]
  title?: string
  disabled?: boolean
  onAsk: (question: string) => void
}) {
  return (
    <section aria-label={title}>
      <h3 className="text-[13px] font-medium tracking-[0.08em] text-muted-strong uppercase">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <li key={item} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(item)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-left text-sm ${OUTLINE_CONTROL}`}
            >
              {item}
              <DashboardIcon name="arrow-right" className="h-4 w-4 shrink-0 text-muted-strong" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
