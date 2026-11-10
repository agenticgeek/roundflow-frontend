import { useState, type KeyboardEvent, type Ref } from 'react'
import { floContent } from '@/content/flo'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'

interface ComposerProps {
  streaming: boolean
  /** Flo is switched off for this account. */
  disabled: boolean
  onSend: (text: string) => void
  onStop: () => void
  inputRef?: Ref<HTMLTextAreaElement>
}

/** The question box. Disabled while an answer streams, when Send becomes Stop. Enter sends, Shift+Enter adds a line. */
export function Composer({ streaming, disabled, onSend, onStop, inputRef }: ComposerProps) {
  const copy = floContent.composer
  const [text, setText] = useState('')
  const locked = streaming || disabled

  function submit() {
    if (locked || !text.trim()) return
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
      className="flex items-end gap-2 border-t border-border pt-3"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="flo-composer" className="sr-only">
          {copy.label}
        </label>
        <textarea
          id="flo-composer"
          ref={inputRef}
          rows={2}
          value={text}
          maxLength={copy.maxLength}
          disabled={locked}
          placeholder={copy.placeholder}
          aria-describedby="flo-composer-hint"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted disabled:opacity-60"
        />
        <p id="flo-composer-hint" className="mt-1 text-xs text-muted">
          {copy.hint}
        </p>
      </div>
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          className="mb-6 flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent-surface"
        >
          {copy.stop}
        </button>
      ) : (
        <button
          type="submit"
          disabled={locked || !text.trim()}
          className="mb-6 flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <DashboardIcon name="send" className="h-4 w-4" />
          {copy.send}
        </button>
      )}
    </form>
  )
}
