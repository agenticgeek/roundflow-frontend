/** Choices shared by the Create Round wizard and the Edit round modal. */
export type Frequency = 'FOUR_WEEKLY' | 'SIX_WEEKLY' | 'EIGHT_WEEKLY' | 'TWELVE_WEEKLY'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export const FREQUENCIES: { value: Frequency; label: string; default?: boolean }[] = [
  { value: 'FOUR_WEEKLY', label: 'Every 4 weeks', default: true },
  { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
  { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
  { value: 'TWELVE_WEEKLY', label: 'Every 12 weeks' },
]
