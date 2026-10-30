import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RoundListItem, SetRoundTechniciansInput } from '@/api/rounds.api'
import type { TechnicianListItem } from '@/api/technicians.api'
import { ROUTES } from '@/config/routes'
import { assignTechniciansContent as content } from '@/content/round-planner'
import { PendingInviteResend } from '@/components/round-planner/PendingInviteResend'
import { Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { AllocationSummary, RoundSplitCard } from '@/components/round-planner/RoundSplitCard'
import {
  ChoiceChip,
  InfoNote,
  StatusPill,
  WarningNote,
  WizardStepTitle,
} from '@/components/setup-wizard/WizardParts'
import { primaryButtonClass, secondaryButtonClass } from '@/components/setup-wizard/wizard-styles'
import {
  useRoundDetails,
  useRounds,
  useRoundsOccurrences,
  useSetRoundTechnicians,
} from '@/features/rounds/hooks/useRounds'
import { useServiceAreas } from '@/features/settings/hooks/useSettings'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { useUnassignedRoundsAlert } from '@/features/rounds/hooks/useUnassignedRoundsAlert'
import { assignFailureMessage, isPendingInvite } from '@/features/rounds/lib/assign'
import { buildSplitInput, type RoundSplit } from '@/features/rounds/lib/split'
import { addDays, formatShortDate, todayIso } from '@/lib/round-dates'
import { cn, fillCopy } from '@/lib/utils'

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

function RoundCard({
  round,
  firstVisit,
  technicians,
  selected,
  onToggle,
}: {
  round: RoundListItem
  firstVisit: FirstVisit | null
  technicians: TechnicianListItem[]
  selected: string[]
  onToggle: (technicianId: string) => void
}) {
  const areaName = round.serviceAreaName ?? ''
  const covers = (technician: TechnicianListItem) =>
    technician.serviceAreas.some((assignment) => assignment.serviceAreaId === round.serviceAreaId)
  // Technicians covering the round's area first.
  const ordered = [...technicians].sort((a, b) => Number(covers(b)) - Number(covers(a)))
  const hasSuggested = areaName && technicians.some(covers)
  const visits = firstVisit?.visits ?? 0

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
            {ordered.filter((technician) => !isPendingInvite(technician)).map((technician) => (
              <ChoiceChip
                key={technician.id}
                label={technician.name ?? '—'}
                selected={selected.includes(technician.id)}
                onClick={() => onToggle(technician.id)}
              />
            ))}
          </div>
        )}
        {/* GAP-011: pending invites can't be assigned (the API rejects them) — offer a resend. */}
        {ordered.some(isPendingInvite) ? (
          <ul className="mt-3 space-y-1.5">
            {ordered.filter(isPendingInvite).map((technician) => (
              <li key={technician.id} className="flex flex-wrap items-center gap-2">
                <ChoiceChip label={technician.name ?? '—'} />
                <PendingInviteResend technician={technician} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selected.length === 0 && firstVisit ? (
        <WarningNote>{fillCopy(content.round.warning, { date: formatShortDate(firstVisit.date) })}</WarningNote>
      ) : null}
    </section>
  )
}

/** Review "Sharing" column for what will be saved. */
function sharingLabel(pickedCount: number, input: SetRoundTechniciansInput): string {
  if (pickedCount < 2) return content.review.single
  if (input.split?.mode === 'SINGLE') return content.review.oneDoesAll
  return input.split?.mode === 'MANUAL' ? content.review.manual : content.review.split
}

type AssignStep = 0 | 1 | 2

/** Numbered steps joined by a track that fills as you go; `complete` ticks every step. */
function AssignStepper({ current, complete }: { current: AssignStep; complete: boolean }) {
  const last = content.steps.length - 1
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 sm:px-6">
      <ol className="flex items-center" aria-label="Assign technicians progress">
        {content.steps.map((label, index) => {
          const done = complete || index < current
          const active = !complete && index === current
          return (
            <li key={label} className={cn('flex items-center', index < last && 'flex-1')} aria-current={active ? 'step' : undefined}>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500',
                    done && 'bg-primary text-primary-foreground',
                    active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !done && !active && 'bg-border/70 text-muted',
                  )}
                >
                  {done ? (
                    <svg
                      key="tick"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      className="h-4 w-4 animate-pop-in"
                      style={{ animationDelay: complete ? `${index * 140}ms` : undefined }}
                      aria-hidden="true"
                    >
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'hidden text-sm whitespace-nowrap sm:inline sm:text-[15px]',
                    done || active ? 'font-medium text-foreground' : 'text-muted',
                  )}
                >
                  {label}
                </span>
              </div>
              {index < last ? (
                <span className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-border sm:mx-4" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                    style={{
                      width: done ? '100%' : '0%',
                      transitionDelay: complete ? `${index * 140 + 80}ms` : undefined,
                    }}
                  />
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
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
  /** GAP-012 split per round (`undefined` until prefilled from the saved allocation). */
  const [splits, setSplits] = useState<Record<string, RoundSplit>>({})
  const [saving, setSaving] = useState(false)
  /** The server's error from the last save — shown on Review, which stays open (GAP-011). */
  const [saveError, setSaveError] = useState<string | null>(null)
  const [step, setStep] = useState<AssignStep>(0)
  /** What was saved, kept for the completed screen (the rounds refetch right after). */
  const [savedSummary, setSavedSummary] = useState<{ rounds: number; visits: number } | null>(null)

  const from = todayIso()
  const to = addDays(from, Number(rangeDays) - 1)
  const occurrences = useRoundsOccurrences(roundIds, { from, to })
  // Visits carry their own technician (each recurrence starts unassigned), so a round with
  // technicians saved can still have visits nobody is on.
  const unassignedAlert = useUnassignedRoundsAlert()
  const visitsNeedTechnician = useMemo(
    () => new Set(unassignedAlert?.rounds.map((round) => round.roundId) ?? []),
    [unassignedAlert],
  )

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
          const unassigned = areaRounds.filter(
            (round) => (savedSelection[round.id] ?? []).length === 0 || visitsNeedTechnician.has(round.id),
          ).length
          return {
            value: area.id,
            label: areaRounds.length
              ? fillCopy(content.filters.areaOption, { area: area.name, rounds: areaRounds.length, unassigned })
              : fillCopy(content.filters.areaOptionNoRounds, { area: area.name }),
          }
        }),
    ]
  }, [areasQuery.data, rounds, savedSelection, visitsNeedTechnician])

  const visibleRounds = rounds.filter((round) => {
    if (areaFilter && round.serviceAreaId !== areaFilter) return false
    if (
      onlyUnassigned &&
      savedSelection[round.id] &&
      savedSelection[round.id]!.length > 0 &&
      !visitsNeedTechnician.has(round.id)
    ) {
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
      return { ...prev, [roundId]: [...current, technicianId] }
    })
  }

  const changeSplit = useCallback((roundId: string, split: RoundSplit) => {
    setSplits((prev) => ({ ...prev, [roundId]: split }))
  }, [])

  async function save() {
    if (changedRounds.length === 0) {
      navigate(ROUTES.roundPlanner)
      return
    }
    setSaving(true)
    setSaveError(null)
    const results = await Promise.allSettled(
      changedRounds.map((round) =>
        setTechnicians.mutateAsync({ id: round.id, input: buildSplitInput(selection[round.id] ?? [], splits[round.id]) }),
      ),
    )
    setSaving(false)
    const failure = assignFailureMessage(results, changedRounds.map((round) => round.name))
    if (failure) {
      setSaveError(failure)
      showToast(content.toasts.failed, { description: failure, tone: 'error' })
      details.refetch()
      return
    }
    showToast(content.toasts.saved)
    setSavedSummary({
      rounds: changedRounds.filter((round) => (selection[round.id] ?? []).length > 0).length,
      visits: changedRounds
        .filter((round) => (selection[round.id] ?? []).length > 0)
        .reduce(
          (sum, round) =>
            sum + (occurrences.byRoundId.get(round.id) ?? []).reduce((total, occurrence) => total + occurrence.stopCount, 0),
          0,
        ),
    })
  }

  const loading = roundsQuery.isPending || techniciansQuery.isPending
  const technicianName = (id: string) => technicians.find((technician) => technician.id === id)?.name ?? '—'
  const sharedRounds = changedRounds.filter((round) => (selection[round.id] ?? []).length >= 2)
  const complete = savedSummary !== null

  function goTo(next: AssignStep) {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

        <AssignStepper current={step} complete={complete} />

        {complete ? (
          <section className="flex animate-fade-in-up flex-col items-center rounded-2xl border border-border bg-card px-6 py-12 text-center sm:py-16">
            <span className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
              <span className="absolute inset-0 animate-ring-out rounded-full bg-success/20 [animation-delay:400ms] motion-reduce:hidden" />
              <span className="relative flex h-20 w-20 animate-pop-in items-center justify-center rounded-full bg-success/10 text-success">
                <svg viewBox="0 0 48 48" fill="none" className="h-14 w-14">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" pathLength={1} strokeDasharray="1" className="origin-center -rotate-90 animate-draw [transform-box:fill-box]" />
                  <path d="m15 24.5 6 6L33.5 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" className="animate-draw [animation-delay:380ms]" />
                </svg>
              </span>
            </span>
            <h2 className="mt-6 animate-reveal-item text-2xl font-semibold tracking-tight text-foreground [animation-delay:450ms]">
              {content.done.title}
            </h2>
            <p className="mt-2 max-w-md animate-reveal-item text-sm text-balance text-muted sm:text-[15px] [animation-delay:530ms]">
              {savedSummary.rounds === 1
                ? fillCopy(content.done.bodyOne, { visits: savedSummary.visits })
                : fillCopy(content.done.body, { rounds: savedSummary.rounds, visits: savedSummary.visits })}
            </p>
            <div className="mt-8 flex animate-reveal-item flex-wrap justify-center gap-3 [animation-delay:620ms]">
              <button type="button" onClick={() => navigate(ROUTES.roundPlanner)} className={secondaryButtonClass}>
                {content.done.planner}
              </button>
              <button type="button" onClick={() => navigate(ROUTES.dashboard)} className={primaryButtonClass}>
                {content.done.dashboard}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        ) : step === 0 ? (
          <div key="choose" className="animate-wizard-step space-y-6">
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
                {visibleRounds.map((round) => (
                  <RoundCard
                    key={round.id}
                    round={round}
                    firstVisit={firstVisitOf(round.id)}
                    technicians={technicians}
                    selected={selection[round.id] ?? savedSelection[round.id] ?? []}
                    onToggle={(technicianId) => toggleTechnician(round.id, technicianId)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div key="split" className="animate-wizard-step space-y-5">
            <WizardStepTitle icon={<TeamIcon />} title={content.splitStep.title} subtitle={content.splitStep.subtitle} />
            {sharedRounds.length === 0 ? (
              <InfoNote>{content.splitStep.nothing}</InfoNote>
            ) : (
              sharedRounds.map((round) => (
                <RoundSplitCard
                  key={round.id}
                  round={round}
                  selected={selection[round.id] ?? []}
                  split={splits[round.id]}
                  onChange={(split) => changeSplit(round.id, split)}
                  technicianName={technicianName}
                />
              ))
            )}
          </div>
        ) : (
          <div key="review" className="animate-wizard-step space-y-5">
            <WizardStepTitle
              icon={<TeamIcon />}
              title={content.review.title}
              subtitle={
                changedRounds.length === 1
                  ? content.review.subtitleOne
                  : fillCopy(content.review.subtitle, { count: changedRounds.length })
              }
            />
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-border bg-surface/60 text-xs font-semibold tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-5 py-3">{content.review.round}</th>
                    <th className="px-5 py-3">{content.review.firstVisit}</th>
                    <th className="px-5 py-3">{content.review.technicians}</th>
                    <th className="px-5 py-3">{content.review.howShared}</th>
                    <th className="px-5 py-3">{content.review.allocation}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {changedRounds.map((round, index) => {
                    const picked = selection[round.id] ?? []
                    const input = buildSplitInput(picked, splits[round.id])
                    const first = firstVisitOf(round.id)
                    return (
                      <tr key={round.id} className="animate-reveal-item" style={{ animationDelay: `${index * 60}ms` }}>
                        <td className="px-5 py-3.5 font-medium text-foreground">{round.name}</td>
                        <td className="px-5 py-3.5 text-muted">
                          {first ? `${formatShortDate(first.date)} · ${first.visits}` : content.round.noVisits}
                        </td>
                        <td className={cn('px-5 py-3.5', picked.length ? 'text-foreground' : 'text-warning-foreground')}>
                          {picked.length ? input.technicianIds.map(technicianName).join(', ') : content.review.removed}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{sharingLabel(picked.length, input)}</td>
                        <td className="px-5 py-3.5">
                          {picked.length ? (
                            <AllocationSummary roundId={round.id} input={input} technicianName={technicianName} />
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {saveError ? (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {saveError}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {complete ? null : (
        <div className="sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-card px-4 py-3.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => (step === 0 ? navigate(ROUTES.roundPlanner) : goTo((step - 1) as AssignStep))}
              disabled={saving}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground sm:text-[15px]"
            >
              ← {step === 0 ? content.footer.backToPlanner : content.footer.back}
            </button>
            <span className={cn('text-sm text-muted sm:text-[15px]', loading && 'invisible')}>
              {step === 0 && changedRounds.length === 0
                ? content.choose.noChanges
                : fillCopy(content.footer.progress, { assigned: assignedCount, total: rounds.length })}
            </span>
            <div className="flex items-center gap-5">
              {step === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.roundPlanner)}
                  className="text-sm font-medium text-primary transition-opacity hover:opacity-75 sm:text-[15px]"
                >
                  {content.footer.skip}
                </button>
              ) : null}
              {step < 2 ? (
                <button
                  type="button"
                  onClick={() => goTo((step + 1) as AssignStep)}
                  disabled={loading || changedRounds.length === 0}
                  className={primaryButtonClass}
                >
                  {content.footer.continue}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button type="button" onClick={() => void save()} disabled={saving || changedRounds.length === 0} className={primaryButtonClass}>
                  {saving ? content.footer.saving : content.footer.save}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
