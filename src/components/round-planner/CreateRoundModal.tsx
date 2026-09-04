import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Textarea } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateServiceArea, useServiceAreas, useTechnicians } from '@/features/settings/hooks/useSettings'
import { useCreateRound, useSetRoundTechnicians } from '@/features/rounds/hooks/useRounds'
import { useUpdateProperty } from '@/features/properties/hooks/useProperties'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import { settingsServiceAreasToRows, settingsTechniciansToRows } from '@/features/settings/lib/mappers'
import type { CustomerListRow } from '@/api/types'
import type { DayOfWeek } from '@/api/types'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { useToast } from '@/components/ui/toast'
import { ApiError, errorMessage } from '@/lib/errors'
import { cn, formatCurrency } from '@/lib/utils'

interface CreateRoundModalProps {
  open: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4 | 5
type Frequency = 'FOUR_WEEKLY' | 'SIX_WEEKLY' | 'EIGHT_WEEKLY' | 'TWELVE_WEEKLY'

const STEPS = [
  { label: 'Round Details', icon: 'file' },
  { label: 'Assign Area', icon: 'map-pin' },
  { label: 'Add Properties', icon: 'home' },
  { label: 'Assign Technician', icon: 'technicians' },
  { label: 'Review & Save', icon: 'check' },
] as const

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const FREQUENCIES: { value: Frequency; label: string; default?: boolean }[] = [
  { value: 'FOUR_WEEKLY', label: 'Every 4 weeks', default: true },
  { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
  { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
  { value: 'TWELVE_WEEKLY', label: 'Every 12 weeks' },
]

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="grid grid-cols-5 gap-2 border-b border-border px-5 py-4 sm:px-7">
      {STEPS.map((item, index) => {
        const number = (index + 1) as Step
        const complete = number < step
        const active = number === step

        return (
          <li key={item.label} className="relative flex min-w-0 flex-col items-center">
            {index > 0 ? (
              <span
                className={cn(
                  'absolute top-4 right-1/2 h-px w-[calc(100%-2.5rem)] translate-x-[-1.25rem]',
                  complete || active ? 'bg-success' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs',
                complete
                  ? 'border-success bg-success text-white'
                  : active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-transparent bg-accent-surface text-accent',
              )}
            >
              {complete ? (
                <DashboardIcon name="check" className="h-4 w-4" />
              ) : (
                <DashboardIcon name={item.icon} className="h-4 w-4" />
              )}
            </span>
            <span
              className={cn(
                'mt-2 truncate text-center text-[10px] font-medium sm:text-xs',
                complete ? 'text-success' : active ? 'text-foreground' : 'text-muted',
              )}
            >
              {item.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ModalHeader({ step, onClose }: { step: Step; onClose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-surface text-primary">
          <DashboardIcon name="refresh" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">Create Round</h2>
          <p className="text-xs text-muted">Step {step} of 5</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close create round"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <DashboardIcon name="x-mark" className="h-5 w-5" />
      </button>
    </header>
  )
}

function ModalFooter({
  step,
  canContinue,
  saving,
  onBack,
  onCancel,
  onContinue,
}: {
  step: Step
  canContinue: boolean
  saving: boolean
  onBack: () => void
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <footer className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-7">
      <button
        type="button"
        onClick={step === 1 ? onCancel : onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
      >
        <DashboardIcon name="chevron-left" className="h-4 w-4" />
        {step === 1 ? 'Cancel' : 'Back'}
      </button>

      <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 5`}>
        {STEPS.map((item, index) => (
          <span
            key={item.label}
            className={cn('h-1.5 rounded-full transition-all', index + 1 === step ? 'w-7 bg-primary' : 'w-3 bg-border')}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue || saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {step === 5 ? (
          <>
            <DashboardIcon name="check" className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Round'}
          </>
        ) : (
          <>
            Continue
            <DashboardIcon name="chevron-right" className="h-4 w-4" />
          </>
        )}
      </button>
    </footer>
  )
}

function RoundDetailsStep({
  roundName,
  day,
  frequency,
  description,
  onRoundName,
  onDay,
  onFrequency,
  onDescription,
}: {
  roundName: string
  day: string
  frequency: Frequency
  description: string
  onRoundName: (value: string) => void
  onDay: (value: string) => void
  onFrequency: (value: Frequency) => void
  onDescription: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Round name" required size="sm">
        <Input
          inputSize="sm"
          value={roundName}
          onChange={(event) => onRoundName(event.target.value)}
          placeholder="e.g. Alnwick Monday"
        />
      </Field>

      <div className="grid gap-6 pt-1 md:grid-cols-2">
        <Field label="Round day of week" required size="sm">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onDay(item)}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                  day === item
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-primary/20 bg-accent-surface text-primary',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Frequency / cycle" required size="sm">
          <div className="space-y-2">
            {FREQUENCIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onFrequency(item.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm',
                  frequency === item.value
                    ? 'border-primary/20 bg-accent-surface text-foreground'
                    : 'border-border bg-card text-foreground hover:bg-surface',
                )}
              >
                <span className="flex items-center gap-2">
                  {frequency === item.value ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  {item.label}
                </span>
                {item.default ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Default
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Description (optional)" size="sm">
        <Textarea
          value={description}
          onChange={(event) => onDescription(event.target.value)}
          placeholder="Any notes about this round..."
          rows={3}
        />
      </Field>
    </div>
  )
}

function AreasLoading() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex items-center gap-2 rounded-xl border border-border px-4 py-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function PropertiesStep({
  query,
  onQuery,
  results,
  searching,
  selected,
  onToggle,
}: {
  query: string
  onQuery: (value: string) => void
  results: CustomerListRow[]
  searching: boolean
  selected: Map<string, CustomerListRow>
  onToggle: (row: CustomerListRow) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">Add existing properties</p>
        <p className="mt-1 text-sm text-muted">
          Search unassigned properties to attach to this round. You can also assign properties later from Customers.
        </p>
      </div>

      <label className="relative block">
        <span className="sr-only">Search properties</span>
        <DashboardIcon name="search" className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          inputSize="sm"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by customer, address or postcode..."
          className="pl-10"
        />
      </label>

      {selected.size > 0 ? (
        <div className="flex flex-wrap gap-2">
          {[...selected.values()].map((row) => (
            <span
              key={row.propertyId}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-surface px-3 py-1 text-xs font-medium text-accent"
            >
              {row.addressLine}
              <button
                type="button"
                onClick={() => onToggle(row)}
                aria-label={`Remove ${row.addressLine}`}
                className="text-accent/70 hover:text-accent"
              >
                <DashboardIcon name="x-mark" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {query.trim().length < 2 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          Type at least 2 characters to search.
        </p>
      ) : searching ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No unassigned properties match &quot;{query}&quot;.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {results.map((row) => {
            const isSelected = row.propertyId ? selected.has(row.propertyId) : false

            return (
              <li key={row.propertyId}>
                <button
                  type="button"
                  onClick={() => onToggle(row)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                  >
                    {isSelected ? <DashboardIcon name="check" className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{row.addressLine}</span>
                    <span className="block truncate text-xs text-muted">
                      {row.customerName} · {row.postcode}
                    </span>
                  </span>
                  {row.price != null ? (
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(row.price)}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function CreateRoundModal({ open, onClose }: CreateRoundModalProps) {
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()
  const areasQuery = useServiceAreas(open)
  const techniciansQuery = useTechnicians(open)

  const createRound = useCreateRound()
  const setTechnicians = useSetRoundTechnicians()
  const createServiceArea = useCreateServiceArea()
  const updateProperty = useUpdateProperty()

  const [step, setStep] = useState<Step>(1)
  const [roundName, setRoundName] = useState('')
  const [day, setDay] = useState('Mon')
  const [frequency, setFrequency] = useState<Frequency>('FOUR_WEEKLY')
  const [description, setDescription] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [showAddArea, setShowAddArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaPostcodes, setNewAreaPostcodes] = useState('')

  const [propertyQuery, setPropertyQuery] = useState('')
  const [selectedProperties, setSelectedProperties] = useState<Map<string, CustomerListRow>>(new Map())

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const areas = useMemo(() => settingsServiceAreasToRows(areasQuery.data), [areasQuery.data])
  const technicians = useMemo(
    () => settingsTechniciansToRows(techniciansQuery.data).filter((technician) => technician.appStatus !== 'inactive'),
    [techniciansQuery.data],
  )

  const debouncedPropertyQuery = useDebouncedValue(propertyQuery, 300)
  const propertiesQuery = useCustomers(
    { search: debouncedPropertyQuery },
    open && step === 3 && debouncedPropertyQuery.trim().length >= 2,
  )
  const propertyResults = useMemo(
    () => (propertiesQuery.data?.customers ?? []).filter((row) => !row.roundId && row.propertyId),
    [propertiesQuery.data?.customers],
  )

  useEffect(() => {
    if (!open) return
    setStep(1)
    setRoundName('')
    setDay('Mon')
    setFrequency('FOUR_WEEKLY')
    setDescription('')
    setSelectedAreaId('')
    setShowAddArea(false)
    setNewAreaName('')
    setNewAreaPostcodes('')
    setPropertyQuery('')
    setSelectedProperties(new Map())
    setSelectedTechnicianId('')
    setSubmitError(null)
  }, [open])

  const selectedArea = areas.find((area) => area.id === selectedAreaId)
  const selectedTechnician = technicians.find((technician) => technician.id === selectedTechnicianId)
  const roundValue = [...selectedProperties.values()].reduce((total, row) => total + (row.price ?? 0), 0)

  const canContinue =
    canMutate &&
    !createRound.isPending &&
    (step === 1
      ? Boolean(roundName.trim() && day && frequency)
      : step === 2
        ? Boolean(selectedAreaId)
        : true)

  const saving = createRound.isPending || setTechnicians.isPending || updateProperty.isPending

  async function addServiceArea() {
    if (!newAreaName.trim()) return
    try {
      const created = await createServiceArea.mutateAsync({
        name: newAreaName.trim(),
        postcodeSector: newAreaPostcodes.trim() || undefined,
      })
      if (created.id) setSelectedAreaId(created.id)
      setNewAreaName('')
      setNewAreaPostcodes('')
      setShowAddArea(false)
    } catch (error) {
      showToast(errorMessage(error))
    }
  }

  function toggleProperty(row: CustomerListRow) {
    if (!row.propertyId) return
    setSelectedProperties((current) => {
      const next = new Map(current)
      if (next.has(row.propertyId!)) next.delete(row.propertyId!)
      else next.set(row.propertyId!, row)
      return next
    })
  }

  async function continueFlow() {
    if (!canContinue) return
    if (step < 5) {
      setStep((step + 1) as Step)
      return
    }

    const dayMap: Record<string, DayOfWeek> = {
      Mon: 'MON',
      Tue: 'TUE',
      Wed: 'WED',
      Thu: 'THU',
      Fri: 'FRI',
      Sat: 'SAT',
      Sun: 'SUN',
    }

    setSubmitError(null)
    try {
      const created = await createRound.mutateAsync({
        name: roundName.trim(),
        frequency,
        serviceAreaId: selectedAreaId,
        defaultDay: dayMap[day] ?? null,
        description: description.trim() || null,
      })

      if (selectedTechnicianId && created.id) {
        await setTechnicians.mutateAsync({ id: created.id, technicianIds: [selectedTechnicianId] })
      }

      const propertyIds = [...selectedProperties.keys()]
      if (propertyIds.length > 0 && created.id) {
        await Promise.all(
          propertyIds.map((propertyId) =>
            updateProperty.mutateAsync({ id: propertyId, input: { roundId: created.id } }),
          ),
        )
      }

      showToast('Round created', {
        description:
          propertyIds.length > 0
            ? `${roundName} is ready with ${propertyIds.length} ${propertyIds.length === 1 ? 'property' : 'properties'} attached. Visits are generated from Setup or as one-off jobs.`
            : `${roundName} is ready. Add properties and generate visits from Setup or the planner.`,
      })
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setSubmitError(error.message)
        return
      }
      setSubmitError(errorMessage(error))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Round"
      showHeader={false}
      maxWidthClass="max-w-4xl"
      className="!max-h-[92dvh] !rounded-2xl !p-0"
      bodyClassName="!m-0"
    >
      <ModalHeader step={step} onClose={onClose} />
      <Stepper step={step} />

      <div key={step} className="min-h-[26rem] animate-wizard-step px-5 py-5 sm:px-7">
        {!canMutate ? (
          <div className="rounded-xl border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground">
            You don&apos;t have permission to create rounds.
          </div>
        ) : null}

        {step === 1 ? (
          <RoundDetailsStep
            roundName={roundName}
            day={day}
            frequency={frequency}
            description={description}
            onRoundName={setRoundName}
            onDay={setDay}
            onFrequency={setFrequency}
            onDescription={setDescription}
          />
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">Existing areas</p>
              <p className="mt-1 text-sm text-muted">
                Link this round to a geographic area configured during setup.
              </p>
            </div>

            {areasQuery.isPending ? (
              <AreasLoading />
            ) : areas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                No service areas yet — add one below.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {areas.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedAreaId(area.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold',
                      selectedAreaId === area.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-primary/10 bg-accent-surface text-primary',
                    )}
                  >
                    <DashboardIcon name="map-pin" className="h-4 w-4" />
                    {area.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddArea((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <DashboardIcon name="plus" className="h-4 w-4" />
                Add Service Area
              </button>
            </div>

            {showAddArea ? (
              <div className="space-y-3 rounded-xl border border-primary/15 bg-accent-surface p-4">
                <p className="text-sm font-semibold text-foreground">Add New Area</p>
                <Input
                  inputSize="sm"
                  value={newAreaName}
                  onChange={(event) => setNewAreaName(event.target.value)}
                  placeholder="Area Name: Alnwick"
                />
                <Input
                  inputSize="sm"
                  value={newAreaPostcodes}
                  onChange={(event) => setNewAreaPostcodes(event.target.value)}
                  placeholder="Postcode sector (e.g. NE66)"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void addServiceArea()}
                    disabled={!newAreaName.trim() || createServiceArea.isPending}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {createServiceArea.isPending ? 'Adding…' : 'Add Area'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddArea(false)}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <PropertiesStep
            query={propertyQuery}
            onQuery={setPropertyQuery}
            results={propertyResults}
            searching={propertiesQuery.isFetching}
            selected={selectedProperties}
            onToggle={toggleProperty}
          />
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Select technician (optional — you can assign one later)
            </p>

            {techniciansQuery.isPending ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <Skeleton className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : technicians.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                No active technicians yet — add one from Technicians, or assign one later.
              </p>
            ) : (
              <div className="space-y-2">
                {technicians.map((technician) => {
                  const selected = technician.id === selectedTechnicianId
                  const initials = technician.displayName
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <button
                      key={technician.id}
                      type="button"
                      onClick={() => setSelectedTechnicianId(selected ? '' : technician.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left',
                        selected ? 'border-primary bg-accent-surface' : 'border-border bg-card hover:bg-surface',
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}>
                          {technician.displayName}
                        </span>
                      </span>
                      {selected ? <DashboardIcon name="check" className="h-4 w-4 text-foreground" /> : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <p className="border-b border-border bg-surface/60 px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                Round summary
              </p>
              <dl className="divide-y divide-border bg-surface/30">
                {[
                  ['Round Name', roundName],
                  ['Day', day],
                  ['Frequency', FREQUENCIES.find((item) => item.value === frequency)?.label ?? ''],
                  ['Area', selectedArea?.name ?? '—'],
                  ['Technician', selectedTechnician?.displayName ?? 'Unassigned'],
                  ['Properties', `${selectedProperties.size} properties`],
                  ...(selectedProperties.size > 0 ? [['Round Value', `${formatCurrency(roundValue)}/visit`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {selectedProperties.size > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-border">
                <p className="border-b border-border bg-surface/60 px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                  Properties ({selectedProperties.size})
                </p>
                <ul className="divide-y divide-border">
                  {[...selectedProperties.values()].map((row) => (
                    <li key={row.propertyId} className="flex items-center justify-between gap-4 px-4 py-3">
                      <span>
                        <span className="block text-sm font-medium text-foreground">{row.addressLine}</span>
                        <span className="block text-xs text-muted">{row.customerName}</span>
                      </span>
                      {row.price != null ? (
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(row.price)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-4">
              <DashboardIcon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <p className="text-xs text-muted">
                Creating a round does not create visits. Generate the round&apos;s recurring schedule from Setup
                (Activate System), or add a one-off job from the planner.
              </p>
            </div>

            {submitError ? <p className="text-sm text-danger">{submitError}</p> : null}
          </div>
        ) : null}
      </div>

      <ModalFooter
        step={step}
        canContinue={canContinue}
        saving={saving}
        onBack={() => setStep((step - 1) as Step)}
        onCancel={onClose}
        onContinue={() => void continueFlow()}
      />
    </Modal>
  )
}
