import { useEffect, useMemo, useState } from 'react'
import type { CatalogueService } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton, ModalFooter, ModalToggleRow } from '@/components/ui/modal'
import type { SelectOption } from '@/components/ui'

const DEFAULT_CATEGORY_ID = 'window-cleaning'

export interface AddServiceModalProps {
  open: boolean
  onClose: () => void
  onSave: (service: CatalogueService) => void
  /** When set, the modal opens in edit mode with fields pre-filled. */
  editingService?: CatalogueService | null
  categoryOptions: SelectOption[]
}

function createEmptyFormState(categoryId: string) {
  return {
    name: '',
    description: '',
    price: '',
    categoryId,
    active: true,
    isDefault: false,
  }
}

export function AddServiceModal({
  open,
  onClose,
  onSave,
  editingService = null,
  categoryOptions,
}: AddServiceModalProps) {
  const { addServiceModal } = setupWizardContent.serviceCatalogue
  const { fields, actions, validation } = addServiceModal
  const isEdit = Boolean(editingService)

  const defaultCategoryId = useMemo(
    () => categoryOptions[0]?.value ?? DEFAULT_CATEGORY_ID,
    [categoryOptions],
  )

  const [form, setForm] = useState(() => createEmptyFormState(defaultCategoryId))
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    if (editingService) {
      setForm({
        name: editingService.name,
        description: editingService.description,
        price: editingService.price > 0 ? String(editingService.price) : '',
        categoryId: editingService.categoryId,
        active: editingService.active,
        isDefault: Boolean(editingService.isDefault),
      })
    } else {
      setForm(createEmptyFormState(defaultCategoryId))
    }

    setNameError(null)
  }, [open, editingService, defaultCategoryId])

  function handleConfirm() {
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setNameError(validation.nameRequired)
      return
    }

    const parsedPrice = Number.parseFloat(form.price.replace(/,/g, ''))
    const price = Number.isFinite(parsedPrice) ? parsedPrice : 0

    onSave({
      id: editingService?.id ?? `service-${Date.now()}`,
      name: trimmedName,
      description: form.description.trim(),
      categoryId: form.categoryId,
      price,
      active: form.active,
      ...(form.isDefault ? { isDefault: true } : {}),
    })

    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="compact"
      maxWidthClass="max-w-xl sm:max-w-2xl"
      title={isEdit ? addServiceModal.editTitle : addServiceModal.title}
      subtitle={isEdit ? addServiceModal.editSubtitle : addServiceModal.subtitle}
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" onClick={onClose}>
            {actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" onClick={handleConfirm}>
            {isEdit ? actions.save : actions.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className="space-y-3.5 sm:space-y-4">
        <Field label={fields.name.label} labelWeight="medium" size="sm" error={nameError}>
          <Input
            inputSize="sm"
            value={form.name}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }))
              if (nameError) setNameError(null)
            }}
            placeholder={fields.name.placeholder}
            autoFocus
          />
        </Field>

        <Field
          label={
            <>
              {fields.description.label}{' '}
              <span className="font-normal text-muted">{fields.description.optional}</span>
            </>
          }
          labelWeight="medium"
          size="sm"
        >
          <Textarea
            inputSize="sm"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={fields.description.placeholder}
            rows={2}
          />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <Field label={fields.price.label} labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              placeholder={fields.price.placeholder}
            />
          </Field>

          <Field label={fields.category.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              options={categoryOptions}
            />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
          <ModalToggleRow
            compact
            label={fields.active.label}
            description={fields.active.description}
            checked={form.active}
            onChange={(active) => setForm((prev) => ({ ...prev, active }))}
            ariaLabel={fields.active.label}
          />
          <ModalToggleRow
            compact
            label={fields.default.label}
            description={fields.default.description}
            checked={form.isDefault}
            onChange={(isDefault) => setForm((prev) => ({ ...prev, isDefault }))}
            ariaLabel={fields.default.label}
          />
        </div>
      </div>
    </Modal>
  )
}
