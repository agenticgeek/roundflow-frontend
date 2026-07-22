import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { MessageTemplate, SmsTemplatesData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { EditTemplateModal } from '@/components/setup-wizard/EditTemplateModal'
import { cn, interpolateTemplate, truncateTemplateBody } from '@/lib/utils'

interface SmsTemplatesStepProps {
  initialValues: SmsTemplatesData
  onSubmit: (values: SmsTemplatesData) => void
}

function SmsTemplatesIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M8 10.5h8M8 14h5M6 5.5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 2v-2.5A2 2 0 0 1 4 16.5v-9a2 2 0 0 1 2-2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="m2.695 14.763-1.262 3.34a.75.75 0 0 0 .18.77.75.75 0 0 0 .77.18l3.34-1.262 9.44-9.438a2.25 2.25 0 0 0-3.182-3.182L2.695 14.763Z" />
    </svg>
  )
}

function ChannelBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
      {label}
    </span>
  )
}

export function SmsTemplatesStep({ initialValues, onSubmit }: SmsTemplatesStepProps) {
  const { smsTemplates } = setupWizardContent
  const { labels, channelLabels, previewVariables } = smsTemplates

  const [templates, setTemplates] = useState<MessageTemplate[]>(initialValues.templates)
  const [selectedId, setSelectedId] = useState(initialValues.templates[0]?.id ?? '')
  const [editOpen, setEditOpen] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [templates, selectedId],
  )

  const previewText = useMemo(() => {
    if (!selectedTemplate) return ''
    return interpolateTemplate(selectedTemplate.body, previewVariables)
  }, [selectedTemplate, previewVariables])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ templates })
  }

  function saveTemplate(updated: MessageTemplate) {
    setTemplates((prev) => prev.map((template) => (template.id === updated.id ? updated : template)))
  }

  if (!selectedTemplate) return null

  const previewLabel =
    selectedTemplate.channel === 'whatsapp' ? labels.whatsappMessage : labels.smsMessage

  return (
    <>
      <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex items-start gap-4 border-b border-border pb-5">
          <SmsTemplatesIcon />
          <div>
            <h2 className="text-lg font-medium text-foreground sm:text-xl">{smsTemplates.heading}</h2>
            <p className="mt-1 text-sm text-muted">{smsTemplates.subheading}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          {/* Templates list — ~1/3 width on desktop */}
          <div className="lg:col-span-1">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              {labels.templates}
            </p>
            <ul className="space-y-2">
              {templates.map((template) => {
                const active = template.id === selectedTemplate.id
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(template.id)}
                      className={cn(
                        'w-full rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 active:scale-[0.99]',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:bg-surface',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{template.name}</span>
                        <ChannelBadge label={channelLabels[template.channel]} />
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted">
                        {truncateTemplateBody(template.body, 48)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Preview pane — ~2/3 width on desktop */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {labels.preview}
              </p>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                <EditIcon />
                {labels.edit}
              </button>
            </div>

            <div
              key={selectedTemplate.id}
              className="min-h-[12rem] animate-fade-in rounded-xl border border-border bg-surface p-4 sm:min-h-[14rem] sm:p-5"
            >
              <p className="text-xs text-muted">{previewLabel}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{previewText}</p>
            </div>
          </div>
        </div>
      </form>

      <EditTemplateModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        template={selectedTemplate}
        onSave={saveTemplate}
      />
    </>
  )
}
