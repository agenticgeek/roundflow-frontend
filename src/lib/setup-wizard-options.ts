import type { AssignedAreaRound, ServiceArea, WizardRound } from '@/types/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'

/** Flatten assign-round data into schedulable wizard rounds. */
export function buildWizardRounds(
  assignments: AssignedAreaRound[],
  _roundDays: readonly SelectOption[],
  existingRounds: WizardRound[] = [],
): WizardRound[] {
  const existingById = Object.fromEntries(existingRounds.map((round) => [round.id, round]))

  return assignments.flatMap((assignment) =>
    assignment.linkedRounds.map((linkedRound) => {
      const id = `${assignment.id}:${linkedRound.id}`
      const existing = existingById[id]
      return {
        id,
        areaName: assignment.areaName,
        day: linkedRound.day,
        propertyCount: existing?.propertyCount ?? 20,
        technicianId: existing?.technicianId ?? '',
      }
    }),
  )
}

/** Format round display name, e.g. "Alnwick Monday". */
export function formatRoundName(
  areaName: string,
  day: string,
  roundDays: readonly SelectOption[],
): string {
  const dayLabels = Object.fromEntries(
    roundDays.filter((item) => item.value).map((item) => [item.value, item.label]),
  )
  return `${areaName} ${dayLabels[day] ?? day}`
}

/** Derive initials from a full name. */
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Build round dropdown options from assign-round step data. */
export function buildRoundSelectOptions(
  assignments: AssignedAreaRound[],
  roundDays: readonly SelectOption[],
): SelectOption[] {
  const dayLabels = Object.fromEntries(
    roundDays.filter((day) => day.value).map((day) => [day.value, day.label]),
  )

  return assignments.flatMap((assignment) =>
    assignment.linkedRounds.map((round) => ({
      value: `${assignment.id}:${round.id}`,
      label: `${assignment.areaName} ${dayLabels[round.day] ?? round.day}`,
    })),
  )
}

/** Build service area dropdown options from service-area step data. */
export function buildServiceAreaSelectOptions(areas: ServiceArea[]): SelectOption[] {
  return areas.map((area) => ({ value: area.id, label: area.name }))
}
