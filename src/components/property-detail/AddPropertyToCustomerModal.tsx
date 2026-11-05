import { useEffect, useState } from 'react'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { PropertyFields, usePropertyFieldOptions } from '@/components/property-detail/PropertyFields'
import {
  emptyPropertyFields,
  propertyFieldsToInput,
  validatePropertyFields,
  type PropertyFieldsValue,
} from '@/features/customers/lib/property-fields'
import { recordModalsContent } from '@/content/record-modals'
import { useAddCustomerProperty } from '@/features/customers/hooks/useCustomers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { errorMessage } from '@/lib/errors'

interface AddPropertyToCustomerModalProps {
  open: boolean
  customerId: string
  customerName: string
  onClose: () => void
}

/** Adds another property to an existing customer (POST /customers/:id/properties). */
export function AddPropertyToCustomerModal({
  open,
  customerId,
  customerName,
  onClose,
}: AddPropertyToCustomerModalProps) {
  const copy = recordModalsContent.addProperty
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const addProperty = useAddCustomerProperty(customerId)
  const { areaOptions, roundOptions, noAreas } = usePropertyFieldOptions(open)
  const [fields, setFields] = useState<PropertyFieldsValue>(emptyPropertyFields)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFields(emptyPropertyFields)
    setError(null)
  }, [open])

  async function handleSave() {
    if (!canMutate || addProperty.isPending) return
    const invalid = validatePropertyFields(fields, noAreas)
    if (invalid) return setError(invalid)
    try {
      await addProperty.mutateAsync(propertyFieldsToInput(fields))
      onClose()
      showToast(copy.successToast)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle.replace('{customer}', customerName)}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {copy.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={!canMutate || addProperty.isPending || noAreas}
            onClick={() => void handleSave()}
          >
            {addProperty.isPending ? copy.actions.saving : copy.actions.save}
          </ModalButton>
        </div>
      }
    >
      {noAreas ? (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning-surface px-3.5 py-2.5 text-sm text-warning-foreground">
          {copy.noServiceAreas}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <PropertyFields
        value={fields}
        onChange={(patch) => {
          setFields((current) => ({ ...current, ...patch }))
          if (error) setError(null)
        }}
        areaOptions={areaOptions}
        roundOptions={roundOptions}
      />
    </Modal>
  )
}
