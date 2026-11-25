import { describe, expect, it } from 'vitest'
import type { PlannerOccurrence } from '@/api/rounds.api'
import {
  canMoveForecastCard,
  canMoveRealCard,
  defaultMoveDate,
  isNonWorkingDate,
  moveDateBlock,
  nextForecastDates,
  type MoveOccurrencePreview,
} from '@/features/rounds/lib/move-occurrence'

const today = '2026-11-25'

const preview = (over: Partial<MoveOccurrencePreview> = {}): MoveOccurrencePreview => ({
  fromDate: '2026-11-27',
  kind: 'REAL',
  propertyCount: 12,
  earliestDate: '2026-11-21',
  latestDate: '2026-12-10',
  blockedDates: [
    { date: '2026-11-29', reason: 'CLOSED_DAY', label: 'Sunday' },
    { date: '2026-12-01', reason: 'CLOSURE', label: 'Staff holiday' },
  ],
  check: null,
  ...over,
})

const occ = (date: string, projected = false): PlannerOccurrence => ({
  date, stopCount: 3, totalValue: 60, completedCount: 0, completionPct: 0, holdCount: 0, issueCount: 0,
  ...(projected ? { projected: true } : {}),
})

const card = (date: string, projected: boolean) => ({ roundId: 'r1', date, projected })

describe('moveDateBlock', () => {
  it('blocks past dates, dates outside the window, the current date, closures and closed days', () => {
    const p = preview()
    expect(moveDateBlock('2026-11-24', p, today)).toEqual({ kind: 'PAST' })
    expect(moveDateBlock('2026-12-11', p, today)).toEqual({ kind: 'OUTSIDE_WINDOW' })
    expect(moveDateBlock('2026-11-20', preview({ earliestDate: '2026-11-26' }), '2026-11-19')).toEqual({ kind: 'OUTSIDE_WINDOW' })
    expect(moveDateBlock('2026-11-27', p, today)).toEqual({ kind: 'CURRENT' })
    expect(moveDateBlock('2026-12-01', p, today)).toEqual({ kind: 'CLOSURE', label: 'Staff holiday' })
    expect(moveDateBlock('2026-11-29', p, today)).toEqual({ kind: 'CLOSED_DAY', label: 'Sunday' })
    expect(moveDateBlock('2026-11-25', p, today)).toBeNull()
    expect(moveDateBlock('2026-12-10', p, today)).toBeNull()
  })
})

describe('defaultMoveDate', () => {
  it('is today when today is inside the window', () => {
    expect(defaultMoveDate(preview(), today)).toBe(today)
  })

  it('is the earliest date when today is outside the window', () => {
    expect(defaultMoveDate(preview({ earliestDate: '2026-11-28', fromDate: '2026-12-03' }), today)).toBe('2026-11-28')
  })

  it('steps past an unusable default (the current date, a closure) to the next usable date', () => {
    expect(defaultMoveDate(preview({ fromDate: today }), today)).toBe('2026-11-26')
    expect(
      defaultMoveDate(preview({ earliestDate: '2026-11-29', fromDate: '2026-12-05' }), today),
    ).toBe('2026-11-30')
  })

  it('never defaults to a non-working date (but a missing list means none)', () => {
    expect(defaultMoveDate(preview({ nonWorkingDates: ['2026-11-25', '2026-11-26'] }), today)).toBe('2026-11-28')
    expect(defaultMoveDate({ ...preview(), nonWorkingDates: undefined }, today)).toBe(today)
  })

  it('falls back to a non-working date when it is the only usable one', () => {
    expect(
      defaultMoveDate(preview({ earliestDate: '2026-11-26', latestDate: '2026-11-27', nonWorkingDates: ['2026-11-26'] }), today),
    ).toBe('2026-11-26')
  })

  it('is null when nothing in the window can be picked', () => {
    expect(defaultMoveDate(preview({ earliestDate: '2026-11-27', latestDate: '2026-11-27' }), today)).toBeNull()
  })
})

describe('isNonWorkingDate', () => {
  it('reads the preview list, treating a missing list as empty', () => {
    expect(isNonWorkingDate('2026-11-28', preview({ nonWorkingDates: ['2026-11-28'] }))).toBe(true)
    expect(isNonWorkingDate('2026-11-28', preview())).toBe(false)
    expect(isNonWorkingDate('2026-11-28', { ...preview(), nonWorkingDates: undefined })).toBe(false)
  })
})

describe('nextForecastDates', () => {
  it('is each round’s first forecast entry on or after today', () => {
    const map = nextForecastDates(
      new Map([
        ['r1', [occ('2026-11-20', true), occ('2026-11-27'), occ('2026-12-04', true), occ('2026-12-11', true)]],
        ['r2', [occ('2026-11-26')]],
      ]),
      today,
    )
    expect(map.get('r1')).toBe('2026-12-04')
    expect(map.has('r2')).toBe(false)
  })
})

describe('move-date visibility', () => {
  it('real dates: today or later only', () => {
    expect(canMoveRealCard(card(today, false), today)).toBe(true)
    expect(canMoveRealCard(card('2026-12-01', false), today)).toBe(true)
    expect(canMoveRealCard(card('2026-11-24', false), today)).toBe(false)
    expect(canMoveRealCard(card('2026-12-01', true), today)).toBe(false)
  })

  it('forecast dates: only the round’s next one', () => {
    const next = new Map([['r1', '2026-12-04']])
    expect(canMoveForecastCard(card('2026-12-04', true), next, today)).toBe(true)
    expect(canMoveForecastCard(card('2026-12-11', true), next, today)).toBe(false)
    expect(canMoveForecastCard(card('2026-12-04', false), next, today)).toBe(false)
    expect(canMoveForecastCard({ ...card('2026-12-04', true), roundId: 'r2' }, next, today)).toBe(false)
    expect(canMoveForecastCard(card('2026-11-20', true), new Map([['r1', '2026-11-20']]), today)).toBe(false)
  })
})
