import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Textarea, Toggle } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { useServiceAreas, useTechnicians } from '@/features/settings/hooks/useSettings'
import {
  settingsServiceAreasToRows,
  settingsTechniciansToRows,
} from '@/features/settings/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface CreateRoundModalProps {
  open: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4 | 5
type Frequency =
  | 'FOUR_WEEKLY'
  | 'SIX_WEEKLY'
  | 'EIGHT_WEEKLY'
  | 'MONTHLY'
  | 'FORTNIGHTLY'

interface DraftProperty {
  id: string
  address: string
  customer: string
  postcode: string
  price: number
  round?: string
}

const STEPS = [
  { label: 'Round Details', icon: 'file' },
  { label: 'Assign Area', icon: 'map-pin' },
  { label: 'Add Properties', icon: 'home' },
  { label: 'Assign Technician', icon: 'technicians' },
  { label: 'Review & Save', icon: 'check' },
] as const

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const FREQUENCIES: { value: Frequency; label: string; default?: boolean }[] = [
  { value: 'FOUR_WEEKLY', label: 'Every 4 weeks', default: true },
  { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
  { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
]

const INITIAL_PROPERTIES: DraftProperty[] = [
  {
    id: '14-high-street',
    address: '14 High Street',
    customer: 'John Smith',
    postcode: 'NE66 1AA',
    price: 35,
    round: 'Alnwick Monday',
  },
  {
    id: '22-green-road',
    address: '22 Green Road',
    customer: 'Mary Johnson',
    postcode: 'NE66 1BB',
    price: 28,
  },
  {
    id: '7-castle-lane',
    address: '7 Castle Lane',
    customer: 'Peter Brown',
    postcode: 'NE66 1CC',
    price: 42,
  },
  {
    id: '31-market-place',
    address: '31 Market Place',
    customer: 'Susan Davis',
    postcode: 'NE66 1DD',
    price: 30,
    round: 'Alnwick Wednesday',
  },
]

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
                complete
                  ? 'text-success'
                  : active
                    ? 'text-foreground'
                    : 'text-muted',
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

function ModalHeader({
  step,
  onClose,
}: {
  step: Step
  onClose: () => void
}) {
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
            className={cn(
              'h-1.5 rounded-full transition-all',
              index + 1 === step ? 'w-7 bg-primary' : 'w-3 bg-border',
            )}
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
            {saving ? 'Saving…' : 'Save & Generate Visits'}
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
  areaName,
  postcode,
  day,
  frequency,
  description,
  onRoundName,
  onAreaName,
  onPostcode,
  onDay,
  onFrequency,
  onDescription,
}: {
  roundName: string
  areaName: string
  postcode: string
  day: string
  frequency: Frequency
  description: string
  onRoundName: (value: string) => void
  onAreaName: (value: string) => void
  onPostcode: (value: string) => void
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
      <Field label="Service area name" size="sm">
        <Input
          inputSize="sm"
          value={areaName}
          onChange={(event) => onAreaName(event.target.value)}
          placeholder="e.g. Alnwick"
        />
      </Field>
      <Field label="Post code sector (optional)" size="sm">
        <Input
          inputSize="sm"
          value={postcode}
          onChange={(event) => onPostcode(event.target.value)}
          placeholder="e.g. NE66"
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
                  {frequency === item.value ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
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
  properties,
  selected,
  search,
  onSearch,
  onToggle,
  onAdd,
}: {
  properties: DraftProperty[]
  selected: Set<string>
  search: string
  onSearch: (value: string) => void
  onToggle: (id: string) => void
  onAdd: (property: DraftProperty) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [address, setAddress] = useState('')
  const [customer, setCustomer] = useState('')
  const [postcode, setPostcode] = useState('')
  const [price, setPrice] = useState('')

  const filtered = properties.filter((property) =>
    `${property.address} ${property.customer} ${property.postcode}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  function addProperty() {
    if (!address.trim() || !customer.trim()) return
    onAdd({
      id: `property-${Date.now()}`,
      address: address.trim(),
      customer: customer.trim(),
      postcode: postcode.trim(),
      price: Number(price) || 0,
    })
    setAddress('')
    setCustomer('')
    setPostcode('')
    setPrice('')
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search properties</span>
          <DashboardIcon
            name="search"
            className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <Input
            inputSize="sm"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search properties..."
            className="pl-10"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowAdd((value) => !value)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          New Property
        </button>
      </div>

      {showAdd ? (
        <div className="rounded-2xl bg-accent-surface p-4">
          <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
            Add new property inline
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              inputSize="sm"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Address"
              className="sm:col-span-2"
            />
            <Input
              inputSize="sm"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              placeholder="Customer name"
            />
            <Input
              inputSize="sm"
              value={postcode}
              onChange={(event) => setPostcode(event.target.value)}
              placeholder="Postcode"
            />
            <Input
              inputSize="sm"
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price £"
            />
            <button
              type="button"
              onClick={addProperty}
              disabled={!address.trim() || !customer.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Add Property
            </button>
          </div>
        </div>
      ) : null}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {filtered.map((property) => (
          <li key={property.id}>
            <button
              type="button"
              onClick={() => onToggle(property.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  selected.has(property.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
                )}
              >
                {selected.has(property.id) ? (
                  <DashboardIcon name="check" className="h-3.5 w-3.5" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {property.address}
                  {property.round ? (
                    <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[10px] text-warning-foreground">
                      {property.round}
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted">
                  {property.customer} · {property.postcode}
                </span>
              </span>
              <span className="text-sm font-semibold text-foreground">£{property.price}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CreateRoundModal({ open, onClose }: CreateRoundModalProps) {
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()
  const areasQuery = useServiceAreas(open)
  const techniciansQuery = useTechnicians(open)

  const [step, setStep] = useState<Step>(1)
  const [roundName, setRoundName] = useState('')
  const [areaName, setAreaName] = useState('')
  const [postcode, setPostcode] = useState('')
  const [day, setDay] = useState('Mon')
  const [frequency, setFrequency] = useState<Frequency>('FOUR_WEEKLY')
  const [description, setDescription] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [localAreas, setLocalAreas] = useState<{ id: string; name: string }[]>([])
  const [showAddArea, setShowAddArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaPostcodes, setNewAreaPostcodes] = useState('')
  const [properties, setProperties] = useState(INITIAL_PROPERTIES)
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())
  const [propertySearch, setPropertySearch] = useState('')
  const [autoAssign, setAutoAssign] = useState(false)
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [generateVisits, setGenerateVisits] = useState(true)
  const [saving, setSaving] = useState(false)

  const areas = useMemo(() => {
    const apiAreas = settingsServiceAreasToRows(areasQuery.data).map((area) => ({
      id: area.id,
      name: area.name,
    }))
    return [...apiAreas, ...localAreas]
  }, [areasQuery.data, localAreas])

  const technicians = useMemo(
    () =>
      settingsTechniciansToRows(techniciansQuery.data).filter(
        (technician) => technician.appStatus !== 'inactive',
      ),
    [techniciansQuery.data],
  )

  useEffect(() => {
    if (!open) return
    setStep(1)
    setRoundName('')
    setAreaName('')
    setPostcode('')
    setDay('Mon')
    setFrequency('FOUR_WEEKLY')
    setDescription('')
    setSelectedAreaId('')
    setLocalAreas([])
    setShowAddArea(false)
    setProperties(INITIAL_PROPERTIES)
    setSelectedProperties(new Set())
    setPropertySearch('')
    setAutoAssign(false)
    setSelectedTechnicianId('')
    setGenerateVisits(true)
    setSaving(false)
  }, [open])

  const selectedArea = areas.find((area) => area.id === selectedAreaId)
  const selectedTechnician = technicians.find(
    (technician) => technician.id === selectedTechnicianId,
  )
  const selectedPropertyRows = properties.filter((property) =>
    selectedProperties.has(property.id),
  )
  const roundValue = selectedPropertyRows.reduce(
    (total, property) => total + property.price,
    0,
  )

  const canContinue =
    canMutate &&
    (step === 1
      ? Boolean(roundName.trim() && day && frequency)
      : step === 2
        ? Boolean(selectedAreaId)
        : step === 3
          ? selectedProperties.size > 0
          : step === 4
            ? Boolean(selectedTechnicianId)
            : true)

  function addLocalArea() {
    if (!newAreaName.trim()) return
    const id = `local-area-${Date.now()}`
    setLocalAreas((current) => [
      ...current,
      { id, name: newAreaName.trim() },
    ])
    setSelectedAreaId(id)
    setNewAreaName('')
    setNewAreaPostcodes('')
    setShowAddArea(false)
  }

  function toggleProperty(id: string) {
    setSelectedProperties((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addProperty(property: DraftProperty) {
    setProperties((current) => [...current, property])
    setSelectedProperties((current) => new Set(current).add(property.id))
  }

  function handleAutoAssign(value: boolean) {
    setAutoAssign(value)
    if (value && technicians[0]) {
      setSelectedTechnicianId(technicians[0].id)
    }
  }

  function continueFlow() {
    if (!canContinue) return
    if (step < 5) {
      setStep((step + 1) as Step)
      return
    }

    // BACKEND-GAP: OpenAPI has no post-setup POST /rounds endpoint.
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      showToast(
        generateVisits
          ? 'Round saved and visits generated'
          : 'Round saved',
        { description: `${roundName} is ready in Round Planner.` },
      )
      onClose()
    }, 500)
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
            areaName={areaName}
            postcode={postcode}
            day={day}
            frequency={frequency}
            description={description}
            onRoundName={setRoundName}
            onAreaName={setAreaName}
            onPostcode={setPostcode}
            onDay={setDay}
            onFrequency={setFrequency}
            onDescription={setDescription}
          />
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
                Existing areas
              </p>
              <p className="mt-1 text-sm text-muted">
                Link this round to a geographic area configured during setup.
              </p>
            </div>

            {areasQuery.isPending ? (
              <AreasLoading />
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
                  placeholder="Postcode Sectors (e.g. NE66, NE67)"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addLocalArea}
                    disabled={!newAreaName.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Add Area
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
            properties={properties}
            selected={selectedProperties}
            search={propertySearch}
            onSearch={setPropertySearch}
            onToggle={toggleProperty}
            onAdd={addProperty}
          />
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Auto-assign (recommended)
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Pick the technician with the lightest workload in this area.
                </p>
              </div>
              <Toggle
                checked={autoAssign}
                onChange={handleAutoAssign}
                ariaLabel="Auto-assign technician"
              />
            </div>

            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Select technician *
            </p>

            {techniciansQuery.isPending ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <Skeleton className="h-10 w-10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                    <Skeleton className="h-1.5 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {technicians.map((technician, index) => {
                  const selected = technician.id === selectedTechnicianId
                  const workload = [84, 55, 52, 38][index % 4]
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
                      onClick={() => {
                        setSelectedTechnicianId(technician.id)
                        setAutoAssign(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left',
                        selected
                          ? 'border-primary bg-accent-surface'
                          : 'border-border bg-card hover:bg-surface',
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-sm font-medium',
                            selected ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {technician.displayName}
                        </span>
                        <span className="block text-xs text-muted">
                          {index} rounds currently assigned
                        </span>
                      </span>
                      {selected ? (
                        <DashboardIcon name="check" className="h-4 w-4 text-foreground" />
                      ) : null}
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                        <span
                          className="block h-full rounded-full bg-blue-400"
                          style={{ width: `${workload}%` }}
                        />
                      </span>
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
                  [
                    'Frequency',
                    FREQUENCIES.find((item) => item.value === frequency)?.label ?? '',
                  ],
                  ['Area', selectedArea?.name ?? areaName],
                  ['Technician', selectedTechnician?.displayName ?? 'Unassigned'],
                  ['Properties', `${selectedProperties.size} properties`],
                  ['Round Value', `£${roundValue}/visit`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
              <p className="border-b border-border bg-surface/60 px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                Properties ({selectedProperties.size})
              </p>
              <ul className="divide-y divide-border">
                {selectedPropertyRows.map((property) => (
                  <li
                    key={property.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {property.address}
                      </span>
                      <span className="block text-xs text-muted">{property.customer}</span>
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      £{property.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setGenerateVisits((value) => !value)}
              className="flex w-full items-start gap-3 rounded-2xl border border-primary bg-accent-surface px-4 py-4 text-left"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                  generateVisits
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card',
                )}
              >
                {generateVisits ? (
                  <DashboardIcon name="check" className="h-3.5 w-3.5" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-primary">
                  Generate visits for this round now
                </span>
                <span className="mt-1 block text-xs text-foreground">
                  Creates {selectedProperties.size} scheduled visits immediately — they&apos;ll
                  appear in Today&apos;s Work for {selectedTechnician?.displayName ?? 'the technician'}.
                </span>
              </span>
              <DashboardIcon name="send" className="h-5 w-5 text-primary" />
            </button>
          </div>
        ) : null}
      </div>

      <ModalFooter
        step={step}
        canContinue={canContinue}
        saving={saving}
        onBack={() => setStep((step - 1) as Step)}
        onCancel={onClose}
        onContinue={continueFlow}
      />
    </Modal>
  )
}
