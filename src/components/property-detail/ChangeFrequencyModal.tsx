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
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
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

/** Change cleaning frequency — PATCH property.cleaningFrequency. */
export function ChangeFrequencyModal({ open, property, onClose }: ChangeFrequencyModalProps) {
  const { changeFrequencyModal } = propertyDetailContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const updateProperty = useUpdateProperty()
  const [selected, setSelected] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const current = property ? currentFrequencyValue(property.frequency) : ''

  useEffect(() => {
    if (!open) return
    setSelected('')
    setMenuOpen(false)
  }, [open, property?.id])

  if (!property) return null

  const selectedOption = changeFrequencyModal.options.find((option) => option.value === selected)
  const canSubmit =
    canMutate && Boolean(selected) && selected !== current && !updateProperty.isPending

  async function handleSubmit() {
    if (!canSubmit || !property || !selected) return
    try {
      await updateProperty.mutateAsync({
        id: property.id,
        input: { cleaningFrequency: selected as CleaningFrequency },
      })
      onClose()
      showToast(changeFrequencyModal.successToast)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) return
      showToast(error instanceof Error ? error.message : 'Could not change frequency')
    }
  }

  return (
    <Modal
      open={open}
      onClose={updateProperty.isPending ? () => undefined : onClose}
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
            disabled={updateProperty.isPending}
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
            {updateProperty.isPending ? 'Saving…' : changeFrequencyModal.actions.submit}
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
            disabled={updateProperty.isPending}
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
    </Modal>
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
