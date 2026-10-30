import { useEffect, useState } from 'react'
import { complaintsContent } from '@/content/complaints'
import { Textarea } from '@/components/ui'
import { Modal, ModalToggleRow } from '@/components/ui/modal'

interface ResolveComplaintModalProps {
  open: boolean
  onClose: () => void
  /** Notes are optional — sent with POST /complaints/:id/resolve when given, with `upheld` (GAP-025). */
  onConfirm: (notes: string, upheld: boolean) => void
  resolving?: boolean
}

/** Confirmation shown before a complaint is marked resolved. */
export function ResolveComplaintModal({
  open,
  onClose,
  onConfirm,
  resolving = false,
}: ResolveComplaintModalProps) {
  const content = complaintsContent.resolve
  const [notes, setNotes] = useState('')
  const [upheld, setUpheld] = useState(false)

  useEffect(() => {
    if (!open) return
    setNotes('')
    setUpheld(false)
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={content.title}
      showHeader={false}
      maxWidthClass="max-w-md"
      className="rounded-2xl"
      bodyClassName="space-y-3"
    >
      <h2 className="text-xl font-semibold text-foreground">{content.title}</h2>
      <p className="text-sm leading-relaxed text-muted">{content.description}</p>

      <label className="block pt-1">
        <span className="mb-1.5 block text-xs font-semibold text-foreground">{content.notesLabel}</span>
        <Textarea
          inputSize="sm"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={content.notesPlaceholder}
        />
      </label>

      <ModalToggleRow
        compact
        label={complaintsContent.upheld.label}
        description={complaintsContent.upheld.description}
        checked={upheld}
        onChange={setUpheld}
        ariaLabel={complaintsContent.upheld.label}
      />

      <div className="flex items-center justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          {content.cancel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(notes.trim(), upheld)}
          disabled={resolving}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {resolving ? 'Resolving…' : content.confirm}
        </button>
      </div>
    </Modal>
  )
}
