import { useEffect, useState } from 'react'
import type { PaymentMethod } from '@/api/types'
import { Field, Input, Select } from '@/components/ui'
import { Modal, ModalButton, modalInputClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { recordModalsContent } from '@/content/record-modals'
import { PropertyFields, usePropertyFieldOptions } from '@/components/property-detail/PropertyFields'
import {
  emptyPropertyFields,
  propertyFieldsToInput,
  validatePropertyFields,
  type PropertyFieldsValue,
} from '@/features/customers/lib/property-fields'
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { errorMessage } from '@/lib/errors'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods'

interface AddCustomerModalProps {
  open: boolean
  onClose: () => void
}

/** Creates a customer on its own (POST /customers) — properties are added afterwards. */
export function AddCustomerModal({ open, onClose }: AddCustomerModalProps) {
  const copy = recordModalsContent.addCustomer
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const createCustomer = useCreateCustomer()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [fields, setFields] = useState<PropertyFieldsValue>(emptyPropertyFields)
  const { areaOptions, roundOptions, noAreas } = usePropertyFieldOptions(open)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setEmail('')
    setPaymentMethod('')
    setFields(emptyPropertyFields)
    setError(null)
  }, [open])

  async function handleSave() {
    if (!canMutate || createCustomer.isPending) return
    if (!name.trim()) return setError(copy.validation.nameRequired)
    if (phone.trim() && !isValidPhone(phone)) return setError(copy.validation.phoneInvalid)
    if (email.trim() && !isValidEmail(email)) return setError(copy.validation.emailInvalid)
    // The customer is created together with their first property, so they always show up in the list.
    const invalid = validatePropertyFields(fields, noAreas)
    if (invalid) return setError(invalid)
    try {
      await createCustomer.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        paymentMethod: (paymentMethod || null) as PaymentMethod | null,
        property: propertyFieldsToInput(fields),
      })
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
      subtitle={copy.subtitle}
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
            disabled={!canMutate || createCustomer.isPending || noAreas}
            onClick={() => void handleSave()}
          >
            {createCustomer.isPending ? copy.actions.saving : copy.actions.save}
          </ModalButton>
        </div>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Field label={copy.fields.name} required size="sm" labelWeight="medium">
        <Input inputSize="sm" value={name} onChange={(e) => setName(e.target.value)} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.phone} size="sm" labelWeight="medium">
        <Input inputSize="sm" value={phone} onChange={(e) => setPhone(e.target.value)} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.email} size="sm" labelWeight="medium">
        <Input inputSize="sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={modalInputClass} />
      </Field>
      <Field label={copy.fields.paymentMethod} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={[{ value: '', label: copy.paymentPlaceholder }, ...PAYMENT_METHOD_OPTIONS]}
          className={modalInputClass}
        />
      </Field>
      <h3 className="pt-2 text-sm font-semibold text-foreground">{copy.propertyHeading}</h3>
      {noAreas ? (
        <p role="alert" className="rounded-lg border border-warning-border bg-warning-surface px-3.5 py-2.5 text-sm text-warning-foreground">
          {recordModalsContent.addProperty.noServiceAreas}
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
