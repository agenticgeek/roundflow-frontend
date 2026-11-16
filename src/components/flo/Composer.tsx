import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref, type RefObject } from 'react'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { FOCUS_RING, OUTLINE_CONTROL } from '@/components/flo/flo-styles'
import { matchSuggestions } from '@/features/flo/lib/suggest'
import { prefersReducedMotion } from '@/lib/motion'
import { fillCopy } from '@/lib/utils'

interface ComposerProps {
  streaming: boolean
  /** Flo is switched off for this account. */
  disabled: boolean
  onSend: (text: string) => void
  onStop: () => void
  inputRef?: Ref<HTMLTextAreaElement>
  /** A question to put in the box (from an area tag). A new `id` replaces whatever is typed. */
  draft?: { text: string; id: number }
  /** Opens past conversations; shown as an icon button beside Send. */
  onHistory?: () => void
  /** Suggested questions to offer as the admin types (the server's list). */
  suggestions?: readonly string[]
  /** A conversation is under way: a one-line box, and suggestions open above it. */
  compact?: boolean
}

/** The box is 2 lines tall when empty and grows to 6 before it scrolls (24px lines, 24px vertical padding). */
const LINE = 24
const PADDING = 24
const MIN_HEIGHT = LINE * 2 + PADDING
const MIN_HEIGHT_COMPACT = LINE + PADDING
const MAX_HEIGHT = LINE * 6 + PADDING

/** How long each example stays in the empty box. */
const EXAMPLE_MS = 3200

const KEY = 'rounded-md border border-line px-1.5 font-sans text-[13px] leading-5 font-normal text-muted-strong'

/**
 * The question box. It grows with the question, and is disabled while an answer streams, when Send
 * becomes Stop. Enter sends, Shift+Enter adds a line.
 */
export function Composer({ streaming, disabled, onSend, onStop, inputRef, draft, onHistory, suggestions = [], compact = false }: ComposerProps) {
  const copy = floContent.composer
  const [text, setText] = useState('')
  const [draftId, setDraftId] = useState(draft?.id)
  if (draft && draft.id !== draftId) {
    setDraftId(draft.id)
    setText(draft.text)
  }
  const box = useRef<HTMLTextAreaElement | null>(null)
  const locked = streaming || disabled
  const ready = !locked && text.trim().length > 0
  const [example, setExample] = useState(0)
  const showExamples = text.length === 0 && !locked
  const typeahead = locked ? [] : matchSuggestions(suggestions, text)

  // While the box is empty, cycle the example questions shown in it.
  useEffect(() => {
    if (!showExamples || prefersReducedMotion()) return
    const timer = setInterval(() => setExample((index) => (index + 1) % copy.examples.length), EXAMPLE_MS)
    return () => clearInterval(timer)
  }, [showExamples, copy.examples.length])

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    element.style.height = 'auto'
    const content = element.scrollHeight
    element.style.height = `${Math.min(Math.max(content, compact ? MIN_HEIGHT_COMPACT : MIN_HEIGHT), MAX_HEIGHT)}px`
    element.style.overflowY = content > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [text, compact])

  function setRefs(node: HTMLTextAreaElement | null) {
    box.current = node
    if (typeof inputRef === 'function') inputRef(node)
    else if (inputRef) (inputRef as RefObject<HTMLTextAreaElement | null>).current = node
  }

  function submit() {
    if (!ready) return
    onSend(text)
    setText('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="relative w-full"
    >
      {typeahead.length > 0 ? (
        <ul
          aria-label={floContent.suggestions.title}
          className={`absolute inset-x-0 z-20 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-line bg-card p-2 shadow-float ${compact ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {typeahead.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => {
                  onSend(question)
                  setText('')
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-primary/[0.06] ${FOCUS_RING}`}
              >
                <DashboardIcon name="arrow-right" className="h-4 w-4 shrink-0 text-muted-strong" />
                {question}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="rounded-[20px] border border-line bg-card shadow-float transition-[border-color,box-shadow] duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20">
        <label htmlFor="flo-composer" className="sr-only">
          {copy.label}
        </label>
        <div className="relative">
          {showExamples ? (
            <span
              key={example}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 top-4 animate-fade-in-up truncate text-[15px] leading-6 text-placeholder"
            >
              {copy.examples[example]}
            </span>
          ) : null}
          <textarea
            id="flo-composer"
            ref={setRefs}
            rows={compact ? 1 : 2}
            value={text}
            maxLength={copy.maxLength}
            disabled={locked}
            placeholder={copy.placeholder}
            aria-describedby="flo-composer-hint"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            className={`block w-full resize-none overflow-hidden bg-transparent px-4 pt-4 pb-2 text-[15px] leading-6 text-foreground outline-none disabled:cursor-not-allowed ${showExamples ? 'placeholder:text-transparent' : 'placeholder:text-placeholder'}`}
          />
        </div>
        <div className="flex items-center gap-4 pr-2 pb-2 pl-4">
          <p id="flo-composer-hint" className={`hidden items-center gap-2 text-[13px] text-muted-strong ${compact ? '' : 'sm:flex'}`}>
            <kbd className={KEY}>{copy.hintKeys.send}</kbd> {copy.hintSend}
            <span aria-hidden="true">·</span>
            <kbd className={KEY}>{copy.hintKeys.newLine}</kbd> {copy.hintNewLine}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {text.length > copy.maxLength * 0.8 ? (
              <span className={`text-[13px] tabular-nums ${text.length >= copy.maxLength ? 'text-danger' : 'text-muted-strong'}`}>
                {fillCopy(copy.count, { count: text.length, max: copy.maxLength })}
              </span>
            ) : null}
            {onHistory ? (
              <button
                type="button"
                onClick={onHistory}
                aria-label={floContent.history}
                title={floContent.history}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-strong hover:text-accent ${OUTLINE_CONTROL}`}
              >
                <DashboardIcon name="clock" className="h-[18px] w-[18px]" />
              </button>
            ) : null}
            {streaming ? (
              <button type="button" onClick={onStop} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[15px] font-medium ${OUTLINE_CONTROL}`}>
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-foreground" />
                {copy.stop}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!ready}
                className={`inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground ${FOCUS_RING}`}
              >
                <DashboardIcon name="send" className="h-4 w-4" />
                {copy.send}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
