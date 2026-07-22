import { complaintsContent } from '@/content/complaints'
import { Modal } from '@/components/ui/modal'

interface ResolveComplaintModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Confirmation shown before a complaint is marked resolved. */
export function ResolveComplaintModal({
  open,
  onClose,
  onConfirm,
}: ResolveComplaintModalProps) {
  const content = complaintsContent.resolve

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
          onClick={onConfirm}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {content.confirm}
        </button>
      </div>
    </Modal>
  )
}
