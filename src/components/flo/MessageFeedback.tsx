import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { floApi, type FloFeedbackBody, type FloRating } from '@/api/flo.api'
import { FOCUS_RING } from '@/components/flo/flo-styles'
import { useToast } from '@/components/ui/toast'
import { floContent } from '@/content/flo'
import { cn, fillCopy } from '@/lib/utils'

const THUMB_UP = ['M7 10v12', 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z']
const THUMB_DOWN = ['M17 14V2', 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z']

function Thumb({ paths, filled }: { paths: string[]; filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const THUMB_BUTTON = (pressed: boolean) =>
  cn(
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
    pressed ? 'border-primary bg-primary/[0.08] text-primary' : 'border-line bg-card text-muted-strong hover:border-primary hover:text-foreground',
    FOCUS_RING,
  )

/**
 * Thumbs up / down under a finished answer. A tap shows at once and is sent to the server; if saving fails
 * the thumb goes back and a toast says so. A thumbs-down offers an optional short comment (max 500).
 */
export function MessageFeedback({ messageId, rating: persisted }: { messageId: string; rating: FloRating | null }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState<FloRating | null>(persisted)
  const [comment, setComment] = useState<string | null>(null)
  const [thanked, setThanked] = useState(false)
  const save = useMutation({ mutationFn: (body: FloFeedbackBody) => floApi.feedback(messageId, body) })
  const failed = () => showToast(floContent.feedback.error, { tone: 'error' })

  function rate(next: FloRating) {
    if (next === rating) return
    const previous = rating
    setRating(next)
    setComment(next === 'DOWN' ? '' : null)
    setThanked(false)
    save.mutate(
      { rating: next },
      {
        onError: () => {
          setRating(previous)
          setComment(null)
          failed()
        },
      },
    )
  }

  function sendComment(draft: string) {
    const text = draft.trim()
    if (!text) {
      setComment(null)
      return
    }
    save.mutate(
      { rating: 'DOWN', comment: text },
      {
        onSuccess: () => {
          setComment(null)
          setThanked(true)
        },
        onError: failed,
      },
    )
  }

  const copy = floContent.feedback
  return (
    <div className="space-y-2">
      <div role="group" aria-label={copy.group} className="flex items-center gap-2">
        <button type="button" aria-label={copy.up} aria-pressed={rating === 'UP'} onClick={() => rate('UP')} className={THUMB_BUTTON(rating === 'UP')}>
          <Thumb paths={THUMB_UP} filled={rating === 'UP'} />
        </button>
        <button type="button" aria-label={copy.down} aria-pressed={rating === 'DOWN'} onClick={() => rate('DOWN')} className={THUMB_BUTTON(rating === 'DOWN')}>
          <Thumb paths={THUMB_DOWN} filled={rating === 'DOWN'} />
        </button>
      </div>
      {comment !== null ? (
        <form
          className="flex max-w-md flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            sendComment(comment)
          }}
        >
          <label htmlFor={`flo-feedback-${messageId}`} className="text-sm text-muted-strong">
            {copy.commentLabel}
          </label>
          <textarea
            id={`flo-feedback-${messageId}`}
            value={comment}
            maxLength={copy.commentMax}
            rows={2}
            placeholder={copy.commentPlaceholder}
            onChange={(event) => setComment(event.target.value)}
            className={`w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm text-foreground ${FOCUS_RING}`}
          />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={save.isPending} className={`min-h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50 ${FOCUS_RING}`}>
              {copy.send}
            </button>
            <button type="button" onClick={() => setComment(null)} className={`min-h-8 rounded-lg px-3 text-sm font-medium text-muted-strong hover:text-foreground ${FOCUS_RING}`}>
              {copy.skip}
            </button>
            <span className="ml-auto text-xs text-muted tabular-nums">{fillCopy(copy.commentCount, { count: comment.length, max: copy.commentMax })}</span>
          </div>
        </form>
      ) : null}
      <p role="status" className="text-xs text-muted">
        {thanked ? copy.commentSent : ''}
      </p>
    </div>
  )
}
