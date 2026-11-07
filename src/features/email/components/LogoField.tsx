import { useId, useState } from 'react'
import type { EmailSettings } from '@/api/email-settings.api'
import { Field, Input } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { emailSettingsContent } from '@/content/email-settings'
import { useRemoveLogo, useUploadLogo } from '@/features/email/hooks/useEmailSettings'
import { emailSettingsErrorMessage } from '@/features/email/lib/errors'
import { fillCopy } from '@/lib/utils'

const copy = emailSettingsContent.logo
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const buttonClass =
  'rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

/** Logo preview (alt text = the saved description, else the business name) and, for admins, upload and remove. */
export function LogoField({
  settings,
  businessName,
  canEdit,
}: {
  settings: EmailSettings
  businessName: string
  canEdit: boolean
}) {
  const { showToast } = useToast()
  const upload = useUploadLogo()
  const remove = useRemoveLogo()
  const fileId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState(settings.logoAltText ?? businessName)
  const [error, setError] = useState<string | null>(null)
  const previewAlt = settings.logoAltText || businessName || copy.fallbackAlt

  function choose(chosen: File | undefined) {
    setError(null)
    if (!chosen) return setFile(null)
    if (!ACCEPTED.includes(chosen.type)) {
      setFile(null)
      return setError(copy.badType)
    }
    setFile(chosen)
  }

  /** Only reachable with a file chosen: the button is disabled otherwise. */
  async function send() {
    if (!alt.trim()) return setError(copy.altRequired)
    setError(null)
    try {
      await upload.mutateAsync({ file: file!, altText: alt.trim() })
      setFile(null)
      showToast(copy.uploaded)
    } catch (caught) {
      setError(emailSettingsErrorMessage(caught))
    }
  }

  async function clear() {
    setError(null)
    try {
      await remove.mutateAsync()
      showToast(copy.removed)
    } catch (caught) {
      setError(emailSettingsErrorMessage(caught))
    }
  }

  return (
    <section aria-labelledby="email-logo-heading" className="space-y-3">
      <h3 id="email-logo-heading" className="text-sm font-semibold text-foreground">
        {copy.heading}
      </h3>
      {settings.logoUrl ? (
        <img src={settings.logoUrl} alt={previewAlt} className="max-h-20 max-w-[16rem] rounded border border-border bg-card p-2" />
      ) : (
        <p className="text-sm text-muted">{copy.none}</p>
      )}
      {canEdit ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">{copy.help}</p>
          <div>
            <label htmlFor={fileId} className="mb-1.5 block text-sm font-medium text-foreground">
              {copy.file}
            </label>
            <input
              id={fileId}
              type="file"
              accept={ACCEPTED.join(',')}
              onChange={(event) => choose(event.target.files?.[0])}
              className="block text-sm text-foreground"
            />
            {file ? <p className="mt-1 text-sm text-muted">{fillCopy(copy.chosen, { name: file.name })}</p> : null}
          </div>
          <Field label={copy.altLabel} labelWeight="medium">
            <Input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={125} />
            <p className="mt-1 text-xs text-muted">{copy.altHelp}</p>
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={buttonClass} disabled={!file || upload.isPending} onClick={() => void send()}>
              {upload.isPending ? copy.uploading : copy.upload}
            </button>
            {settings.logoUrl ? (
              <button type="button" className={buttonClass} disabled={remove.isPending} onClick={() => void clear()}>
                {remove.isPending ? copy.removing : copy.remove}
              </button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
