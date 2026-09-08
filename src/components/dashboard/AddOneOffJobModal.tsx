import { useEffect, useMemo, useState } from 'react'
import type { CustomerListRow, PaymentMethod } from '@/api/types'
import { dashboardContent, oneOffPaymentMethodLabels } from '@/content/dashboard'
import { todayIsoDate } from '@/features/rounds/lib/planner'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { useRounds } from '@/features/rounds/hooks/useRounds'
import { useServices } from '@/features/settings/hooks/useSettings'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { useCreateVisit } from '@/features/visits/hooks/useVisits'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ApiError, errorMessage } from '@/lib/errors'

interface AddOneOffJobModalProps {
  open: boolean
  onClose: () => void
  /** Round to pre-select — pass the planner's current round so the visit shows there. */
  defaultRoundId?: string | null
}

interface OneOffJobFormState {
  propertyId: string
  propertyLabel: string
  serviceId: string
  date: string
  price: string
  technicianId: string
  paymentMethod: PaymentMethod | ''
  roundId: string
  notes: string
}

const PAYMENT_METHODS: PaymentMethod[] = ['GOCARDLESS', 'STRIPE', 'CASH', 'BACS', 'CHEQUE']

function initialState(defaultRoundId: string | null): OneOffJobFormState {
  return {
    propertyId: '',
    propertyLabel: '',
    serviceId: '',
    date: todayIsoDate(),
    price: '',
    technicianId: '',
    paymentMethod: '',
    roundId: defaultRoundId ?? '',
    notes: '',
  }
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** One-off visit composer — `POST /visits`. Opened from the sidebar quick action and the planner list. */
export function AddOneOffJobModal({ open, onClose, defaultRoundId = null }: AddOneOffJobModalProps) {
  const { oneOffJobModal } = dashboardContent
  const { fields, notice, actions, errors } = oneOffJobModal
  const { showToast } = useToast()

  const [form, setForm] = useState<OneOffJobFormState>(() => initialState(defaultRoundId))
  const [error, setError] = useState<string | null>(null)
  const [propertyQuery, setPropertyQuery] = useState('')
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initialState(defaultRoundId))
    setError(null)
    setPropertyQuery('')
    setPropertyMenuOpen(false)
  }, [defaultRoundId, open])

  const debouncedQuery = useDebouncedValue(propertyQuery, 300)
  const customersQuery = useCustomers(
    { search: debouncedQuery },
    open && debouncedQuery.trim().length >= 2,
  )
  const propertyResults = useMemo(
    () => (customersQuery.data?.customers ?? []).filter((row) => Boolean(row.propertyId)),
    [customersQuery.data?.customers],
  )

  const servicesQuery = useServices()
  const services = useMemo(
    () => (servicesQuery.data ?? []).filter((service) => service.active !== false),
    [servicesQuery.data],
  )
  const techniciansQuery = useTechniciansList(open)
  const technicians = useMemo(
    () => (techniciansQuery.data ?? []).filter((technician) => technician.appStatus !== 'PENDING_INVITE'),
    [techniciansQuery.data],
  )
  const roundsQuery = useRounds(undefined, open)
  const rounds = useMemo(
    () => (roundsQuery.data ?? []).filter((round) => round.status !== 'ARCHIVED'),
    [roundsQuery.data],
  )

  const createVisit = useCreateVisit()

  function updateField<K extends keyof OneOffJobFormState>(key: K, value: OneOffJobFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function selectProperty(row: CustomerListRow) {
    setForm((current) => ({
      ...current,
      propertyId: row.propertyId ?? '',
      propertyLabel: [row.addressLine, row.customerName].filter(Boolean).join(' — '),
      // Keep the planner's round unless the property already belongs to one.
      roundId: current.roundId || row.roundId || '',
    }))
    setPropertyQuery('')
    setPropertyMenuOpen(false)
  }

  function selectService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId)
    setForm((current) => ({
      ...current,
      serviceId,
      price: current.price.trim() === '' && service?.defaultPrice ? String(Number(service.defaultPrice)) : current.price,
    }))
  }

  async function handleCreate() {
    if (!form.propertyId) return setError(errors.property)
    if (!form.date) return setError(errors.date)
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) return setError(errors.price)
    setError(null)

    try {
      await createVisit.mutateAsync({
        propertyId: form.propertyId,
        date: form.date,
        price,
        serviceId: form.serviceId || null,
        technicianId: form.technicianId || null,
        roundId: form.roundId || null,
        notes: form.notes.trim() || null,
        paymentMethod: form.paymentMethod || null,
      })
      showToast(oneOffJobModal.successToast, {
        description: form.roundId ? oneOffJobModal.successInPlanner : oneOffJobModal.successTodayOnly,
      })
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : errorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      title={oneOffJobModal.title}
      subtitle={oneOffJobModal.subtitle}
      footer={
        <div className="grid grid-cols-2 gap-2.5">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            onClick={() => void handleCreate()}
            disabled={createVisit.isPending}
          >
            {createVisit.isPending ? actions.creating : actions.create}
          </ModalButton>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label={fields.customer.label} required labelWeight="medium" size="sm">
          {form.propertyId ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent-surface px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{form.propertyLabel}</span>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, propertyId: '', propertyLabel: '' }))}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {fields.customer.change}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                inputSize="sm"
                value={propertyQuery}
                onChange={(event) => {
                  setPropertyQuery(event.target.value)
                  setPropertyMenuOpen(true)
                }}
                onFocus={() => setPropertyMenuOpen(true)}
                placeholder={fields.customer.placeholder}
              />
              {propertyMenuOpen && propertyQuery.trim().length >= 2 ? (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
                  {customersQuery.isFetching ? (
                    <p className="px-3 py-2 text-xs text-muted">{fields.customer.searching}</p>
                  ) : propertyResults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">{fields.customer.empty}</p>
                  ) : (
                    propertyResults.map((row) => (
                      <button
                        key={row.propertyId}
                        type="button"
                        onClick={() => selectProperty(row)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        <span className="font-medium text-foreground">{row.addressLine}</span>
                        <span className="text-xs text-muted">
                          {[row.customerName, row.postcode].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted">{fields.customer.hint}</p>
              )}
            </div>
          )}
        </Field>

        <Field label={fields.serviceType.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={form.serviceId}
            onChange={(event) => selectService(event.target.value)}
            options={[
              { value: '', label: fields.serviceType.placeholder },
              ...services.map((service) => ({ value: service.id ?? '', label: service.name ?? '' })),
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={fields.date.label} required labelWeight="medium" size="sm">
            <Input
              inputSize="sm"
              type="date"
              value={form.date}
              onChange={(event) => updateField('date', event.target.value)}
            />
          </Field>

          <Field label={fields.price.label} required labelWeight="medium" size="sm">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">
                £
              </span>
              <Input
                inputSize="sm"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value.replace(/[^\d.]/g, ''))}
                className="pl-7"
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={fields.technician.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={form.technicianId}
              onChange={(event) => updateField('technicianId', event.target.value)}
              options={[
                { value: '', label: fields.technician.placeholder },
                ...technicians.map((technician) => ({
                  value: technician.id,
                  label: technician.name ?? 'Unnamed technician',
                })),
              ]}
            />
          </Field>

          <Field label={fields.paymentMethod.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={form.paymentMethod}
              onChange={(event) => updateField('paymentMethod', event.target.value as PaymentMethod | '')}
              options={[
                { value: '', label: fields.paymentMethod.placeholder },
                ...PAYMENT_METHODS.map((method) => ({ value: method, label: oneOffPaymentMethodLabels[method] })),
              ]}
            />
          </Field>
        </div>

        <Field label={fields.round.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={form.roundId}
            onChange={(event) => updateField('roundId', event.target.value)}
            options={[
              { value: '', label: fields.round.none },
              ...rounds.map((round) => ({ value: round.id, label: round.name })),
            ]}
          />
        </Field>

        <Field label={fields.notes.label} labelWeight="medium" size="sm">
          <Textarea
            inputSize="sm"
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder={fields.notes.placeholder}
            rows={2}
            className="min-h-[3.25rem]"
          />
        </Field>

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        <div className="flex gap-2.5 rounded-lg border border-accent/25 bg-accent-surface px-3 py-2.5">
          <DashboardIcon name="calendar" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <div className="min-w-0 text-[11px] leading-snug">
            <p className="font-medium text-accent">{notice.title}</p>
            <p className="mt-0.5 text-accent/90">{notice.body}</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
