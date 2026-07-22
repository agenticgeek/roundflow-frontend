import {
  Modal,
  ModalButton,
  ModalFooter,
  modalWarningPanelClass,
} from '@/components/ui/modal'
import { setupWizardContent } from '@/content/setup-wizard'

export type BulkReplaceTarget = 'services' | 'service-areas'

interface BulkReplaceConfirmModalProps {
  open: boolean
  target: BulkReplaceTarget | null
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Confirms bulk-replace saves for setup steps 3 (services) and 7 (service areas). */
export function BulkReplaceConfirmModal({
  open,
  target,
  loading = false,
  onClose,
  onConfirm,
}: BulkReplaceConfirmModalProps) {
  const { bulkReplaceConfirm } = setupWizardContent
  const description =
    target === 'service-areas'
      ? bulkReplaceConfirm.serviceAreasDescription
      : bulkReplaceConfirm.servicesDescription

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={bulkReplaceConfirm.title}
      size="compact"
      maxWidthClass="max-w-md"
      showCloseButton={!loading}
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" disabled={loading} onClick={onClose}>
            {bulkReplaceConfirm.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" disabled={loading} onClick={onConfirm}>
            {loading ? 'Saving…' : bulkReplaceConfirm.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className={modalWarningPanelClass}>{description}</div>
    </Modal>
  )
}
