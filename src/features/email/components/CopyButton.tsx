import { useState } from 'react'
import { emailSettingsContent } from '@/content/email-settings'

const copy = emailSettingsContent.domain

/**
 * Copies `text` to the clipboard. `label` is the accessible name and says what is copied
 * ("Copy value of record 2"). The result is announced in a polite live region.
 */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function run() {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={label}
        onClick={() => void run()}
        className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {state === 'copied' ? copy.copied : copy.copy}
      </button>
      <span role="status" aria-live="polite" className={state === 'failed' ? 'text-xs text-danger' : 'sr-only'}>
        {state === 'copied' ? copy.copied : state === 'failed' ? copy.copyFailed : ''}
      </span>
    </span>
  )
}
