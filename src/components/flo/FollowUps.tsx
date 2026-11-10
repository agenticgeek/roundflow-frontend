import { floContent } from '@/content/flo'

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
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(item)}
              className="min-h-8 rounded-full border border-border bg-background px-3 py-1 text-left text-sm text-foreground transition-colors hover:bg-accent-surface disabled:opacity-50"
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
