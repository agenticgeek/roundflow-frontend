import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RoundListItem } from '@/api/rounds.api'
import type { TechnicianListItem } from '@/api/technicians.api'
import { ROUTES } from '@/config/routes'
import { assignTechniciansContent as content } from '@/content/round-planner'
import { Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import {
  ChoiceChip,
  InfoNote,
  OptionCard,
  StatusPill,
  WarningNote,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { primaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import {
  useRoundDetails,
  useRoundOccurrenceDay,
  useRounds,
  useRoundsOccurrences,
  useSetRoundTechnicians,
} from '@/features/rounds/hooks/useRounds'
import { useServiceAreas } from '@/features/settings/hooks/useSettings'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { addDays, formatShortDate, todayIso } from '@/lib/round-dates'
import { cn, fillCopy } from '@/lib/utils'

type AssignMode = 'one' | 'split'

interface FirstVisit {
  date: string
  visits: number
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4a6.5 6.5 0 0 1 3.5 5.6" strokeLinecap="round" />
    </svg>
  )
}

/** `4 Hotspur Street, Alnwick` → `Hotspur Street` — the part of the address jobs are grouped by. */
function streetOf(addressLine: string): string {
  const firstPart = addressLine.split(',')[0] ?? addressLine
  return firstPart.replace(/^\s*(flat|apartment|unit)\s+\w+\s*/i, '').replace(/^\s*\d+[a-z]?\s+/i, '').trim() || firstPart.trim()
}

/** Keeps each street with one technician, giving the next-biggest street to whoever has fewest jobs. */
function splitByStreet(addresses: readonly string[], technicianIds: readonly string[]) {
  const streets = new Map<string, number>()
  for (const address of addresses) {
    const street = streetOf(address)
    streets.set(street, (streets.get(street) ?? 0) + 1)
  }
  const shares = technicianIds.map((id) => ({ id, jobs: 0, streets: [] as string[] }))
  for (const [street, jobs] of [...streets].sort((a, b) => b[1] - a[1])) {
    const target = shares.reduce((min, share) => (share.jobs < min.jobs ? share : min), shares[0]!)
    target.jobs += jobs
    target.streets.push(street)
  }
  return shares
}

function SplitPreview({
  roundId,
  date,
  technicianIds,
  technicianName,
}: {
  roundId: string
  date: string
  technicianIds: string[]
  technicianName: (id: string) => string
}) {
  const day = useRoundOccurrenceDay(roundId, date)
  const shares = useMemo(
    () => splitByStreet((day.data?.stops ?? []).map((stop) => stop.addressLine), technicianIds),
    [day.data, technicianIds],
  )
  if (day.isPending) return <div className="h-20 animate-pulse rounded-xl bg-foreground/[0.04]" />
  if (!day.data) return null

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {shares.map((share) => (
          <div key={share.id} className="rounded-xl border border-border bg-foreground/[0.02] px-5 py-4">
            <p className="text-[15px] font-medium text-foreground">{technicianName(share.id)}</p>
            <p className="mt-0.5 text-sm text-muted">
              {fillCopy(content.round.splitSummary, {
                count: share.jobs,
                streets: share.streets.slice(0, 3).join(', ') + (share.streets.length > 3 ? '…' : ''),
              })}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">{content.round.splitNote}</p>
    </>
  )
}

function RoundCard({
  round,
  firstVisit,
  technicians,
  selected,
  mode,
  onToggle,
  onModeChange,
}: {
  round: RoundListItem
  firstVisit: FirstVisit | null
  technicians: TechnicianListItem[]
  selected: string[]
  mode: AssignMode
  onToggle: (technicianId: string) => void
  onModeChange: (mode: AssignMode) => void
}) {
  const areaName = round.serviceAreaName ?? ''
  const covers = (technician: TechnicianListItem) =>
    technician.serviceAreas.some((assignment) => assignment.serviceAreaId === round.serviceAreaId)
  // Technicians covering the round's area first.
  const ordered = [...technicians].sort((a, b) => Number(covers(b)) - Number(covers(a)))
  const hasSuggested = areaName && technicians.some(covers)
  const visits = firstVisit?.visits ?? 0
  const technicianName = (id: string) => technicians.find((technician) => technician.id === id)?.name ?? '—'

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground sm:text-lg">{round.name}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {firstVisit
              ? fillCopy(content.round.meta, { date: formatShortDate(firstVisit.date), visits, area: areaName })
              : content.round.noVisits}
          </p>
        </div>
        {firstVisit ? (
          selected.length > 0 ? (
            <StatusPill tone="success">{fillCopy(content.round.assigned, { count: visits })}</StatusPill>
          ) : (
            <StatusPill tone="warning">{fillCopy(content.round.unassigned, { count: visits })}</StatusPill>
          )
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm text-foreground">
          {hasSuggested ? fillCopy(content.round.suggested, { area: areaName }) : content.round.technicians}
        </p>
        {ordered.length === 0 ? (
          <p className="text-sm text-muted">{content.round.noTechnicians}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ordered.map((technician) => (
              <ChoiceChip
                key={technician.id}
                label={technician.name ?? '—'}
                selected={selected.includes(technician.id)}
                onClick={() => onToggle(technician.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selected.length >= 2 ? (
        <>
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
            <OptionCard selected={mode === 'one'} onSelect={() => onModeChange('one')} title={content.round.oneDoesAll} />
            <OptionCard
              selected={mode === 'split'}
              onSelect={() => onModeChange('split')}
              title={content.round.split.label}
              description={content.round.split.description}
            />
          </div>
          {mode === 'split' && firstVisit ? (
            <SplitPreview
              roundId={round.id}
              date={firstVisit.date}
              technicianIds={selected}
              technicianName={technicianName}
            />
          ) : null}
        </>
      ) : null}

      {selected.length === 0 && firstVisit ? (
        <WarningNote>{fillCopy(content.round.warning, { date: formatShortDate(firstVisit.date) })}</WarningNote>
      ) : null}
    </section>
  )
}

export function AssignTechniciansScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const roundsQuery = useRounds('ACTIVE')
  const rounds = useMemo(() => roundsQuery.data ?? [], [roundsQuery.data])
  const roundIds = useMemo(() => rounds.map((round) => round.id), [rounds])
  const details = useRoundDetails(roundIds)
  const techniciansQuery = useTechniciansList()
  const technicians = useMemo(
    () => (techniciansQuery.data ?? []).filter((technician) => technician.appStatus !== 'INACTIVE'),
    [techniciansQuery.data],
  )
  const areasQuery = useServiceAreas()
  const setTechnicians = useSetRoundTechnicians()

  const [areaFilter, setAreaFilter] = useState('')
  const [rangeDays, setRangeDays] = useState('7')
  const [onlyUnassigned, setOnlyUnassigned] = useState(true)
  const [selection, setSelection] = useState<Record<string, string[]>>({})
  const [modes, setModes] = useState<Record<string, AssignMode>>({})
  const [saving, setSaving] = useState(false)

  const from = todayIso()
  const to = addDays(from, Number(rangeDays) - 1)
  const occurrences = useRoundsOccurrences(roundIds, { from, to })

  /** Technicians saved on each round — the baseline for "needs a technician" and for saving. */
  const savedSelection = useMemo(() => {
    const saved: Record<string, string[]> = {}
    for (const id of roundIds) {
      const detail = details.byRoundId.get(id)
      if (detail) saved[id] = detail.technicians.map((technician) => technician.id)
    }
    return saved
  }, [details.byRoundId, roundIds])

  // Seed each round's picks from what's saved, once its detail arrives.
  useEffect(() => {
    setSelection((prev) => {
      const next = { ...prev }
      let changed = false
      for (const [id, ids] of Object.entries(savedSelection)) {
        if (next[id] === undefined) {
          next[id] = ids
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [savedSelection])

  function firstVisitOf(roundId: string): FirstVisit | null {
    const first = (occurrences.byRoundId.get(roundId) ?? [])
      .filter((occurrence) => occurrence.stopCount > 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    return first ? { date: first.date, visits: first.stopCount } : null
  }

  const areaOptions = useMemo(() => {
    const areas = areasQuery.data?.length
      ? areasQuery.data.map((area) => ({ id: area.id ?? '', name: area.name ?? '' }))
      : [...new Map(rounds.map((round) => [round.serviceAreaId ?? '', round.serviceAreaName ?? ''])).entries()].map(
          ([id, name]) => ({ id, name }),
        )
    return [
      { value: '', label: content.filters.allAreas },
      ...areas
        .filter((area) => area.id)
        .map((area) => {
          const areaRounds = rounds.filter((round) => round.serviceAreaId === area.id)
          const unassigned = areaRounds.filter((round) => (savedSelection[round.id] ?? []).length === 0).length
          return {
            value: area.id,
            label: areaRounds.length
              ? fillCopy(content.filters.areaOption, { area: area.name, rounds: areaRounds.length, unassigned })
              : fillCopy(content.filters.areaOptionNoRounds, { area: area.name }),
          }
        }),
    ]
  }, [areasQuery.data, rounds, savedSelection])

  const visibleRounds = rounds.filter((round) => {
    if (areaFilter && round.serviceAreaId !== areaFilter) return false
    if (onlyUnassigned && savedSelection[round.id] && savedSelection[round.id]!.length > 0) {
      // Keep rounds the user is assigning right now, so they don't vanish mid-edit.
      return selection[round.id]?.join() !== savedSelection[round.id]!.join()
    }
    return true
  })

  const assignedCount = rounds.filter((round) => (selection[round.id] ?? []).length > 0).length
  const changedRounds = rounds.filter(
    (round) => selection[round.id] && selection[round.id]!.join() !== (savedSelection[round.id] ?? []).join(),
  )

  function toggleTechnician(roundId: string, technicianId: string) {
    setSelection((prev) => {
      const current = prev[roundId] ?? []
      if (current.includes(technicianId)) return { ...prev, [roundId]: current.filter((id) => id !== technicianId) }
      // "One technician does all jobs" — picking someone else swaps them in.
      if (modes[roundId] === 'one' && current.length > 0) return { ...prev, [roundId]: [technicianId] }
      return { ...prev, [roundId]: [...current, technicianId] }
    })
  }

  function changeMode(roundId: string, mode: AssignMode) {
    setModes((prev) => ({ ...prev, [roundId]: mode }))
    if (mode === 'one') setSelection((prev) => ({ ...prev, [roundId]: (prev[roundId] ?? []).slice(0, 1) }))
  }

  async function save() {
    if (changedRounds.length === 0) {
      navigate(ROUTES.roundPlanner)
      return
    }
    setSaving(true)
    const results = await Promise.allSettled(
      changedRounds.map((round) =>
        setTechnicians.mutateAsync({ id: round.id, technicianIds: selection[round.id] ?? [] }),
      ),
    )
    setSaving(false)
    if (results.some((result) => result.status === 'rejected')) {
      showToast(content.toasts.failed)
      details.refetch()
      return
    }
    showToast(content.toasts.saved)
    navigate(ROUTES.roundPlanner)
  }

  const loading = roundsQuery.isPending || techniciansQuery.isPending

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground sm:text-[30px]">{content.pageTitle}</h1>
          <nav aria-label="Breadcrumb" className="mt-1 flex items-center gap-2 text-[15px] text-muted">
            <button type="button" onClick={() => navigate(ROUTES.roundPlanner)} className="hover:text-foreground">
              {content.breadcrumb.root}
            </button>
            <span aria-hidden="true">›</span>
            <span className="text-foreground/80">{content.breadcrumb.current}</span>
          </nav>
        </div>

        <WizardStepTitle icon={<TeamIcon />} title={content.heading} subtitle={content.subheading} />
        <InfoNote>{content.info}</InfoNote>

        <div className="space-y-2">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm text-foreground">{content.filters.area}</span>
              <Select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} options={areaOptions} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-foreground">{content.filters.range}</span>
              <Select value={rangeDays} onChange={(event) => setRangeDays(event.target.value)} options={[...content.ranges]} />
            </label>
            <label className="flex cursor-pointer items-center gap-3 py-2.5 text-sm text-foreground sm:text-[15px]">
              <input
                type="checkbox"
                checked={onlyUnassigned}
                onChange={(event) => setOnlyUnassigned(event.target.checked)}
                className="h-5 w-5 rounded border-border accent-primary"
              />
              {content.filters.onlyUnassigned}
            </label>
          </div>
          <p className="text-sm text-muted">{content.filters.hint}</p>
        </div>

        {roundsQuery.isError ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-6 text-sm">
            <p className="text-foreground">{content.loadError}</p>
            <button type="button" onClick={() => void roundsQuery.refetch()} className="mt-3 font-semibold text-primary underline underline-offset-2">
              {content.retry}
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[0, 1].map((index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl bg-foreground/[0.04]" />
            ))}
          </div>
        ) : visibleRounds.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
            {content.empty}
          </p>
        ) : (
          <div className="space-y-5">
            {visibleRounds.map((round) => {
              const selected = selection[round.id] ?? savedSelection[round.id] ?? []
              return (
                <RoundCard
                  key={round.id}
                  round={round}
                  firstVisit={firstVisitOf(round.id)}
                  technicians={technicians}
                  selected={selected}
                  mode={modes[round.id] ?? 'split'}
                  onToggle={(technicianId) => toggleTechnician(round.id, technicianId)}
                  onModeChange={(mode) => changeMode(round.id, mode)}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-card px-4 py-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(ROUTES.roundPlanner)}
            className="text-sm font-medium text-muted transition-colors hover:text-foreground sm:text-[15px]"
          >
            ← {content.footer.back}
          </button>
          <span className={cn('text-sm text-muted sm:text-[15px]', loading && 'invisible')}>
            {fillCopy(content.footer.progress, { assigned: assignedCount, total: rounds.length })}
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => navigate(ROUTES.roundPlanner)}
              className="text-sm font-medium text-primary transition-opacity hover:opacity-75 sm:text-[15px]"
            >
              {content.footer.skip}
            </button>
            <button type="button" onClick={() => void save()} disabled={saving || loading} className={primaryButtonClass}>
              {saving ? content.footer.saving : content.footer.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
