import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RoundDetail, RoundUpdateInput } from '@/api/rounds.api'
import type { DayOfWeek } from '@/api/types'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { RoundDetailsStep } from '@/components/round-planner/CreateRoundModal'
import { Field } from '@/components/ui'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { roundManageContent } from '@/content/round-planner'
import { useRound, useRounds, useUpdateRound } from '@/features/rounds/hooks/useRounds'
import { isRoundGone } from '@/features/rounds/lib/delete-round'
import { DAYS, type Frequency } from '@/features/rounds/lib/round-form'
import { useServiceAreas } from '@/features/settings/hooks/useSettings'
import { settingsServiceAreasToRows } from '@/features/settings/lib/mappers'
import { errorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/query-keys'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn, fillCopy } from '@/lib/utils'

interface EditRoundModalProps {
  /** The round to edit; `null` keeps the modal closed. */
  roundId: string | null
  onClose: () => void
}

const content = roundManageContent.editModal

/**
 * Edit a round's details — name, day, frequency, notes, service area and postcode sectors —
 * via PATCH /rounds/:id. Unlike Create Round it assigns no technician, moves no properties
 * and generates no visits: technicians are changed with Assign technician.
 */
export function EditRoundModal({ roundId, onClose }: EditRoundModalProps) {
  const open = roundId !== null
  const roundQuery = useRound(roundId ?? '', open)

  return (
    <Modal open={open} onClose={onClose} title={content.title} maxWidthClass="max-w-3xl">
      {roundQuery.data ? (
        <EditRoundForm key={roundQuery.data.id} round={roundQuery.data} onClose={onClose} />
      ) : roundQuery.isError ? (
        <p role="alert" className="text-sm text-danger">
          {content.loadError} {errorMessage(roundQuery.error)}
        </p>
      ) : (
        <div className="space-y-3" aria-label={content.loading}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </Modal>
  )
}

function dayLabel(value: string | null): string {
  return DAYS.find((day) => day.toUpperCase() === value) ?? ''
}

function sameSectors(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((sector) => b.includes(sector))
}

function EditRoundForm({ round, onClose }: { round: RoundDetail; onClose: () => void }) {
  const { canMutate } = useAppBootstrap()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const update = useUpdateRound()
  const areasQuery = useServiceAreas()
  const roundsQuery = useRounds()

  const savedSectors = useMemo(() => round.postcodeSectors ?? [], [round.postcodeSectors])
  const [name, setName] = useState(round.name)
  const [day, setDay] = useState(dayLabel(round.defaultDay))
  const [frequency, setFrequency] = useState<Frequency | null>(round.frequency)
  const [description, setDescription] = useState(round.description ?? '')
  const [areaId, setAreaId] = useState(round.serviceAreaId ?? '')
  const [sectors, setSectors] = useState<string[]>(savedSectors)
  const [error, setError] = useState<string | null>(null)

  const areas = useMemo(() => settingsServiceAreasToRows(areasQuery.data), [areasQuery.data])
  const area = areas.find((item) => item.id === areaId)
  // The area's sectors, plus any the round still has that the area no longer lists (so they can be removed).
  const sectorOptions = useMemo(() => {
    const options = [...(area?.postcodeSectors ?? [])]
    if (areaId === round.serviceAreaId) {
      for (const sector of savedSectors) if (!options.includes(sector)) options.push(sector)
    }
    return options
  }, [area?.postcodeSectors, areaId, round.serviceAreaId, savedSectors])

  /** Only what changed — PATCH leaves everything else as it is. */
  const changes = useMemo<RoundUpdateInput>(() => {
    const input: RoundUpdateInput = {}
    const trimmed = name.trim()
    if (trimmed !== round.name) input.name = trimmed
    const defaultDay = day ? (day.toUpperCase() as DayOfWeek) : null
    if (defaultDay !== round.defaultDay) input.defaultDay = defaultDay
    if (frequency !== round.frequency) input.frequency = frequency
    const notes = description.trim() || null
    if (notes !== (round.description ?? null)) input.description = notes
    if (areaId !== (round.serviceAreaId ?? '')) input.serviceAreaId = areaId
    // A new area always sends its sectors, so the old area's sectors can't linger.
    if (input.serviceAreaId !== undefined || !sameSectors(sectors, savedSectors)) input.postcodeSectors = sectors
    return input
  }, [areaId, day, description, frequency, name, round, savedSectors, sectors])

  const dirty = Object.keys(changes).length > 0

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setError(null)
    }
  }

  function chooseArea(id: string) {
    if (id === areaId) return
    setAreaId(id)
    // Sectors belong to one area — drop the previous area's picks.
    setSectors([])
    setError(null)
  }

  function toggleSector(sector: string) {
    setSectors((current) => (current.includes(sector) ? current.filter((item) => item !== sector) : [...current, sector]))
    setError(null)
  }

  function validate(): string | null {
    const trimmed = name.trim()
    if (!trimmed) return content.errors.name
    const lower = trimmed.toLowerCase()
    if ((roundsQuery.data ?? []).some((item) => item.id !== round.id && item.name.trim().toLowerCase() === lower)) {
      return fillCopy(content.errors.duplicateName, { name: trimmed })
    }
    if (!day) return content.errors.day
    if (!frequency) return content.errors.frequency
    if (!areaId) return content.errors.area
    return null
  }

  async function save() {
    if (!canMutate || !dirty) return
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    try {
      await update.mutateAsync({ id: round.id, input: changes })
      showToast(content.saved)
      onClose()
    } catch (err) {
      if (isRoundGone(err)) {
        showToast(content.gone)
        void queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all })
        onClose()
        return
      }
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      {!canMutate ? (
        <p className="rounded-xl border border-warning-border bg-warning-surface p-4 text-sm text-warning-foreground">
          {content.noPermission}
        </p>
      ) : null}

      <RoundDetailsStep
        roundName={name}
        day={day}
        frequency={frequency as Frequency}
        description={description}
        onRoundName={edit(setName)}
        onDay={edit(setDay)}
        onFrequency={edit(setFrequency)}
        onDescription={edit(setDescription)}
      />

      <Field label={content.area} required size="sm">
        {areasQuery.isPending ? (
          <Skeleton className="h-11 w-full" />
        ) : areas.length === 0 ? (
          <p className="text-sm text-muted">{content.noAreas}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areas.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === areaId}
                onClick={() => chooseArea(item.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold',
                  item.id === areaId
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-primary/10 bg-accent-surface text-primary',
                )}
              >
                <DashboardIcon name="map-pin" className="h-4 w-4" />
                {item.name}
              </button>
            ))}
          </div>
        )}
      </Field>

      {areaId && !areasQuery.isPending ? (
        <Field label={content.sectors} size="sm">
          {sectorOptions.length === 0 ? (
            <p className="text-sm text-muted">{content.noSectors}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted">{content.sectorsHint}</p>
              <div className="flex flex-wrap gap-2">
                {sectorOptions.map((sector) => {
                  const picked = sectors.includes(sector)
                  return (
                    <button
                      key={sector}
                      type="button"
                      aria-pressed={picked}
                      onClick={() => toggleSector(sector)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold',
                        picked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:bg-surface',
                      )}
                    >
                      {sector}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Field>
      ) : null}

      <div className="flex gap-3 rounded-2xl border border-border bg-surface/50 px-4 py-3">
        <DashboardIcon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        <p className="text-xs text-muted">
          {content.scheduleNote} {content.technicianNote}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ModalFooter>
        <ModalButton onClick={onClose} disabled={update.isPending}>
          {content.cancel}
        </ModalButton>
        <ModalButton
          variant="primary"
          loading={update.isPending}
          disabled={!canMutate || !dirty}
          onClick={() => void save()}
        >
          {update.isPending ? content.saving : content.save}
        </ModalButton>
      </ModalFooter>
    </div>
  )
}
