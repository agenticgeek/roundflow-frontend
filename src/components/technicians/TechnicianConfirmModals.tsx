import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Modal } from '@/components/ui/modal'
import { techniciansContent } from '@/content/technicians'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ApprovePhotosModal({ open, onClose, onConfirm }: ConfirmModalProps) {
  const content = techniciansContent.modals

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={content.approveTitle}
      showHeader={false}
      maxWidthClass="max-w-sm"
      className="rounded-2xl"
      bodyClassName="text-center"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <DashboardIcon name="check-circle" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-foreground">{content.approveTitle}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">{content.approveDescription}</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
        >
          {content.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {content.approve}
        </button>
      </div>
    </Modal>
  )
}

export function RemoveTechnicianModal({ open, onClose, onConfirm }: ConfirmModalProps) {
  const content = techniciansContent.modals

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={content.removeTitle}
      showHeader={false}
      maxWidthClass="max-w-md"
      className="rounded-2xl"
      bodyClassName="text-center"
    >
      <h2 className="text-base font-semibold leading-snug text-foreground">
        {content.removeTitle}
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
        >
          {content.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          {content.remove}
        </button>
      </div>
    </Modal>
  )
}
