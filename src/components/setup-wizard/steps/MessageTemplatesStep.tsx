import type { FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { MessageChannel, MessageGroup, WizardMessage, WizardMessagesData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { FieldError } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import {
  ChoiceChip,
  InfoNote,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { primaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'
import { cn, fillCopy, interpolateTemplate } from '@/lib/utils'

interface MessageTemplatesStepProps {
  initialValues: WizardMessagesData
  businessName: string
  /** Saves every template now without leaving the step (POST /setup/step/5). */
  onSaveTemplates: (values: WizardMessagesData) => Promise<void>
  onSubmit: (values: WizardMessagesData) => void
}

const GROUP_ORDER: readonly MessageGroup[] = ['visits', 'payments', 'other']
const SMS_LIMIT = 160
/** Concatenated SMS parts carry a header, leaving 153 characters each. */
const SMS_PART_LENGTH = 153

function smsParts(length: number): number {
  if (length <= SMS_LIMIT) return 1
  return Math.ceil(length / SMS_PART_LENGTH)
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 5.5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3v-3a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
    </svg>
  )
}

export function MessageTemplatesStep({
  initialValues,
  businessName,
  onSaveTemplates,
  onSubmit,
}: MessageTemplatesStepProps) {
  const content = setupWizardContent.messages
  const { editor } = content
  const { showToast } = useToast()

  /** Last saved state — the list badges and "Reset" compare against this. */
  const [messages, setMessages] = useState<WizardMessage[]>(initialValues.messages)
  useReportWizardDirty({ messages }, initialValues)
  const [selectedKey, setSelectedKey] = useState(initialValues.messages[0]?.key ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const selected = messages.find((message) => message.key === selectedKey) ?? messages[0]
  const catalogueDefault = content.catalogue.find((message) => message.key === selected?.key)

  const previewValues = useMemo(
    () => ({ ...content.previewValues, business_name: businessName || content.previewValues.business_name }),
    [content.previewValues, businessName],
  )

  function updateSelected(patch: Partial<WizardMessage>) {
    if (!selected) return
    setMessages((prev) => prev.map((message) => (message.key === selected.key ? { ...message, ...patch } : message)))
    setError(null)
  }

  function channelLabel(channels: readonly MessageChannel[]): string {
    return content.channelOrder
      .filter((channel) => channels.includes(channel))
      .map((channel) => content.channelLabels[channel])
      .join(' + ')
  }

  function toggleChannel(channel: MessageChannel) {
    if (!selected) return
    const channels = selected.channels.includes(channel)
      ? selected.channels.filter((item) => item !== channel)
      : [...selected.channels, channel]
    updateSelected({ channels })
  }

  /** Inserts `{{variable}}` at the cursor (or the end) and keeps focus in the box. */
  function insertVariable(variable: string) {
    if (!selected) return
    const token = `{{${variable}}}`
    const textarea = bodyRef.current
    const start = textarea?.selectionStart ?? selected.body.length
    const end = textarea?.selectionEnd ?? selected.body.length
    const body = selected.body.slice(0, start) + token + selected.body.slice(end)
    updateSelected({ body })
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function validationError(list: readonly WizardMessage[]): { key: string; message: string } | null {
    for (const message of list) {
      if (!message.body.trim()) return { key: message.key, message: editor.bodyRequired }
      if (message.channels.length === 0) return { key: message.key, message: editor.channelRequired }
    }
    return null
  }

  async function saveTemplates() {
    const invalid = validationError(messages)
    if (invalid) {
      setSelectedKey(invalid.key)
      setError(invalid.message)
      return
    }
    setSaving(true)
    try {
      await onSaveTemplates({ messages })
      showToast(editor.saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalid = validationError(messages)
    if (invalid) {
      setSelectedKey(invalid.key)
      setError(invalid.message)
      return
    }
    onSubmit({ messages })
  }

  if (!selected) return null

  const usesSms = selected.channels.includes('sms')
  const length = selected.body.length

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <WizardStepTitle icon={<MessageIcon />} title={content.heading} subtitle={content.subheading} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <nav aria-label={content.heading} className="self-start rounded-2xl border border-border bg-card py-3">
          {GROUP_ORDER.map((group) => {
            const groupMessages = messages.filter((message) => message.group === group)
            if (groupMessages.length === 0) return null
            return (
              <div key={group} className="py-1">
                <p className="px-5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted uppercase">
                  {content.groups[group]}
                </p>
                <ul>
                  {groupMessages.map((message) => {
                    const active = message.key === selected.key
                    return (
                      <li key={message.key}>
                        <button
                          type="button"
                          aria-current={active ? 'true' : undefined}
                          onClick={() => {
                            setSelectedKey(message.key)
                            setError(null)
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 border-l-[3px] px-5 py-3 text-left transition-colors',
                            active ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-surface',
                          )}
                        >
                          <span className="text-sm text-foreground sm:text-[15px]">{message.name}</span>
                          {message.channels.length > 0 ? (
                            <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2.5 py-0.5 text-xs text-muted">
                              {channelLabel(message.channels)}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <section key={selected.key} className="animate-fade-in rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{selected.name}</h3>
          {selected.description ? <p className="mt-1 text-sm text-muted">{selected.description}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {content.channelOrder.map((channel) => (
              <ChoiceChip
                key={channel}
                label={content.channelLabels[channel]}
                selected={selected.channels.includes(channel)}
                onClick={() => toggleChannel(channel)}
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-primary/60 px-4 pt-3 pb-2 focus-within:ring-4 focus-within:ring-primary/10">
            <textarea
              ref={bodyRef}
              value={selected.body}
              onChange={(event) => updateSelected({ body: event.target.value })}
              rows={4}
              aria-label={selected.name}
              className="block w-full resize-y bg-transparent text-[15px] leading-relaxed text-foreground outline-none"
            />
            {usesSms ? (
              <p className={cn('mt-1 text-xs', length > SMS_LIMIT ? 'text-warning-foreground' : 'text-muted')}>
                {fillCopy(editor.characters, { count: length })} · {fillCopy(editor.smsParts, { count: smsParts(length) })}
              </p>
            ) : null}
          </div>

          {error ? <FieldError message={error} /> : null}

          <p className="mt-4 mb-2 text-sm text-foreground">{editor.insertVariable}</p>
          <div className="flex flex-wrap gap-2">
            {content.variables.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground transition-colors hover:bg-surface"
              >
                {`{{${variable}}}`}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-foreground/[0.04] p-3">
            <p className="px-1 pb-2 text-sm text-muted">{editor.preview}</p>
            <p className="rounded-lg bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground">
              {interpolateTemplate(selected.body, previewValues)}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-5">
            {catalogueDefault ? (
              <button
                type="button"
                onClick={() =>
                  updateSelected({ body: catalogueDefault.body, channels: [...catalogueDefault.channels] })
                }
                className="text-sm font-medium text-muted transition-colors hover:text-foreground sm:text-[15px]"
              >
                {editor.reset}
              </button>
            ) : null}
            <button type="button" onClick={() => void saveTemplates()} disabled={saving} className={primaryButtonClass}>
              {saving ? editor.saving : editor.save}
            </button>
          </div>
        </section>
      </div>

      <InfoNote>{content.footerInfo}</InfoNote>
    </form>
  )
}
