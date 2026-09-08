import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { ComplaintSeverity } from '@/api/complaints.api'
import type { CustomerListRow } from '@/api/types'
import { complaintsContent } from '@/content/complaints'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Input, Select, Textarea } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { cn } from '@/lib/utils'

export interface NewComplaintValues {
  customerId: string
  customerName: string
  propertyId?: string
  title: string
  description: string
  issueType: string
  severity: ComplaintSeverity
  technicianId: string
}

interface LogComplaintModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: NewComplaintValues) => void
  submitting?: boolean
}

const initialValues: NewComplaintValues = {
  customerId: '',
  customerName: '',
  propertyId: undefined,
  title: '',
  description: '',
  issueType: '',
  severity: 'MEDIUM',
  technicianId: '',
}

/** Debounce a fast-changing value — used for the customer search query. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** Log New Complaint — customer is resolved via search autocomplete, not free text. */
export function LogComplaintModal({ open, onClose, onSubmit, submitting = false }: LogComplaintModalProps) {
  const { modal } = complaintsContent
  const [values, setValues] = useState<NewComplaintValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(initialValues)
    setError(null)
    setCustomerQuery('')
    setCustomerMenuOpen(false)
  }, [open])

  const debouncedQuery = useDebouncedValue(customerQuery, 300)
  const customersQuery = useCustomers(
    { search: debouncedQuery },
    open && debouncedQuery.trim().length >= 2,
  )
  const customerResults = customersQuery.data?.customers ?? []

  const techniciansQuery = useTechniciansList(open)
  const technicianOptions = (techniciansQuery.data ?? [])
    .filter((technician) => technician.appStatus !== 'PENDING_INVITE')
    .map((technician) => ({ value: technician.id, label: technician.name ?? 'Unnamed technician' }))

  function update<K extends keyof NewComplaintValues>(key: K, value: NewComplaintValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function selectCustomer(customer: CustomerListRow) {
    update('customerId', customer.customerId ?? '')
    update('customerName', customer.customerName ?? '')
    update('propertyId', customer.propertyId)
    setCustomerQuery('')
    setCustomerMenuOpen(false)
  }

  function clearCustomer() {
    update('customerId', '')
    update('customerName', '')
    update('propertyId', undefined)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.customerId) {
      setError('Search for and select a customer.')
      return
    }
    if (!values.title.trim()) {
      setError('Add a title for the complaint.')
      return
    }
    setError(null)
    onSubmit(values)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modal.title}
      subtitle={modal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      className="max-h-[min(92dvh,44rem)] rounded-2xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            {modal.cancel}
          </button>
          <button
            type="submit"
            form="log-complaint-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <DashboardIcon name="flag" className="h-4 w-4" />
            {submitting ? 'Logging…' : modal.submit}
          </button>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <DashboardIcon name="flag" className="h-5 w-5" />
      </span>

      <form id="log-complaint-form" onSubmit={handleSubmit} className="space-y-4">
        <FormSection title={modal.customerSection}>
          {values.customerId ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent-surface px-3.5 py-2.5">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {values.customerName}
              </span>
              <button
                type="button"
                onClick={clearCustomer}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {modal.changeCustomer}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input
                inputSize="sm"
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value)
                  setCustomerMenuOpen(true)
                }}
                onFocus={() => setCustomerMenuOpen(true)}
                placeholder={modal.customerSearchPlaceholder}
              />
              {customerMenuOpen && customerQuery.trim().length >= 2 ? (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
                  {customersQuery.isFetching ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">Searching…</p>
                  ) : customerResults.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-xs text-muted">{modal.customerSearchEmpty}</p>
                  ) : (
                    customerResults.map((customer) => (
                      <button
                        key={customer.customerId}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="flex w-full flex-col items-start px-3.5 py-2 text-left text-sm hover:bg-surface"
                      >
                        <span className="font-medium text-foreground">{customer.customerName}</span>
                        {customer.addressLine ? (
                          <span className="text-xs text-muted">{customer.addressLine}</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
              {customerQuery.trim().length < 2 ? (
                <p className="mt-1 text-[11px] text-muted">{modal.customerSearchHint}</p>
              ) : null}
            </div>
          )}
        </FormSection>

        <FormSection title={modal.complaintSection}>
          <Input
            inputSize="sm"
            value={values.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Complaint title *"
          />
          <Select
            inputSize="sm"
            value={values.issueType}
            onChange={(event) => update('issueType', event.target.value)}
            options={[
              { value: '', label: modal.issuePlaceholder },
              ...modal.issueTypes.map((issue) => ({ value: issue, label: issue })),
            ]}
            className="border-primary/30 bg-accent-surface"
          />
          <Textarea
            inputSize="sm"
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder={modal.descriptionPlaceholder}
          />
        </FormSection>

        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
            {modal.priorityLabel}
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => update('severity', severity)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors',
                  values.severity === severity
                    ? 'border-warning-border bg-warning-surface text-warning-foreground'
                    : 'border-border bg-card text-muted hover:text-foreground',
                )}
              >
                {severity.charAt(0) + severity.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </fieldset>

        <FormSection title={modal.visitSection}>
          <Select
            inputSize="sm"
            value={values.technicianId}
            onChange={(event) => update('technicianId', event.target.value)}
            options={[{ value: '', label: modal.technicianPlaceholder }, ...technicianOptions]}
            className="border-primary/30 bg-accent-surface"
          />
        </FormSection>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </form>
    </Modal>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}
