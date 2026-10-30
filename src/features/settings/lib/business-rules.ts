import type { components } from '@/api/types.gen'
import type {
  CleanMethod,
  NoDirectDebitAction,
  PaymentTimingOption,
  ReminderSchedule,
} from '@/types/setup-wizard'

/**
 * Business-settings enums shared by the setup wizard (steps 1, 2, 4) and Settings (Business
 * Profile, Payment Setup, Round Settings). GAP-001 / GAP-003 / GAP-008: every field here is now
 * stored by the backend — none of it is frontend-only any more.
 */
type Schemas = components['schemas']
export type ReminderMode = Schemas['ReminderMode']
export type ApiCleanMethod = Schemas['CleanMethod']
export type ApiNoDirectDebitAction = Schemas['NoDirectDebitAction']
export type PaymentTiming = Schemas['PaymentTiming']
export type PaymentMethodValue = Schemas['PaymentMethod']

const REMINDER_FROM_API: Record<ReminderMode, ReminderSchedule> = {
  EVENING_BEFORE: 'evening-before',
  MORNING_OF: 'morning-of',
  NONE: 'none',
}
const REMINDER_TO_API: Record<ReminderSchedule, ReminderMode> = {
  'evening-before': 'EVENING_BEFORE',
  'morning-of': 'MORNING_OF',
  none: 'NONE',
}

const CLEAN_METHOD_FROM_API: Record<ApiCleanMethod, CleanMethod> = {
  TRADITIONAL: 'traditional',
  WATER_FED_POLE: 'water-fed-pole',
  BOTH: 'both',
}
const CLEAN_METHOD_TO_API: Record<CleanMethod, ApiCleanMethod> = {
  traditional: 'TRADITIONAL',
  'water-fed-pole': 'WATER_FED_POLE',
  both: 'BOTH',
}

const NO_DD_FROM_API: Record<ApiNoDirectDebitAction, NoDirectDebitAction> = {
  SEND_INVOICE: 'invoice',
  SEND_PAYMENT_LINK: 'card-link',
}
const NO_DD_TO_API: Record<NoDirectDebitAction, ApiNoDirectDebitAction> = {
  invoice: 'SEND_INVOICE',
  'card-link': 'SEND_PAYMENT_LINK',
}

export interface ReminderFormValues {
  reminderSchedule: ReminderSchedule
  /** `HH:mm` — used when reminderSchedule is `evening-before`. */
  eveningReminderTime: string
  /** `HH:mm` — used when reminderSchedule is `morning-of`. */
  morningReminderTime: string
}

/** `reminderMode` + one `reminderTime` → the form, which keeps a time per schedule. */
export function reminderToForm(
  data: { reminderMode?: ReminderMode; reminderTime?: string } | null | undefined,
  defaults: ReminderFormValues,
): ReminderFormValues {
  const reminderSchedule = data?.reminderMode ? REMINDER_FROM_API[data.reminderMode] : defaults.reminderSchedule
  const time = data?.reminderTime
  return {
    reminderSchedule,
    eveningReminderTime:
      reminderSchedule === 'evening-before' && time ? time : defaults.eveningReminderTime,
    morningReminderTime: reminderSchedule === 'morning-of' && time ? time : defaults.morningReminderTime,
  }
}

/** Only the chosen schedule's time is sent; "Don't send reminders" sends no time. */
export function reminderFromForm(values: ReminderFormValues): { reminderMode: ReminderMode; reminderTime?: string } {
  const reminderMode = REMINDER_TO_API[values.reminderSchedule]
  if (values.reminderSchedule === 'none') return { reminderMode }
  return {
    reminderMode,
    reminderTime:
      values.reminderSchedule === 'morning-of' ? values.morningReminderTime : values.eveningReminderTime,
  }
}

export function cleanMethodToForm(value: ApiCleanMethod | null | undefined, fallback: CleanMethod): CleanMethod {
  return value ? CLEAN_METHOD_FROM_API[value] : fallback
}

export function cleanMethodFromForm(value: CleanMethod): ApiCleanMethod {
  return CLEAN_METHOD_TO_API[value]
}

export function noDirectDebitToForm(
  value: ApiNoDirectDebitAction | null | undefined,
  fallback: NoDirectDebitAction,
): NoDirectDebitAction {
  return value ? NO_DD_FROM_API[value] : fallback
}

export function noDirectDebitFromForm(value: NoDirectDebitAction): ApiNoDirectDebitAction {
  return NO_DD_TO_API[value]
}

/** The wizard's two timing choices. "Once a day" is the daily batch (GAP-008), not COLLECT_ON_DATE. */
export function paymentTimingToForm(rule: PaymentTiming | null | undefined): PaymentTimingOption {
  return rule === 'COLLECT_DAILY_BATCH' ? 'daily' : 'after-visit'
}

export function paymentTimingFromForm(timing: PaymentTimingOption): PaymentTiming {
  return timing === 'daily' ? 'COLLECT_DAILY_BATCH' : 'COLLECT_AFTER_VISIT'
}

/** Invoice due days typed as text — a whole number 0–90, else null. */
export function parseInvoiceDueDays(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const days = Number(trimmed)
  return days <= 90 ? days : null
}
