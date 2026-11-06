import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatThreadView } from '@/components/chat/ChatThreadView'
import { Select } from '@/components/ui'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { ROUTES } from '@/config/routes'
import { chatContent } from '@/content/chat'
import { useChatThreads } from '@/features/chat/hooks/useChat'
import { useTechnicianRounds, type TechnicianRoundOption } from '@/features/chat/hooks/useTechnicianRounds'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

/** One chat tab: a round that already has a thread, or one the admin is about to start. */
interface ChatTab {
  roundId: string
  roundName: string
  unreadCount: number
}

/** Round picker + button that opens a round's chat even before its first message (CHAT-01). */
function StartConversation({
  rounds,
  compact,
  onStart,
}: {
  rounds: readonly TechnicianRoundOption[]
  compact: boolean
  onStart: (roundId: string) => void
}) {
  const copy = chatContent.start
  const labelId = useId()
  const [picked, setPicked] = useState('')
  const options = [{ value: '', label: copy.roundPlaceholder }, ...rounds.map((round) => ({ value: round.id, label: round.name }))]

  return (
    <section
      aria-label={compact ? copy.another : copy.title}
      className={cn(!compact && 'space-y-4 rounded-xl border border-dashed border-border p-6')}
    >
      {compact ? null : (
        <div>
          <h2 className="text-base font-semibold text-foreground">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted">{copy.description}</p>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem]">
          <span id={labelId} className="mb-1.5 block text-xs font-medium text-foreground">
            {compact ? copy.another : copy.roundLabel}
          </span>
          <Select inputSize="sm" aria-labelledby={labelId} value={picked} options={options} onChange={(event) => setPicked(event.target.value)} />
        </div>
        <button
          type="button"
          disabled={!picked}
          onClick={() => onStart(picked)}
          className={cn(dashboardCtaClass, 'px-4 py-2 text-sm disabled:opacity-60')}
        >
          {copy.button}
        </button>
      </div>
    </section>
  )
}

/**
 * A technician's Conversation tab: the chat threads of the rounds they work, with unread
 * counts — and (CHAT-01) a way to start one. `GET /chat/threads` only lists rounds that already
 * have a message, so the rounds without one are offered in a picker; the first message sent
 * creates the thread. `initialRoundId` opens a given round straight away (`?round=`).
 */
export function TechnicianChat({ technicianId, initialRoundId }: { technicianId: string; initialRoundId?: string }) {
  const copy = chatContent
  const threadsQuery = useChatThreads()
  const technicianRounds = useTechnicianRounds(technicianId)
  const [selectedId, setSelectedId] = useState<string | null>(initialRoundId ?? null)
  const [draftId, setDraftId] = useState<string | null>(initialRoundId ?? null)

  const tabs: ChatTab[] = (threadsQuery.data?.threads ?? [])
    .filter((thread) => thread.technicians.some((technician) => technician.id === technicianId))
    .map((thread) => ({ roundId: thread.roundId, roundName: thread.roundName, unreadCount: thread.unreadCount }))
  const draft = technicianRounds.rounds.find((round) => round.id === draftId)
  if (draft && !tabs.some((tab) => tab.roundId === draft.id)) {
    tabs.push({ roundId: draft.id, roundName: draft.name, unreadCount: 0 })
  }
  const selected = tabs.find((tab) => tab.roundId === selectedId) ?? tabs[0]
  const startable = technicianRounds.rounds.filter((round) => !tabs.some((tab) => tab.roundId === round.id))

  function start(roundId: string) {
    setDraftId(roundId)
    setSelectedId(roundId)
  }

  if (threadsQuery.isPending) return <p className="text-sm text-muted">{copy.threadsLoading}</p>
  if (threadsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {errorMessage(threadsQuery.error)}
      </p>
    )
  }
  if (!selected) {
    if (technicianRounds.isPending) return <p className="text-sm text-muted">{copy.start.loadingRounds}</p>
    if (technicianRounds.isError) {
      return (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(technicianRounds.error)}
        </p>
      )
    }
    if (startable.length === 0) {
      return (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          <p>{copy.start.noRounds}</p>
          <Link to={ROUTES.roundPlannerAssign} className="font-semibold text-foreground underline underline-offset-2">
            {copy.start.assign}
          </Link>
        </div>
      )
    }
    return <StartConversation rounds={startable} compact={false} onStart={start} />
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={copy.threadsTitle} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.roundId}
            type="button"
            role="tab"
            aria-selected={tab.roundId === selected.roundId}
            onClick={() => setSelectedId(tab.roundId)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              tab.roundId === selected.roundId
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted hover:bg-surface',
            )}
          >
            {tab.roundName}
            {tab.unreadCount > 0 ? (
              <span
                aria-label={copy.unread.replace('{count}', String(tab.unreadCount))}
                className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
              >
                {tab.unreadCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {startable.length > 0 ? <StartConversation key={startable.length} rounds={startable} compact onStart={start} /> : null}
      <ChatThreadView key={selected.roundId} roundId={selected.roundId} roundName={selected.roundName} />
    </div>
  )
}
