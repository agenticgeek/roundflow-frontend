import { useEffect, useState } from 'react'
import type { MessageTemplate } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Textarea } from '@/components/ui'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'

export interface EditTemplateModalProps {
  open: boolean
  onClose: () => void
  template: MessageTemplate | null
  onSave: (template: MessageTemplate) => void
}

export function EditTemplateModal({ open, onClose, template, onSave }: EditTemplateModalProps) {
  const { editModal } = setupWizardContent.smsTemplates
  const { fields, actions, validation } = editModal

  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !template) return
    setBody(template.body)
    setError(null)
  }, [open, template])

  function handleSave() {
    if (!template) return

    const trimmedBody = body.trim()
    if (!trimmedBody) {
      setError(validation.bodyRequired)
      return
    }

    onSave({ ...template, body: trimmedBody })
    onClose()
  }

  if (!template) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="compact"
      maxWidthClass="max-w-xl sm:max-w-2xl"
      title={editModal.title}
      subtitle={template.name}
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" onClick={onClose}>
            {actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" onClick={handleSave}>
            {actions.save}
          </ModalButton>
        </ModalFooter>
      }
    >
      <Field label={fields.body.label} labelWeight="medium" size="sm" error={error}>
        <Textarea
          inputSize="sm"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
            if (error) setError(null)
          }}
          placeholder={fields.body.placeholder}
          rows={5}
          autoFocus
        />
      </Field>
    </Modal>
  )
}
