import { useId, type ReactNode } from 'react'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { confirmDialogContent } from '@/content/confirm-dialog'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  /** What will happen — read out after the title. */
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `danger` (default) for destructive actions. */
  tone?: 'danger' | 'primary'
  /** True while the action runs: both buttons lock and Escape / backdrop do nothing. */
  pending?: boolean
  /** Shown above the buttons (`role="alert"`) when the action failed; the dialog stays open. */
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

/**
 * Shared confirmation for destructive or hard-to-undo actions (WEB-02).
 *
 * Accessibility contract (inherited from `Modal` / `useDialogA11y`): `role="alertdialog"`
 * named by its title and described by `description`; focus lands on **Cancel** (the safe
 * choice), Tab stays inside, Escape cancels, and focus returns to the control that opened it.
 * Callers own the action: run it in `onConfirm`, catch errors (toast or pass `error`), then
 * close. Never confirm on a bare click of the trigger.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = confirmDialogContent.cancel,
  tone = 'danger',
  pending = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const descriptionId = useId()
  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      role="alertdialog"
      descriptionId={descriptionId}
      size="compact"
      maxWidthClass="max-w-md"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={pending} data-autofocus>
            {cancelLabel}
          </ModalButton>
          <ModalButton compact variant={tone} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </ModalButton>
        </ModalFooter>
      }
    >
      <p id={descriptionId} className="text-sm text-foreground">
        {description}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Modal>
  )
}
