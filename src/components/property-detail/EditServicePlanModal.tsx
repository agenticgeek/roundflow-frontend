import { useEffect, useState } from 'react'
import type { CleaningFrequency, PaymentMethod } from '@/api/types'
import type { PropertyServicePlan } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { Field, FieldError, Input, Select } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useUpdateServicePlan } from '@/features/service-plans/hooks/useServicePlans'
import { errorMessage } from '@/lib/errors'

interface EditServicePlanModalProps {
  open: boolean
  plan: PropertyServicePlan | null
  customerName: string
  onClose: () => void
}

interface PlanForm {
  price: string
  cleaningFrequency: string
  paymentMethod: string
  cleanMethod: string
}

/** Edits one service plan of a multi-plan property — PATCH /service-plans/:id. */
export function EditServicePlanModal({ open, plan, customerName, onClose }: EditServicePlanModalProps) {
  const copy = propertyDetailContent.servicePlan.editPlanModal
  const updatePlan = useUpdateServicePlan()
  const { showToast } = useToast()
  const [form, setForm] = useState<PlanForm | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !plan) return
    setForm({
      price: plan.values.price != null ? String(plan.values.price) : '',
      cleaningFrequency: plan.values.cleaningFrequency ?? 'FOUR_WEEKLY',
      paymentMethod: plan.values.paymentMethod ?? '',
      cleanMethod: plan.values.cleanMethod ?? '',
    })
    setError(null)
  }, [open, plan])

  if (!plan || !form) return null

  function update<K extends keyof PlanForm>(key: K, value: PlanForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setError(null)
  }

  async function save() {
    if (!plan || !form || updatePlan.isPending) return
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) {
      setError(copy.priceInvalid)
      return
    }
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        input: {
          price,
          cleaningFrequency: form.cleaningFrequency as CleaningFrequency,
          ...(form.paymentMethod ? { paymentMethod: form.paymentMethod as PaymentMethod } : {}),
          ...(form.cleanMethod ? { cleanMethod: form.cleanMethod } : {}),
        },
      })
      showToast(copy.saved)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  // Keep a saved value the options don't list (e.g. an older clean-method label) selectable.
  const cleanMethodOptions = copy.cleanMethodOptions.some((option) => option.value === form.cleanMethod)
    ? [...copy.cleanMethodOptions]
    : [...copy.cleanMethodOptions, ...(form.cleanMethod ? [{ value: form.cleanMethod, label: form.cleanMethod }] : [])]

  return (
    <Modal
      open={open}
      onClose={updatePlan.isPending ? () => undefined : onClose}
      title={copy.title}
      subtitle={copy.subtitle.replace('{customer}', customerName).replace('{service}', plan.serviceName || '—')}
      showCloseButton
      footer={
        <div className="flex justify-end gap-2">
          <ModalButton onClick={onClose} disabled={updatePlan.isPending}>
            {copy.cancel}
          </ModalButton>
          <ModalButton variant="primary" onClick={() => void save()} loading={updatePlan.isPending}>
            {updatePlan.isPending ? copy.saving : copy.save}
          </ModalButton>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={copy.fields.price} size="sm" labelWeight="medium">
          <Input
            inputSize="sm"
            inputMode="decimal"
            value={form.price}
            onChange={(event) => update('price', event.target.value.replace(/[^0-9.]/g, ''))}
          />
        </Field>
        <Field label={copy.fields.frequency} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={form.cleaningFrequency}
            onChange={(event) => update('cleaningFrequency', event.target.value)}
            options={[...copy.frequencyOptions]}
          />
        </Field>
        <Field label={copy.fields.paymentMethod} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={form.paymentMethod}
            onChange={(event) => update('paymentMethod', event.target.value)}
            options={[{ value: '', label: '—' }, ...copy.paymentMethodOptions]}
          />
        </Field>
        <Field label={copy.fields.cleanMethod} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={form.cleanMethod}
            onChange={(event) => update('cleanMethod', event.target.value)}
            options={[{ value: '', label: '—' }, ...cleanMethodOptions]}
          />
        </Field>
      </div>
      {error ? <FieldError message={error} size="sm" /> : null}
    </Modal>
  )
}
