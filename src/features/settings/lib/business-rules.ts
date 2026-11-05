import type { components } from '@/api/types.gen'
import type {
  CleanMethod,
  NoDirectDebitAction,
  PaymentTimingOption,
} from '@/types/setup-wizard'
import type { PreCleanReminder } from '@/api/types'

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
  eveningReminderEnabled: boolean
  /** `HH:mm`. */
  eveningReminderTime: string
  morningReminderEnabled: boolean
  /** `HH:mm`. */
  morningReminderTime: string
}

/**
 * `preCleanReminders` → the form, which keeps a tick and a time per reminder. A backend that only
 * returns the legacy `reminderMode` + `reminderTime` is still understood.
 */
export function reminderToForm(
  data:
    | { preCleanReminders?: PreCleanReminder[]; reminderMode?: ReminderMode; reminderTime?: string }
    | null
    | undefined,
  defaults: ReminderFormValues,
): ReminderFormValues {
  const list =
    data?.preCleanReminders ??
    (data?.reminderMode && data.reminderMode !== 'NONE'
      ? [{ type: data.reminderMode, time: data.reminderTime ?? '' }]
      : data?.reminderMode === 'NONE'
        ? []
        : undefined)
  if (!list) return defaults
  const evening = list.find((reminder) => reminder.type === 'EVENING_BEFORE')
  const morning = list.find((reminder) => reminder.type === 'MORNING_OF')
  return {
    eveningReminderEnabled: Boolean(evening),
    eveningReminderTime: evening?.time || defaults.eveningReminderTime,
    morningReminderEnabled: Boolean(morning),
    morningReminderTime: morning?.time || defaults.morningReminderTime,
  }
}

/** Only ticked reminders are sent; no ticks = `[]` ("Don't send reminders"). */
export function reminderFromForm(values: ReminderFormValues): { preCleanReminders: PreCleanReminder[] } {
  const preCleanReminders: PreCleanReminder[] = []
  if (values.eveningReminderEnabled) preCleanReminders.push({ type: 'EVENING_BEFORE', time: values.eveningReminderTime })
  if (values.morningReminderEnabled) preCleanReminders.push({ type: 'MORNING_OF', time: values.morningReminderTime })
  return { preCleanReminders }
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

/**
 * BUG-05: the accepted list from the API; an older tenant without one accepts just its default.
 * The default is always part of the list.
 */
export function acceptedMethodsToForm(
  accepted: readonly string[] | null | undefined,
  defaultMethod: string,
): string[] {
  const list = accepted && accepted.length > 0 ? [...accepted] : []
  if (defaultMethod && !list.includes(defaultMethod)) list.unshift(defaultMethod)
  return list
}
