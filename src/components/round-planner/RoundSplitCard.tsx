import { useEffect } from 'react'
import type { RoundListItem, SetRoundTechniciansInput, SplitMode } from '@/api/rounds.api'
import { Select } from '@/components/ui'
import { InfoNote, OptionCard, WarningNote } from '@/components/setup-wizard/WizardParts'
import { assignTechniciansContent as content } from '@/content/round-planner'
import { useAllocationPreview, useRoundAllocation, useRoundProperties } from '@/features/rounds/hooks/useRoundSplit'
import {
  allocationName,
  buildSplitInput,
  formatSplitValue,
  manualBalance,
  splitFromAllocation,
  unassignedProperties,
  type RoundSplit,
} from '@/features/rounds/lib/split'
import { errorMessage } from '@/lib/errors'
import { fillCopy } from '@/lib/utils'

const MODES: SplitMode[] = ['SINGLE', 'AUTO', 'MANUAL']

/**
 * Per-technician stops and value for a split, from `PUT …/technicians?dryRun=true` (GAP-012):
 * the AUTO preview and the Review step. Shows the server's error (e.g. a pending invite).
 * Render it only for a round with at least one technician.
 */
export function AllocationSummary({
  roundId,
  input,
  technicianName,
}: {
  roundId: string
  input: SetRoundTechniciansInput
  technicianName: (id: string) => string
}) {
  const preview = useAllocationPreview(roundId, input)
  if (preview.isPending) return <p className="text-sm text-muted">{content.splitStep.allocationLoading}</p>
  if (preview.isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {errorMessage(preview.error)}
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <ul className="grid gap-2 sm:grid-cols-2">
        {preview.data.allocation.map((entry) => (
          <li key={entry.technicianId} className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
            <p className="text-sm font-medium text-foreground">{allocationName(entry, technicianName)}</p>
            <p className="text-sm text-muted">
              {fillCopy(content.splitStep.allocationLine, { stops: entry.stops, value: formatSplitValue(entry.value) })}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{fillCopy(content.splitStep.allocationVisits, { count: preview.data.visitsUpdated })}</p>
    </div>
  )
}

function ManualSplit({
  roundId,
  selected,
  split,
  onChange,
  technicianName,
}: {
  roundId: string
  selected: string[]
  split: RoundSplit
  onChange: (split: RoundSplit) => void
  technicianName: (id: string) => string
}) {
  const properties = useRoundProperties(roundId)
  if (properties.isPending) return <p className="text-sm text-muted">{content.splitStep.manualLoading}</p>
  if (properties.isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {errorMessage(properties.error)}
      </p>
    )
  }
  const rows = properties.data
  if (rows.length === 0) return <p className="text-sm text-muted">{content.splitStep.manualEmpty}</p>

  const options = [
    { value: '', label: content.splitStep.manualPick },
    ...selected.map((id) => ({ value: id, label: technicianName(id) })),
  ]
  const unassigned = unassignedProperties(rows, split, selected).length
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="border-b border-border bg-surface/60 text-xs font-semibold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5">{content.splitStep.manualProperty}</th>
              <th className="px-4 py-2.5">{content.splitStep.manualTechnician}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.propertyId}>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-foreground">{row.addressLine}</p>
                  <p className="text-xs text-muted">
                    {row.customerName} · {formatSplitValue(row.price)}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <Select
                    inputSize="sm"
                    aria-label={`${content.splitStep.manualTechnician}: ${row.addressLine}`}
                    value={selected.includes(split.manual[row.propertyId] ?? '') ? split.manual[row.propertyId] : ''}
                    options={options}
                    onChange={(event) =>
                      onChange({ ...split, manual: { ...split.manual, [row.propertyId]: event.target.value } })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">{content.splitStep.balance}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {manualBalance(rows, split, selected).map((share) => (
            <li key={share.technicianId} className="rounded-xl border border-border px-4 py-2.5 text-sm">
              <span className="font-medium text-foreground">{technicianName(share.technicianId)}</span>
              <span className="text-muted">
                {' · '}
                {fillCopy(content.splitStep.allocationLine, { stops: share.stops, value: formatSplitValue(share.value) })}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {unassigned > 0 ? (
        <WarningNote>
          {unassigned === 1
            ? content.splitStep.manualUnassignedOne
            : fillCopy(content.splitStep.manualUnassigned, { count: unassigned })}
        </WarningNote>
      ) : null}
    </div>
  )
}

/**
 * Step 2 of the assign wizard for a round with two or more technicians (GAP-012): one
 * technician does it all, an automatic split (previewed), or a per-property choice. The split
 * is prefilled from the round's saved allocation the first time the card shows.
 */
export function RoundSplitCard({
  round,
  selected,
  split,
  onChange,
  technicianName,
}: {
  round: RoundListItem
  selected: string[]
  /** `undefined` until prefilled from the saved allocation. */
  split: RoundSplit | undefined
  onChange: (split: RoundSplit) => void
  technicianName: (id: string) => string
}) {
  const saved = useRoundAllocation(round.id, split === undefined)
  useEffect(() => {
    if (split === undefined && !saved.isPending) onChange(splitFromAllocation(saved.data, selected))
  }, [onChange, saved.data, saved.isPending, selected, split])

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{round.name}</h3>
        <p className="mt-0.5 text-sm text-muted">{selected.map(technicianName).join(', ')}</p>
      </div>
      {split === undefined ? (
        <div className="h-20 animate-pulse rounded-xl bg-foreground/[0.04]" aria-busy="true" />
      ) : (
        <>
          <div role="radiogroup" aria-label={round.name} className="grid gap-3 sm:grid-cols-3">
            {MODES.map((mode) => (
              <OptionCard
                key={mode}
                selected={split.mode === mode}
                onSelect={() => onChange({ ...split, mode })}
                title={content.splitStep.modes[mode].title}
                description={content.splitStep.modes[mode].description}
              />
            ))}
          </div>
          {split.mode === 'SINGLE' ? (
            <label className="block max-w-xs">
              <span className="mb-1.5 block text-sm text-foreground">{content.splitStep.singleLabel}</span>
              <Select
                inputSize="sm"
                aria-label={content.splitStep.singleLabel}
                value={buildSplitInput(selected, split).technicianIds[0]}
                options={selected.map((id) => ({ value: id, label: technicianName(id) }))}
                onChange={(event) => onChange({ ...split, singleId: event.target.value })}
              />
            </label>
          ) : split.mode === 'AUTO' ? (
            <AllocationSummary roundId={round.id} input={buildSplitInput(selected, split)} technicianName={technicianName} />
          ) : (
            <ManualSplit
              roundId={round.id}
              selected={selected}
              split={split}
              onChange={onChange}
              technicianName={technicianName}
            />
          )}
          <InfoNote>{content.splitStep.note}</InfoNote>
        </>
      )}
    </section>
  )
}
