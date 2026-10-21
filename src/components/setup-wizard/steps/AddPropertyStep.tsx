import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Round, ServiceArea } from '@/api/types'
import type { AddPropertyData, PropertyDraft, PropertyRecord } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { SegmentCardGroup } from '@/components/setup-wizard/SegmentCardGroup'
import { ImportPropertiesPanel } from '@/components/setup-wizard/ImportPropertiesPanel'
import {
  OptionCard,
  StatusPill,
  WizardCard,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { primaryButtonClass, secondaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import { Field, FieldError, Input, MultiSelect, PhoneInput, Select } from '@/components/ui'
import { isValidEmail, isValidPhone } from '@/lib/contact'
import { focusFirstInvalid, hasErrors } from '@/lib/form-errors'
import { formatUkPostcode, isValidUkPostcode, matchAreaSector } from '@/lib/postcode'
import { cn, fillCopy } from '@/lib/utils'

export type PropertyDraftErrors = Partial<Record<keyof PropertyDraft, string>>

/** Sum the catalogue prices of the selected services (missing prices count as 0). */
function sumServicePrices(
  ids: readonly string[],
  prices: Readonly<Record<string, number>>,
): number {
  return ids.reduce((total, id) => total + (prices[id] ?? 0), 0)
}

/** Backend step number of Rounds — the copy points there by its stepper position. */
const ROUNDS_STEP = 8

interface AddPropertyStepProps {
  initialValues: AddPropertyData
  /** Areas with their postcode sectors — the postcode picks the area. */
  areas: ServiceArea[]
  rounds: Round[]
  /** Stepper position of the Rounds step, for the "no rounds" hint. */
  roundsStepNumber?: number
  serviceAreaOptions: SelectOption[]
  roundOptions: SelectOption[]
  serviceOptions?: SelectOption[]
  /** Catalogue default price per service id — prefills "Price per visit". */
  servicePrices?: Readonly<Record<string, number>>
  /** Payment method from Payment Setup, and which providers are connected. */
  defaultPaymentMethod: string
  connectedProviders: { gocardless: boolean; stripe: boolean }
  adding?: boolean
  onAddProperty: (draft: PropertyDraft) => Promise<void> | void
  /** Saves a whole CSV import in one request (POST /setup/step/9/bulk). */
  onAddProperties?: (drafts: PropertyDraft[]) => Promise<{ created: number }>
  onSubmit: () => void
}

/**
 * Inputs here that POST /setup/step/9 doesn't accept yet stay in this step only
 * (CONTRACT-DIFF): last cleaned date, the Direct Debit link checkbox and internal notes.
 */
interface LocalExtras {
  lastCleaned: string
  sendDdLink: boolean
}

export function SectionHeading({ children }: { children: string }) {
  return <h3 className="text-sm font-medium text-foreground">{children}</h3>
}

export function LabelWithHint({
  label,
  hint,
  hintClassName,
}: {
  label: string
  hint?: string
  hintClassName?: string
}) {
  return (
    <>
      {label}
      {hint ? (
        <>
          {' '}
          <span className={cn('font-normal', hintClassName ?? 'text-muted')}>{hint}</span>
        </>
      ) : null}
    </>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  )
}

/** Numbered section heading inside the add-property card. */
function NumberedSection({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {number}
        </span>
        {title}
      </h4>
      {children}
    </div>
  )
}

export function AddPropertyStep({
  initialValues,
  areas,
  rounds,
  roundsStepNumber = ROUNDS_STEP,
  serviceAreaOptions,
  roundOptions,
  serviceOptions = [],
  servicePrices = {},
  defaultPaymentMethod,
  connectedProviders,
  adding = false,
  onAddProperty,
  onAddProperties,
  onSubmit,
}: AddPropertyStepProps) {
  const { addProperty: legacyContent, properties: content, rounds: roundsContent, payments } = setupWizardContent
  const { fields, sections, round: roundCopy } = content

  const freshDraft = (): PropertyDraft => ({
    ...legacyContent.draftDefaults,
    paymentMethod: defaultPaymentMethod,
  })
  const freshExtras = (): LocalExtras => ({ lastCleaned: '', sendDdLink: true })

  const [properties, setProperties] = useState<PropertyRecord[]>(initialValues.properties)
  const [draft, setDraft] = useState<PropertyDraft>(freshDraft)
  const [extras, setExtras] = useState<LocalExtras>(freshExtras)
  /** False until the user picks a round themselves — until then the suggestion follows the postcode. */
  const [roundTouched, setRoundTouched] = useState(false)
  const [errors, setErrors] = useState<PropertyDraftErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setProperties(initialValues.properties)
  }, [initialValues.properties])

  const areaSectors = useMemo(
    () =>
      areas
        .filter((area): area is ServiceArea & { id: string } => Boolean(area.id))
        .map((area) => ({
          id: area.id,
          name: area.name ?? '',
          sectors: (area.postcodeSector ?? '').split(/[,;]/).map((sector) => sector.trim()).filter(Boolean),
        })),
    [areas],
  )

  const match = matchAreaSector(draft.postcode, areaSectors)
  const postcodeComplete = isValidUkPostcode(draft.postcode)
  const areaRounds = match ? rounds.filter((round) => round.serviceAreaId === match.area.id && round.id) : []
  const suggestedRoundId = areaRounds[0]?.id ?? ''

  // The postcode decides the area — keep the draft's area (and, until the user picks one,
  // its round) in step with it.
  const matchedAreaId = match?.area.id ?? ''
  useEffect(() => {
    setDraft((prev) =>
      prev.serviceArea === matchedAreaId && prev.assignServiceArea === matchedAreaId
        ? prev
        : { ...prev, serviceArea: matchedAreaId, assignServiceArea: matchedAreaId },
    )
  }, [matchedAreaId])
  useEffect(() => {
    if (roundTouched) return
    setDraft((prev) => (prev.round === suggestedRoundId ? prev : { ...prev, round: suggestedRoundId }))
  }, [suggestedRoundId, roundTouched])

  const notInRound = properties.filter((property) => !property.round).length

  const dayLabel = (value: string | null | undefined) =>
    roundsContent.days.find((day) => day.value === value)?.label ?? ''
  const roundLabel = (id: string) => rounds.find((round) => round.id === id)?.name ?? roundOptions.find((option) => option.value === id)?.label ?? id

  const paymentOptions = payments.methods.map((method) => ({
    value: method.value,
    label: method.label,
    disabled: method.requires ? !connectedProviders[method.requires] : false,
  }))

  function updateDraft<K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    setSaveError(null)
  }

  function chooseRound(roundId: string) {
    setRoundTouched(true)
    updateDraft('round', roundId)
  }

  function changeServices(nextIds: string[]) {
    // Price = sum of the selected services' catalogue prices — prefilled unless the user
    // already typed their own total.
    const previousSum = sumServicePrices(draft.serviceIds, servicePrices)
    const nextSum = sumServicePrices(nextIds, servicePrices)
    const untouched = !String(draft.pricePerVisit).trim() || Number(draft.pricePerVisit) === previousSum
    setDraft((prev) => ({
      ...prev,
      serviceIds: nextIds,
      serviceId: nextIds[0] ?? '',
      pricePerVisit: untouched ? (nextIds.length > 0 ? nextSum.toFixed(2) : '') : prev.pricePerVisit,
    }))
    setErrors((prev) => ({ ...prev, pricePerVisit: undefined }))
  }

  function validate(): PropertyDraftErrors {
    const v = legacyContent.validation
    const next: PropertyDraftErrors = {}
    if (!draft.postcode.trim()) next.postcode = v.postcodeRequired
    else if (!isValidUkPostcode(draft.postcode)) next.postcode = v.postcodeInvalid
    if (!draft.fullAddress.trim()) next.fullAddress = v.fullAddressRequired
    if (!draft.customerName.trim()) next.customerName = v.customerNameRequired
    if (!draft.phone.trim()) next.phone = v.phoneRequired
    else if (!isValidPhone(draft.phone)) next.phone = v.phoneInvalid
    if (draft.email.trim() && !isValidEmail(draft.email)) next.email = v.emailInvalid
    const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(price) || price <= 0) next.pricePerVisit = v.priceRequired
    return next
  }

  /** `keepContext` (Save & add another) keeps the area, round, services and payment for the next door. */
  async function saveProperty(keepContext: boolean) {
    if (adding) return
    const next = validate()
    setErrors(next)
    if (hasErrors(next)) {
      focusFirstInvalid(cardRef.current)
      return
    }

    const selectedRound = rounds.find((round) => round.id === draft.round)
    try {
      await onAddProperty({
        ...draft,
        postcode: formatUkPostcode(draft.postcode),
        // The round decides the frequency — properties inherit it.
        cleaningFrequency: selectedRound?.frequency ?? draft.cleaningFrequency,
      })
      if (keepContext) {
        setDraft((prev) => ({
          ...freshDraft(),
          postcode: prev.postcode,
          serviceArea: prev.serviceArea,
          assignServiceArea: prev.assignServiceArea,
          round: prev.round,
          propertyType: prev.propertyType,
          serviceIds: prev.serviceIds,
          serviceId: prev.serviceId,
          pricePerVisit: prev.pricePerVisit,
          paymentMethod: prev.paymentMethod,
        }))
      } else {
        setDraft(freshDraft())
        setRoundTouched(false)
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setExtras(freshExtras())
      setErrors({})
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not add property.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function roundDescription(round: Round) {
    const phrases: Record<string, string> = content.frequencyPhrases
    const frequency = phrases[round.frequency ?? ''] ?? ''
    return [
      fillCopy(roundCopy.summary, { day: dayLabel(round.defaultDay), frequency }),
      roundCopy.afterActivation,
    ].join(' · ')
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <WizardStepTitle icon={<HomeIcon />} title={content.heading} subtitle={content.subheading} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground sm:text-[15px]">
          {fillCopy(content.summary, { count: properties.length })}
          {notInRound > 0 ? ` · ${fillCopy(content.notInRound, { count: notInRound })}` : null}
        </p>
        {importing ? null : (
          <button type="button" onClick={() => setImporting(true)} className={secondaryButtonClass}>
            {content.importCsv}
          </button>
        )}
      </div>

      {importing ? (
        <WizardCard>
          <ImportPropertiesPanel
            roundOptions={roundOptions}
            serviceAreaOptions={serviceAreaOptions}
            serviceOptions={serviceOptions}
            servicePrices={servicePrices}
            draftDefaults={legacyContent.draftDefaults}
            onSaveProperty={onAddProperty}
            onSaveProperties={onAddProperties}
            onClose={() => setImporting(false)}
          />
        </WizardCard>
      ) : (
        <section ref={cardRef} className="scroll-mt-6 space-y-7 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{content.formTitle}</h3>

          <NumberedSection number={1} title={sections.address}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={fields.postcode.label} required labelWeight="medium" error={errors.postcode}>
                <div className="relative">
                  <Input
                    aria-invalid={Boolean(errors.postcode)}
                    value={draft.postcode}
                    onChange={(event) => updateDraft('postcode', event.target.value.toUpperCase().slice(0, 8))}
                    onBlur={() => postcodeComplete && updateDraft('postcode', formatUkPostcode(draft.postcode))}
                    placeholder={fields.postcode.placeholder}
                    autoComplete="postal-code"
                    className="pr-40"
                  />
                  {postcodeComplete ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <StatusPill tone={match ? 'primary' : 'warning'}>
                        {match ? fillCopy(fields.postcode.area, { area: match.area.name }) : fields.postcode.noArea}
                      </StatusPill>
                    </span>
                  ) : null}
                </div>
              </Field>
              <Field label={fields.propertyType.label} labelWeight="medium">
                <Select
                  value={draft.propertyType}
                  onChange={(event) => updateDraft('propertyType', event.target.value)}
                  options={legacyContent.propertyTypes}
                />
              </Field>
              <Field label={fields.address.label} required labelWeight="medium" error={errors.fullAddress} className="sm:col-span-2">
                <Input
                  aria-invalid={Boolean(errors.fullAddress)}
                  value={draft.fullAddress}
                  onChange={(event) => updateDraft('fullAddress', event.target.value)}
                  placeholder={fields.address.placeholder}
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </NumberedSection>

          <NumberedSection number={2} title={sections.round}>
            <div role="radiogroup" aria-label={sections.round} className="space-y-3">
              {(match ? areaRounds : []).map((round) => (
                <OptionCard
                  key={round.id}
                  selected={draft.round === round.id}
                  onSelect={() => chooseRound(round.id ?? '')}
                  title={round.name}
                  description={roundDescription(round)}
                  aside={
                    round.id === suggestedRoundId && match ? (
                      <StatusPill tone="neutral">{fillCopy(roundCopy.suggested, { sector: match.sector })}</StatusPill>
                    ) : undefined
                  }
                />
              ))}
              <OptionCard
                selected={!draft.round}
                onSelect={() => chooseRound('')}
                title={roundCopy.unassigned.label}
                description={roundCopy.unassigned.description}
              />
            </div>
            <p className="text-sm text-muted">
              {!match
                ? roundCopy.noAreaHint
                : areaRounds.length === 0
                  ? fillCopy(roundCopy.noRounds, { area: match.area.name, step: roundsStepNumber })
                  : fillCopy(roundCopy.areaHint, { area: match.area.name })}
            </p>
          </NumberedSection>

          <NumberedSection number={3} title={sections.customer}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={fields.customerName.label} required labelWeight="medium" error={errors.customerName}>
                <Input
                  aria-invalid={Boolean(errors.customerName)}
                  value={draft.customerName}
                  onChange={(event) => updateDraft('customerName', event.target.value)}
                  placeholder={fields.customerName.placeholder}
                  autoComplete="off"
                />
              </Field>
              <Field label={fields.mobile.label} required labelWeight="medium" error={errors.phone}>
                <PhoneInput
                  aria-invalid={Boolean(errors.phone)}
                  value={draft.phone}
                  onValueChange={(value) => updateDraft('phone', value)}
                  placeholder={fields.mobile.placeholder}
                />
              </Field>
              <Field label={fields.email.label} labelWeight="medium" error={errors.email}>
                <Input
                  type="email"
                  aria-invalid={Boolean(errors.email)}
                  value={draft.email}
                  onChange={(event) => updateDraft('email', event.target.value)}
                  placeholder={fields.email.placeholder}
                  autoComplete="off"
                />
                {errors.email ? null : <p className="mt-2 text-sm text-muted">{fields.email.hint}</p>}
              </Field>
              <Field label={fields.propertyName.label} labelWeight="medium">
                <Input
                  value={draft.propertyName}
                  onChange={(event) => updateDraft('propertyName', event.target.value)}
                  placeholder={fields.propertyName.placeholder}
                />
              </Field>
            </div>
          </NumberedSection>

          <NumberedSection number={4} title={sections.service}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={fields.services.label} labelWeight="medium">
                <MultiSelect
                  label={fields.services.placeholder}
                  placeholder={fields.services.placeholder}
                  displayMode="values"
                  showAllOption={false}
                  value={draft.serviceIds}
                  options={serviceOptions}
                  onChange={changeServices}
                />
              </Field>
              <Field label={fields.price.label} required labelWeight="medium" error={errors.pricePerVisit}>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] text-foreground">£</span>
                  <Input
                    inputMode="decimal"
                    aria-invalid={Boolean(errors.pricePerVisit)}
                    value={draft.pricePerVisit}
                    onChange={(event) => updateDraft('pricePerVisit', event.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
                {errors.pricePerVisit ? null : <p className="mt-2 text-sm text-muted">{fields.price.hint}</p>}
              </Field>
              <Field label={fields.paymentMethod.label} labelWeight="medium">
                <Select
                  value={draft.paymentMethod}
                  onChange={(event) => updateDraft('paymentMethod', event.target.value)}
                  options={paymentOptions}
                />
                <p className="mt-2 text-sm text-muted">{fields.paymentMethod.hint}</p>
              </Field>
              <Field label={fields.lastCleaned.label} labelWeight="medium">
                <Input
                  type="date"
                  value={extras.lastCleaned}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setExtras((prev) => ({ ...prev, lastCleaned: event.target.value }))}
                />
                <p className="mt-2 text-sm text-muted">{fields.lastCleaned.hint}</p>
              </Field>
            </div>
            {draft.paymentMethod === 'GOCARDLESS' ? (
              <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground sm:text-[15px]">
                <input
                  type="checkbox"
                  checked={extras.sendDdLink}
                  onChange={(event) => setExtras((prev) => ({ ...prev, sendDdLink: event.target.checked }))}
                  className="h-5 w-5 rounded border-border accent-primary"
                />
                {fields.sendDdLink.label}
              </label>
            ) : null}
          </NumberedSection>

          <NumberedSection number={5} title={sections.notes}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={fields.accessNotes.label} labelWeight="medium">
                <Input
                  value={draft.accessNotes}
                  onChange={(event) => updateDraft('accessNotes', event.target.value)}
                  placeholder={fields.accessNotes.placeholder}
                />
              </Field>
              <Field label={fields.riskNotes.label} labelWeight="medium">
                <Input
                  value={draft.riskNotes}
                  onChange={(event) => updateDraft('riskNotes', event.target.value)}
                  placeholder={fields.riskNotes.placeholder}
                />
              </Field>
              <Field label={fields.internalNotes.label} labelWeight="medium" className="sm:col-span-2">
                <Input
                  value={draft.customerNotes}
                  onChange={(event) => updateDraft('customerNotes', event.target.value)}
                  placeholder={fields.internalNotes.placeholder}
                />
              </Field>
            </div>
          </NumberedSection>

          {saveError ? <FieldError message={saveError} /> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => void saveProperty(true)} disabled={adding} className={secondaryButtonClass}>
              {content.actions.saveAndAdd}
            </button>
            <button type="button" onClick={() => void saveProperty(false)} disabled={adding} className={primaryButtonClass}>
              {adding ? content.actions.saving : content.actions.save}
            </button>
          </div>
        </section>
      )}

      {properties.length > 0 ? (
        <WizardCard heading={fillCopy(content.list.heading, { count: properties.length })}>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[32rem] text-left text-sm sm:text-[15px]">
              <thead className="bg-foreground/[0.025] text-sm text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-normal">{content.list.columns.property}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{content.list.columns.postcode}</th>
                  <th scope="col" className="px-5 py-3 font-normal">{content.list.columns.round}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{property.propertyName || property.fullAddress}</p>
                      <p className="mt-0.5 text-sm text-muted">{property.customerName}</p>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-foreground">{property.postcode}</td>
                    <td className="px-5 py-3.5">
                      {property.round ? (
                        <span className="text-foreground">{roundLabel(property.round)}</span>
                      ) : (
                        <StatusPill tone="warning">{content.list.notInRound}</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WizardCard>
      ) : null}
    </form>
  )
}

export function PropertyDetailsPanel({
  draft,
  sections,
  fields,
  serviceAreaOptions,
  propertyTypes,
  serviceAreaRequired = false,
  errors = {},
  onChange,
}: {
  draft: PropertyDraft
  sections: { customerProperty: string; address: string }
  fields: (typeof setupWizardContent)['addProperty']['fields']
  serviceAreaOptions: SelectOption[]
  propertyTypes: SelectOption[]
  /** Some callers (e.g. the standalone Add Property modal) require this against the live API. */
  serviceAreaRequired?: boolean
  errors?: PropertyDraftErrors
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <>
      <SectionHeading>{sections.customerProperty}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.customerName.label} required labelWeight="medium" size="sm" error={errors.customerName}>
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.customerName)}
            value={draft.customerName}
            onChange={(e) => onChange('customerName', e.target.value)}
            placeholder={fields.customerName.placeholder}
          />
        </Field>
        <Field
          label={
            <LabelWithHint
              label={fields.propertyName.label}
              hint={fields.propertyName.optional}
            />
          }
          labelWeight="medium"
          size="sm"
        >
          <Input
            inputSize="sm"
            value={draft.propertyName}
            onChange={(e) => onChange('propertyName', e.target.value)}
            placeholder={fields.propertyName.placeholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.phone.label} required labelWeight="medium" size="sm" error={errors.phone}>
            <PhoneInput
              inputSize="sm"
              aria-invalid={Boolean(errors.phone)}
              value={draft.phone}
              onValueChange={(value) => onChange('phone', value)}
              placeholder={fields.phone.placeholder}
            />
          </Field>
          <Field
            label={<LabelWithHint label={fields.landline.label} hint={fields.landline.optional} />}
            labelWeight="medium"
            size="sm"
            error={errors.landline}
          >
            <PhoneInput
              inputSize="sm"
              aria-invalid={Boolean(errors.landline)}
              value={draft.landline}
              onValueChange={(value) => onChange('landline', value)}
              placeholder={fields.landline.placeholder}
            />
          </Field>
        </div>
        <Field
          label={<LabelWithHint label={fields.email.label} hint={fields.email.optional} />}
          labelWeight="medium"
          size="sm"
          error={errors.email}
        >
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.email)}
            type="email"
            value={draft.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder={fields.email.placeholder}
          />
        </Field>
      </div>

      <SectionHeading>{sections.address}</SectionHeading>
      <div className="space-y-4">
        <Field label={fields.fullAddress.label} required labelWeight="medium" size="sm" error={errors.fullAddress}>
          <Input
            inputSize="sm"
            aria-invalid={Boolean(errors.fullAddress)}
            value={draft.fullAddress}
            onChange={(e) => onChange('fullAddress', e.target.value)}
            placeholder={fields.fullAddress.placeholder}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={fields.postcode.label} required labelWeight="medium" size="sm" error={errors.postcode}>
            <Input
              inputSize="sm"
              aria-invalid={Boolean(errors.postcode)}
              value={draft.postcode}
              onChange={(e) => onChange('postcode', e.target.value)}
              placeholder={fields.postcode.placeholder}
            />
          </Field>
          <Field
            label={fields.serviceArea.label}
            required={serviceAreaRequired}
            labelWeight="medium"
            size="sm"
          >
            <Select
              inputSize="sm"
              value={draft.serviceArea}
              onChange={(e) => onChange('serviceArea', e.target.value)}
              options={[{ value: '', label: fields.serviceArea.placeholder }, ...serviceAreaOptions]}
            />
          </Field>
        </div>
        <Field label={fields.propertyType.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.propertyType}
            onChange={(e) => onChange('propertyType', e.target.value)}
            options={propertyTypes}
          />
        </Field>
      </div>
    </>
  )
}

export function ServicePlanPanel({
  draft,
  fields,
  frequencies,
  vatOptions,
  paymentMethods,
  serviceOptions,
  servicePrices = {},
  showVat = true,
  errors = {},
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  frequencies: SelectOption[]
  vatOptions: SelectOption[]
  paymentMethods: SelectOption[]
  serviceOptions: SelectOption[]
  /** Catalogue default price per service id — prefills the price when a service is picked. */
  servicePrices?: Readonly<Record<string, number>>
  showVat?: boolean
  errors?: PropertyDraftErrors
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <span className="mb-2.5 block text-sm font-medium text-foreground">
          {fields.cleaningFrequency.label}
        </span>
        <SegmentCardGroup
          ariaLabel={fields.cleaningFrequency.label}
          options={frequencies.map((option) => ({ id: option.value, label: option.label }))}
          value={draft.cleaningFrequency}
          onChange={(value) => onChange('cleaningFrequency', value)}
        />
      </div>
      {serviceOptions.length > 0 ? (
        <Field label="Services" labelWeight="medium" size="sm">
          <MultiSelect
            inputSize="sm"
            label="Select services"
            placeholder="Select services"
            displayMode="values"
            showAllOption={false}
            value={draft.serviceIds}
            options={serviceOptions}
            onChange={(nextIds) => {
              // Price = sum of the selected services' catalogue prices. Prefill it
              // unless the user already typed a custom total.
              const previousSum = sumServicePrices(draft.serviceIds, servicePrices)
              const nextSum = sumServicePrices(nextIds, servicePrices)
              onChange('serviceIds', nextIds)
              onChange('serviceId', nextIds[0] ?? '')
              const untouched =
                !String(draft.pricePerVisit).trim() ||
                Number(draft.pricePerVisit) === previousSum
              if (untouched) {
                onChange('pricePerVisit', nextIds.length > 0 ? String(nextSum) : '')
              }
            }}
          />
        </Field>
      ) : null}
      <Field label={fields.pricePerVisit.label} required labelWeight="medium" size="sm" error={errors.pricePerVisit}>
        <Input
          inputSize="sm"
          inputMode="decimal"
          aria-invalid={Boolean(errors.pricePerVisit)}
          value={draft.pricePerVisit}
          onChange={(e) => onChange('pricePerVisit', e.target.value)}
          placeholder={fields.pricePerVisit.placeholder}
        />
        {Object.keys(servicePrices).length > 0 ? (
          <p className="mt-1.5 text-xs text-muted">{fields.pricePerVisit.hint}</p>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {showVat ? (
          <Field label={fields.vat.label} labelWeight="medium" size="sm">
            <Select
              inputSize="sm"
              value={draft.vat}
              onChange={(e) => onChange('vat', e.target.value)}
              options={vatOptions}
            />
          </Field>
        ) : null}
        <Field label={fields.paymentMethod.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={draft.paymentMethod}
            onChange={(e) => onChange('paymentMethod', e.target.value)}
            options={paymentMethods}
          />
        </Field>
      </div>
    </div>
  )
}

export function SchedulingPanel({
  draft,
  fields,
  preferredDays,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  preferredDays: SelectOption[]
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label={fields.startDate.label} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          type="date"
          value={draft.startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
          placeholder={fields.startDate.placeholder}
        />
      </Field>
      <Field
        label={<LabelWithHint label={fields.preferredDay.label} hint={fields.preferredDay.optional} />}
        labelWeight="medium"
        size="sm"
      >
        <Select
          inputSize="sm"
          value={draft.preferredDay}
          onChange={(e) => onChange('preferredDay', e.target.value)}
          options={preferredDays}
        />
      </Field>
      <Field
        label={<LabelWithHint label={fields.nextVisitDate.label} hint={fields.nextVisitDate.optional} />}
        labelWeight="medium"
        size="sm"
      >
        <Input
          inputSize="sm"
          type="date"
          value={draft.nextVisitDate}
          onChange={(e) => onChange('nextVisitDate', e.target.value)}
          placeholder={fields.nextVisitDate.placeholder}
          min={draft.startDate || undefined}
        />
      </Field>
    </div>
  )
}

export function RiskNotesPanel({
  draft,
  fields,
  showCustomerNotes = true,
  onChange,
}: {
  draft: PropertyDraft
  fields: (typeof setupWizardContent)['addProperty']['fields']
  showCustomerNotes?: boolean
  onChange: <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => void
}) {
  return (
    <div className="space-y-4">
      {showCustomerNotes ? (
        <Field
          label={<LabelWithHint label={fields.customerNotes.label} hint={fields.customerNotes.hint} />}
          labelWeight="medium"
          size="sm"
        >
          <Input
            inputSize="sm"
            value={draft.customerNotes}
            onChange={(e) => onChange('customerNotes', e.target.value)}
            placeholder={fields.customerNotes.placeholder}
          />
        </Field>
      ) : null}
      <Field
        label={
          <LabelWithHint
            label={fields.riskNotes.label}
            hint={fields.riskNotes.hint}
            hintClassName="text-danger"
          />
        }
        labelWeight="medium"
        size="sm"
      >
        <Input
          inputSize="sm"
          value={draft.riskNotes}
          onChange={(e) => onChange('riskNotes', e.target.value)}
          placeholder={fields.riskNotes.placeholder}
        />
      </Field>
      <Field label={fields.accessNotes.label} labelWeight="medium" size="sm">
        <Input
          inputSize="sm"
          value={draft.accessNotes}
          onChange={(e) => onChange('accessNotes', e.target.value)}
          placeholder={fields.accessNotes.placeholder}
        />
      </Field>
    </div>
  )
}
