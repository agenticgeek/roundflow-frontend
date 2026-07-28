import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, FieldError, Select } from '@/components/ui'
import { PropertyClipboardIcon } from '@/components/setup-wizard/PropertyClipboardIcon'
import { SetupStepHeader } from '@/components/setup-wizard/SetupStepHeader'
import { SubStepFooter } from '@/components/setup-wizard/SubStepFooter'
import { VerticalSubStepper } from '@/components/setup-wizard/VerticalSubStepper'
import {
  PropertyDetailsPanel,
  RiskNotesPanel,
  SchedulingPanel,
  ServicePlanPanel,
} from '@/components/setup-wizard/steps/AddPropertyStep'
import { setupWizardContent } from '@/content/setup-wizard'
import { addPropertyModalContent } from '@/content/add-property-modal'
import type { PropertyDraft } from '@/types/setup-wizard'
import { useServiceAreas, useServices, useTechnicians } from '@/features/settings/hooks/useSettings'
import { settingsServiceAreasToRows, settingsTechniciansToRows } from '@/features/settings/lib/mappers'
import { useCreateProperty } from '@/features/properties/hooks/useProperties'
import type { PaymentMethod, PropertyCreateInput } from '@/api/types'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface AddPropertyModalProps {
  open: boolean
  onClose: () => void
}

type AssignMode = 'now' | 'later'

interface AddPropertyDraft extends PropertyDraft {
  assignMode: AssignMode
  roundDay: string
  technicianId: string
}

const ROUND_DAYS = [
  { value: '', label: 'Select day' },
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
]

// DEV-TESTING: sample options so the dropdowns are visibly interactive while the
// account has no real data yet (or the API is unreachable). Dev-only — never
// shown in production, where an empty list should mean "go add one" instead.
const DUMMY_SERVICE_AREAS = [
  { value: 'dummy-area-alnwick', label: 'Alnwick (sample)' },
  { value: 'dummy-area-newcastle', label: 'Newcastle (sample)' },
  { value: 'dummy-area-morpeth', label: 'Morpeth (sample)' },
]

const DUMMY_TECHNICIANS = [
  { value: 'dummy-tech-james', label: 'James Smith (sample)' },
  { value: 'dummy-tech-sarah', label: 'Sarah Johnson (sample)' },
  { value: 'dummy-tech-michael', label: 'Michael Brown (sample)' },
]

const DUMMY_SERVICES = [
  { value: 'dummy-service-standard', label: 'Standard Window Clean (sample)' },
  { value: 'dummy-service-gutter', label: 'Gutter Clearing (sample)' },
]

const DUMMY_ROUNDS = [
  { value: 'Alnwick Monday', label: 'Alnwick Monday (sample)' },
  { value: 'Alnwick Wednesday', label: 'Alnwick Wednesday (sample)' },
  { value: 'Newcastle Tuesday', label: 'Newcastle Tuesday (sample)' },
]

function withDummyFallback<T>(rows: T[], dummy: T[]): T[] {
  if (rows.length > 0) return rows
  return import.meta.env.DEV ? dummy : rows
}

/** Dummy option values are sample data only — never a real backend ID. */
function isDummyId(value: string): boolean {
  return value.startsWith('dummy-')
}

/** Strips dummy sample IDs so they're never sent to the real API. */
function realId(value: string): string | undefined {
  return value && !isDummyId(value) ? value : undefined
}

function draftDefaults(): AddPropertyDraft {
  return {
    ...setupWizardContent.addProperty.draftDefaults,
    assignMode: 'later',
    roundDay: '',
    technicianId: '',
  }
}

function AssignOptionCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean
  icon: string
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-primary/20 bg-accent-surface text-foreground hover:bg-accent-surface/70',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-primary-foreground' : 'border-primary/40',
        )}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <DashboardIcon name={icon} className="h-4 w-4" />
          {title}
        </span>
        <span
          className={cn(
            'mt-1 block text-xs leading-snug',
            selected ? 'text-primary-foreground/90' : 'text-muted',
          )}
        >
          {description}
        </span>
      </span>
    </button>
  )
}

function AssignRoundPanel({
  draft,
  roundOptions,
  technicianOptions,
  onChange,
}: {
  draft: AddPropertyDraft
  roundOptions: { value: string; label: string }[]
  technicianOptions: { value: string; label: string }[]
  onChange: <K extends keyof AddPropertyDraft>(key: K, value: AddPropertyDraft[K]) => void
}) {
  const { assignRound } = addPropertyModalContent

  return (
    <div className="space-y-4">
      <AssignOptionCard
        selected={draft.assignMode === 'now'}
        icon="calendar"
        title={assignRound.now.title}
        description={assignRound.now.description}
        onClick={() => onChange('assignMode', 'now')}
      />

      {draft.assignMode === 'now' ? (
        <div className="space-y-4 pl-1">
          <Field label={assignRound.fields.round.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={draft.round}
              onChange={(e) => onChange('round', e.target.value)}
              options={[{ value: '', label: assignRound.fields.round.placeholder }, ...roundOptions]}
            />
          </Field>
          <Field label={assignRound.fields.roundDay.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={draft.roundDay}
              onChange={(e) => onChange('roundDay', e.target.value)}
              options={ROUND_DAYS}
            />
          </Field>
          <Field label={assignRound.fields.technician.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={draft.technicianId}
              onChange={(e) => onChange('technicianId', e.target.value)}
              options={[
                { value: '', label: assignRound.fields.technician.placeholder },
                ...technicianOptions,
              ]}
            />
          </Field>
          <p className="text-xs text-muted">{assignRound.fields.technician.hint}</p>
        </div>
      ) : null}

      <AssignOptionCard
        selected={draft.assignMode === 'later'}
        icon="clock"
        title={assignRound.later.title}
        description={assignRound.later.description}
        onClick={() => onChange('assignMode', 'later')}
      />
    </div>
  )
}

/** Standalone "Add Property" quick action — reuses the setup wizard's property sub-steps. */
export function AddPropertyModal({ open, onClose }: AddPropertyModalProps) {
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()
  const areasQuery = useServiceAreas(open)
  const techniciansQuery = useTechnicians(open)
  const servicesQuery = useServices()
  const createProperty = useCreateProperty()

  const { addProperty: addPropertyContent } = setupWizardContent
  const { subSteps } = addPropertyModalContent
  const { sections, fields } = addPropertyContent

  const [draft, setDraft] = useState<AddPropertyDraft>(draftDefaults)
  const [subStep, setSubStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(draftDefaults())
    setSubStep(0)
    setError(null)
  }, [open])

  const serviceAreaRows = useMemo(
    () => settingsServiceAreasToRows(areasQuery.data),
    [areasQuery.data],
  )
  const serviceAreaOptions = useMemo(
    () => withDummyFallback(serviceAreaRows.map((area) => ({ value: area.id, label: area.name })), DUMMY_SERVICE_AREAS),
    [serviceAreaRows],
  )
  const technicianOptions = useMemo(
    () =>
      withDummyFallback(
        settingsTechniciansToRows(techniciansQuery.data)
          .filter((technician) => technician.appStatus !== 'inactive')
          .map((technician) => ({ value: technician.id, label: technician.displayName })),
        DUMMY_TECHNICIANS,
      ),
    [techniciansQuery.data],
  )
  const serviceOptions = useMemo(
    () =>
      withDummyFallback(
        (servicesQuery.data ?? [])
          .filter((service) => service.active !== false && service.id && service.name)
          .map((service) => ({ value: service.id as string, label: service.name as string })),
        DUMMY_SERVICES,
      ),
    [servicesQuery.data],
  )
  // BACKEND-GAP: no GET /rounds listing endpoint exists yet, so round options are
  // derived from each service area's linked-round names rather than real round IDs.
  const roundOptions = useMemo(() => {
    const names = new Set<string>()
    for (const area of serviceAreaRows) {
      for (const name of area.linkedRounds.names) names.add(name)
    }
    return withDummyFallback(
      Array.from(names).map((name) => ({ value: name, label: name })),
      DUMMY_ROUNDS,
    )
  }, [serviceAreaRows])

  const currentMeta = subSteps[subStep]

  function updateDraft<K extends keyof AddPropertyDraft>(key: K, value: AddPropertyDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    if (error) setError(null)
  }

  function resetDraft() {
    setDraft(draftDefaults())
    setSubStep(0)
    setError(null)
  }

  function validateSubStep(): boolean {
    const { validation } = addPropertyContent
    if (subStep === 0 && !draft.customerName.trim()) {
      setError(validation.customerNameRequired)
      return false
    }
    if (subStep === 0 && !draft.fullAddress.trim()) {
      setError(validation.fullAddressRequired)
      return false
    }
    if (subStep === 0 && !draft.postcode.trim()) {
      setError(validation.postcodeRequired)
      return false
    }
    if (subStep === 0 && !draft.serviceArea) {
      setError(addPropertyModalContent.validation.serviceAreaRequired)
      return false
    }
    if (subStep === 1) {
      const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, ''))
      if (!Number.isFinite(price) || price <= 0) {
        setError(validation.priceRequired)
        return false
      }
    }
    if (subStep === 4 && draft.assignMode === 'now' && !draft.round) {
      setError(validation.roundRequired)
      return false
    }
    return true
  }

  function handleSubContinue() {
    if (!validateSubStep()) return
    setSubStep((index) => Math.min(index + 1, subSteps.length - 1))
  }

  function handleSubBack() {
    setError(null)
    setSubStep((index) => Math.max(index - 1, 0))
  }

  async function saveProperty() {
    if (!validateSubStep() || !canMutate || createProperty.isPending) return

    const propertyLabel = draft.propertyName.trim() || draft.customerName.trim()

    if (isDummyId(draft.serviceArea)) {
      // DEV-TESTING: the selected service area is sample data with no real backend
      // ID — simulate a successful save instead of sending a fake ID the API would
      // reject. Pick a real service area (Settings → Service Areas) to save for real.
      showToast('Property saved (sample data)', { description: addPropertyModalContent.sampleDataNotice })
      onClose()
      return
    }

    const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, '')) || 0
    const input: PropertyCreateInput = {
      customerName: draft.customerName.trim(),
      addressLine: draft.fullAddress.trim(),
      postcode: draft.postcode.trim(),
      price,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      propertyName: draft.propertyName.trim() || undefined,
      propertyType: draft.propertyType || undefined,
      serviceAreaId: draft.serviceArea,
      serviceId: realId(draft.serviceId),
      paymentMethod: (draft.paymentMethod || undefined) as PaymentMethod | undefined,
      accessNotes: draft.accessNotes.trim() || undefined,
      riskNotes: draft.riskNotes.trim() || undefined,
      nextDueDate: draft.nextVisitDate || undefined,
      // Round assignment isn't submitted yet — see BACKEND-GAP above on roundOptions.
      roundId: null,
    }

    try {
      await createProperty.mutateAsync(input)
      showToast('Property saved', { description: `${propertyLabel} has been added.` })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const addPropertyButton = (
    <button
      type="button"
      onClick={resetDraft}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
    >
      <span aria-hidden="true">+</span>
      {addPropertyContent.addProperty}
    </button>
  )

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={addPropertyModalContent.closeLabel}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <DashboardIcon name="x-mark" className="h-5 w-5" />
    </button>
  )

  const isLastStep = subStep === subSteps.length - 1
  const continueLabel = isLastStep
    ? createProperty.isPending
      ? 'Saving…'
      : draft.assignMode === 'now'
        ? addPropertyModalContent.assignRound.actions.assignAndSave
        : addPropertyModalContent.assignRound.actions.saveProperty
    : undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={addPropertyModalContent.title}
      showHeader={false}
      maxWidthClass="max-w-4xl"
      className="!max-h-[92dvh] !rounded-2xl scrollbar-card"
    >
      <div className="flex gap-6 lg:gap-8">
        <VerticalSubStepper steps={subSteps} currentIndex={subStep} />

        <div className="min-w-0 flex-1">
          <SetupStepHeader
            icon={<PropertyClipboardIcon />}
            title={currentMeta.title}
            subtitle={currentMeta.subtitle}
            action={
              <div className="flex items-center gap-2">
                {subStep === 0 ? addPropertyButton : null}
                {closeButton}
              </div>
            }
          />

          {!canMutate ? (
            <div className="mb-4 rounded-xl border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground">
              You don&apos;t have permission to add properties.
            </div>
          ) : null}

          <div className="space-y-5">
            {subStep === 0 ? (
              <PropertyDetailsPanel
                draft={draft}
                sections={sections}
                fields={fields}
                serviceAreaOptions={serviceAreaOptions}
                propertyTypes={addPropertyContent.propertyTypes}
                serviceAreaRequired
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 1 ? (
              <ServicePlanPanel
                draft={draft}
                fields={fields}
                frequencies={addPropertyContent.cleaningFrequencies}
                vatOptions={addPropertyContent.vatOptions}
                paymentMethods={addPropertyContent.paymentMethods}
                serviceOptions={serviceOptions}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 2 ? (
              <SchedulingPanel
                draft={draft}
                fields={fields}
                preferredDays={addPropertyContent.preferredDays}
                onChange={updateDraft}
              />
            ) : null}

            {subStep === 3 ? <RiskNotesPanel draft={draft} fields={fields} onChange={updateDraft} /> : null}

            {subStep === 4 ? (
              <AssignRoundPanel
                draft={draft}
                roundOptions={roundOptions}
                technicianOptions={technicianOptions}
                onChange={updateDraft}
              />
            ) : null}

            {error ? <FieldError message={error} size="sm" /> : null}
          </div>

          <SubStepFooter
            currentStep={subStep + 1}
            totalSteps={subSteps.length}
            isFirstStep={subStep === 0}
            onBack={handleSubBack}
            onContinue={isLastStep ? () => void saveProperty() : handleSubContinue}
            continueLabel={continueLabel}
          />
        </div>
      </div>
    </Modal>
  )
}
