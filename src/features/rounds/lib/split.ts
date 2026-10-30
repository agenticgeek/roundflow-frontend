import type {
  AllocationEntry,
  RoundAllocation,
  RoundPropertyRow,
  SetRoundTechniciansInput,
  SplitMode,
} from '@/api/rounds.api'

/**
 * One round's split choice in the assign wizard (GAP-012):
 * - SINGLE: `singleId` does every job (the other picks are dropped on save),
 * - AUTO: the server balances properties by plan value (previewed with `?dryRun=true`),
 * - MANUAL: `manual` maps propertyId → technicianId.
 */
export type RoundSplit = {
  mode: SplitMode
  singleId: string | null
  manual: Record<string, string>
}

/** The default split for a round's picked technicians: one → SINGLE, two or more → AUTO. */
export function defaultSplit(technicianIds: readonly string[]): RoundSplit {
  return {
    mode: technicianIds.length >= 2 ? 'AUTO' : 'SINGLE',
    singleId: technicianIds[0] ?? null,
    manual: {},
  }
}

/**
 * Prefills the split from GET /rounds/:id/allocation, keeping only properties already on a
 * technician still picked. A saved SINGLE becomes AUTO when two or more are picked now.
 */
export function splitFromAllocation(
  saved: RoundAllocation | undefined,
  technicianIds: readonly string[],
): RoundSplit {
  const base = defaultSplit(technicianIds)
  if (!saved) return base
  const manual: Record<string, string> = {}
  for (const entry of saved.allocation) {
    if (!technicianIds.includes(entry.technicianId)) continue
    for (const propertyId of entry.propertyIds) manual[propertyId] = entry.technicianId
  }
  const mode = technicianIds.length < 2 ? 'SINGLE' : saved.mode === 'SINGLE' ? 'AUTO' : saved.mode
  return { ...base, mode, manual }
}

/** The PUT /rounds/:id/technicians body for a round's picks and split choice. */
export function buildSplitInput(technicianIds: readonly string[], split: RoundSplit | undefined): SetRoundTechniciansInput {
  if (technicianIds.length === 0) return { technicianIds: [] }
  const choice = split ?? defaultSplit(technicianIds)
  if (technicianIds.length === 1 || choice.mode === 'SINGLE') {
    const single = choice.singleId && technicianIds.includes(choice.singleId) ? choice.singleId : technicianIds[0]!
    return { technicianIds: [single], split: { mode: 'SINGLE' } }
  }
  if (choice.mode === 'AUTO') return { technicianIds: [...technicianIds], split: { mode: 'AUTO' } }
  return {
    technicianIds: [...technicianIds],
    split: {
      mode: 'MANUAL',
      allocations: Object.entries(choice.manual)
        .filter(([, technicianId]) => technicianIds.includes(technicianId))
        .map(([propertyId, technicianId]) => ({ propertyId, technicianId })),
    },
  }
}

/** Properties in a MANUAL split that have no (still-picked) technician yet. */
export function unassignedProperties(
  properties: readonly RoundPropertyRow[],
  split: RoundSplit,
  technicianIds: readonly string[],
): RoundPropertyRow[] {
  return properties.filter((property) => {
    const technicianId = split.manual[property.propertyId]
    return !technicianId || !technicianIds.includes(technicianId)
  })
}

/** MANUAL balance summary: stops and plan value per technician, in pick order. */
export function manualBalance(
  properties: readonly RoundPropertyRow[],
  split: RoundSplit,
  technicianIds: readonly string[],
): { technicianId: string; stops: number; value: number }[] {
  return technicianIds.map((technicianId) => {
    const mine = properties.filter((property) => split.manual[property.propertyId] === technicianId)
    return {
      technicianId,
      stops: mine.length,
      value: mine.reduce((sum, property) => sum + property.price, 0),
    }
  })
}

/** "37.00" / 37 → "£37.00". */
export function formatSplitValue(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  return `£${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`
}

/** The allocation entry's technician name, falling back to the wizard's own list. */
export function allocationName(entry: AllocationEntry, technicianName: (id: string) => string): string {
  return entry.name ?? technicianName(entry.technicianId)
}
