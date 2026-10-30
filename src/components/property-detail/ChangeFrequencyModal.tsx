import { useEffect, useState } from 'react'
import type { CleaningFrequency } from '@/api/types'
import type { PropertyDetailRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field } from '@/components/ui'
import {
  dropdownMenuClass,
  dropdownTriggerClass,
} from '@/components/ui/dropdown'
import { Modal, ModalButton, modalInfoPanelClass } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { FREQUENCY_LABELS } from '@/features/customers/lib/mappers'
import { useUpdateProperty } from '@/features/properties/hooks/useProperties'
import {
  movedToRoundMessage,
  parseNoMatchingRound,
  type NoMatchingRound,
  type RoundSuggestion,
} from '@/features/properties/lib/frequency-move'
import { useUpdateServicePlan } from '@/features/service-plans/hooks/useServicePlans'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface ChangeFrequencyModalProps {
  open: boolean
  property: PropertyDetailRecord | null
  onClose: () => void
}

const FREQUENCY_VALUES = [
  'FOUR_WEEKLY',
  'SIX_WEEKLY',
  'EIGHT_WEEKLY',
  'TWELVE_WEEKLY',
] as const satisfies readonly CleaningFrequency[]

function currentFrequencyValue(frequency: string): CleaningFrequency | '' {
  const match = FREQUENCY_VALUES.find(
    (value) =>
      frequency === value ||
      frequency === FREQUENCY_LABELS[value] ||
      frequency.toLowerCase() === FREQUENCY_LABELS[value].toLowerCase(),
  )
  if (match) return match

  const normalized = frequency.toLowerCase()
  if (normalized.includes('12 week')) return 'TWELVE_WEEKLY'
  if (normalized.includes('6 week')) return 'SIX_WEEKLY'
  if (normalized.includes('8 week')) return 'EIGHT_WEEKLY'
  if (normalized.includes('4 week')) return 'FOUR_WEEKLY'
  return ''
}

/**
 * Change cleaning frequency of the property's primary plan — PATCH /service-plans/:id, so a
 * multi-plan property changes the plan the summary shows. Falls back to PATCH /properties/:id
 * when there's no plan id. When no round in the area runs at the new frequency the API answers
 * 409 NO_MATCHING_ROUND (GAP-018): offer to create the proposed round (retry with
 * `createRoundIfMissing`) or move to a suggested round (`roundId`, which syncs the frequency).
 */
export function ChangeFrequencyModal({ open, property, onClose }: ChangeFrequencyModalProps) {
  const { changeFrequencyModal } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const updatePropertyMutation = useUpdateProperty()
  const updatePlan = useUpdateServicePlan()
  const planId = property?.primaryPlanId ?? null
  const [selected, setSelected] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [noMatch, setNoMatch] = useState<NoMatchingRound | null>(null)
  const pending = updatePlan.isPending || updatePropertyMutation.isPending

  const current = property ? currentFrequencyValue(property.frequency) : ''

  useEffect(() => {
    if (!open) return
    setSelected('')
    setMenuOpen(false)
    setNoMatch(null)
  }, [open, property?.id])

  if (!property) return null

  const selectedOption = changeFrequencyModal.options.find((option) => option.value === selected)
  const canSubmit = canMutate && Boolean(selected) && selected !== current && !pending

  async function handleSubmit(createRoundIfMissing = false) {
    if (!canSubmit || !property) return
    const input = {
      cleaningFrequency: selected as CleaningFrequency,
      ...(createRoundIfMissing ? { createRoundIfMissing: true } : {}),
    }
    try {
      const result = planId
        ? await updatePlan.mutateAsync({ id: planId, input })
        : await updatePropertyMutation.mutateAsync({ id: property.id, input })
      onClose()
      showToast(movedToRoundMessage(result.movedToRound))
    } catch (error) {
      const match = parseNoMatchingRound(error)
      if (match) {
        setNoMatch(match)
        return
      }
      // Surface the reason on every failure, including a 400 (e.g. the backend rejecting the frequency).
      showToast(errorMessage(error), { tone: 'error' })
    }
  }

  async function handleMoveToRound(round: RoundSuggestion) {
    if (!canSubmit || !property) return
    try {
      await updatePropertyMutation.mutateAsync({ id: property.id, input: { roundId: round.id } })
      onClose()
      showToast(changeFrequencyModal.movedToast.replace('{round}', round.name))
    } catch (error) {
      showToast(errorMessage(error), { tone: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={changeFrequencyModal.title}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      className="min-h-[30rem]"
      bodyClassName="space-y-5 pb-40"
      footer={
        <div className="flex justify-end gap-2">
          <ModalButton
            compact
            variant="secondary"
            className="rounded-lg"
            disabled={pending}
            onClick={onClose}
          >
            {changeFrequencyModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="rounded-lg"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {pending ? changeFrequencyModal.noMatch.working : changeFrequencyModal.actions.submit}
          </ModalButton>
        </div>
      }
    >
      <div className={cn(modalInfoPanelClass, 'grid gap-4 sm:grid-cols-2')}>
        <MetaItem label={changeFrequencyModal.labels.customer} value={property.customerName} />
        <MetaItem label={changeFrequencyModal.labels.address} value={property.fullAddress} />
        <MetaItem
          label={changeFrequencyModal.labels.currentFrequency}
          value={property.frequency}
        />
        <MetaItem
          label={changeFrequencyModal.labels.currentRound}
          value={property.assignedRound}
        />
      </div>

      <Field label={changeFrequencyModal.labels.newFrequency} size="sm" labelWeight="semibold">
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            disabled={pending}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(dropdownTriggerClass, 'min-h-10 rounded-lg px-3.5 py-2.5 text-sm')}
          >
            <span className={cn('truncate', !selectedOption && 'text-muted')}>
              {selectedOption?.label ?? changeFrequencyModal.placeholder}
            </span>
            <DashboardIcon
              name="chevron-down"
              className={cn('h-4 w-4 shrink-0 text-muted transition-transform', menuOpen && 'rotate-180')}
            />
          </button>

          {menuOpen ? (
            <ul
              role="listbox"
              className={cn(dropdownMenuClass, 'absolute z-20 mt-1 w-full')}
            >
              {changeFrequencyModal.options.map((option) => {
                const isCurrent = option.value === current
                const isSelected = option.value === selected

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelected(option.value)
                        setMenuOpen(false)
                        setNoMatch(null)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm',
                        isSelected ? 'bg-accent-surface text-accent' : 'text-foreground hover:bg-surface',
                      )}
                    >
                      <span className="font-medium">{option.label}</span>
                      {isCurrent ? (
                        <span className="rounded-md bg-muted/15 px-2 py-0.5 text-[11px] font-semibold text-muted">
                          {changeFrequencyModal.currentBadge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted">{changeFrequencyModal.helper}</p>
      </Field>

      {noMatch ? (
        <NoMatchingRoundPrompt
          noMatch={noMatch}
          disabled={pending}
          onCreate={() => void handleSubmit(true)}
          onMove={(round) => void handleMoveToRound(round)}
        />
      ) : null}
    </Modal>
  )
}

function NoMatchingRoundPrompt({
  noMatch,
  disabled,
  onCreate,
  onMove,
}: {
  noMatch: NoMatchingRound
  disabled: boolean
  onCreate: () => void
  onMove: (round: RoundSuggestion) => void
}) {
  const copy = propertyDetailContent.changeFrequencyModal.noMatch
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-warning-border bg-warning-surface/60 p-4">
      <p className="text-sm text-foreground">{noMatch.message}</p>
      {noMatch.proposedName ? (
        <ModalButton compact variant="primary" className="rounded-lg" disabled={disabled} onClick={onCreate}>
          {copy.create.replace('{name}', noMatch.proposedName)}
        </ModalButton>
      ) : null}
      {noMatch.suggestions.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted">{copy.pickTitle}</p>
          <ul className="mt-2 space-y-2">
            {noMatch.suggestions.map((round) => (
              <li key={round.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  {round.name}
                  {round.frequencyLabel ? (
                    <span className="ml-2 text-xs text-muted">
                      {copy.frequency.replace('{frequency}', round.frequencyLabel)}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onMove(round)}
                  className="font-semibold text-primary underline underline-offset-2 disabled:opacity-60"
                >
                  {copy.move.replace('{name}', round.name)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
