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
  /** Saved items the save would delete — listed so the user knows exactly what goes. */
  removedNames: readonly string[]
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Setup steps 3 and 7 save by replacing the whole list — confirm before that deletes saved items. */
export function BulkReplaceConfirmModal({
  open,
  target,
  removedNames,
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
          <ModalButton compact variant="primary" loading={loading} onClick={onConfirm}>
            {loading ? 'Saving…' : bulkReplaceConfirm.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className={modalWarningPanelClass}>
        <p>{description}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 font-medium">
          {removedNames.map((name, index) => (
            <li key={`${name}-${index}`}>{name}</li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
