import type { BusinessSettings, Service, ServiceArea, Technician } from '@/api/types'
import type { BusinessProfilePatch, PaymentSettingsPatch, RoundSettingsPatch } from '@/api/settings.api'
import { bankDetailsFromForm, bankDetailsToForm } from '@/lib/bank-details'
import { deriveTechnicianAppStatus } from '@/api/types'
import type { components } from '@/api/types.gen'
import type {
  BankDetailsForm,
  CatalogueService,
  NoDirectDebitAction,
  RoundSettingsData,
} from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { roundSettingsFromForm, roundSettingsToForm } from '@/features/setup/lib/mappers'
import {
  noDirectDebitFromForm,
  noDirectDebitToForm,
  type PaymentTiming,
} from '@/features/settings/lib/business-rules'

type DayOfWeek = components['schemas']['DayOfWeek']

const DAY_UI_TO_API: Record<string, DayOfWeek> = {
  mon: 'MON',
  tue: 'TUE',
  wed: 'WED',
  thu: 'THU',
  fri: 'FRI',
  sat: 'SAT',
  sun: 'SUN',
}

const DAY_API_TO_UI: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_UI_TO_API).map(([ui, api]) => [api, ui]),
)

const PAYMENT_RULE_UI_TO_API: Record<string, PaymentTiming> = {
  'collect-after-visit': 'COLLECT_AFTER_VISIT',
  'collect-before-visit': 'COLLECT_BEFORE_VISIT',
  'monthly-invoice': 'COLLECT_ON_DATE',
  // GAP-008: "once a day for all completed visits".
  'daily-batch': 'COLLECT_DAILY_BATCH',
}

const PAYMENT_RULE_API_TO_UI: Record<PaymentTiming, string> = {
  COLLECT_AFTER_VISIT: 'collect-after-visit',
  COLLECT_BEFORE_VISIT: 'collect-before-visit',
  COLLECT_ON_DATE: 'monthly-invoice',
  COLLECT_DAILY_BATCH: 'daily-batch',
}

const CATEGORY_UI_TO_API: Record<string, components['schemas']['ServiceCategory']> = {
  'window-cleaning': 'WINDOW_CLEANING',
  'exterior-cleaning': 'EXTERIOR_CLEANING',
  'gutter-fascia': 'GUTTER_FASCIA',
  specialist: 'SPECIALIST',
}

const CATEGORY_API_TO_UI: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_UI_TO_API).map(([ui, api]) => [api, ui]),
)

export type SettingsBusinessForm = {
  businessName: string
  businessPhone: string
  businessEmail: string
  companyNumber: string
  addressLine1: string
  addressLine2: string
  town: string
  postcode: string
  vatNumber: string
  vatRegistered: boolean | null
  /** Select value, e.g. "20" — sent as a number. */
  vatRate: string
  timezone: string
  currency: string
  bankDetails: BankDetailsForm
}

export type SettingsPaymentForm = {
  defaultPaymentRule: string
  vatApplicable: boolean
  debtHoldEnabled: boolean
  goCardlessConnected: boolean
  stripeConnected: boolean
  /** GAP-008 payment defaults. PaymentMethod enum value. */
  defaultPaymentMethod: string
  /** Text input — a whole number 0–90. */
  invoiceDueDays: string
  noDirectDebitAction: NoDirectDebitAction
}

/** GAP-003: the same round rules as the wizard's step 4, plus working days. */
export type SettingsRoundForm = RoundSettingsData & {
  workingDays: string[]
}

export function settingsBusinessToForm(
  data: BusinessSettings | null | undefined,
): SettingsBusinessForm {
  const defaults = setupWizardContent.businessProfile.defaults
  return {
    businessName: data?.businessName ?? defaults.businessName,
    businessPhone: data?.phone ?? defaults.businessPhone,
    businessEmail: data?.email ?? defaults.businessEmail,
    companyNumber: data?.companyNumber ?? defaults.companyNumber,
    addressLine1: data?.addressLine1 ?? defaults.businessAddress,
    addressLine2: data?.addressLine2 ?? defaults.addressLine2,
    town: data?.town ?? defaults.town,
    postcode: data?.postcode ?? defaults.postcode,
    vatNumber: data?.vatRegistration ?? defaults.vatNumber,
    vatRegistered: data?.vatRegistered ?? defaults.vatRegistered,
    vatRate: data?.vatRate != null ? String(data.vatRate) : defaults.vatRate,
    timezone: data?.timezone ?? defaults.timezone,
    currency: data?.currency ?? defaults.currency,
    // GET /settings/business-profile per the Bank Details handoff.
    bankDetails: bankDetailsToForm(data?.bankDetails),
  }
}

export function settingsBusinessFromForm(values: SettingsBusinessForm): BusinessProfilePatch {
  return {
    businessName: values.businessName.trim(),
    phone: values.businessPhone.trim() || null,
    email: values.businessEmail.trim() || null,
    companyNumber: values.companyNumber.trim() || null,
    addressLine1: values.addressLine1.trim() || null,
    addressLine2: values.addressLine2.trim() || null,
    town: values.town.trim() || null,
    postcode: values.postcode.trim().toUpperCase() || null,
    vatRegistration: values.vatNumber.trim() || null,
    vatRegistered: values.vatRegistered ?? undefined,
    vatRate: Number(values.vatRate),
    timezone: values.timezone || null,
    currency: values.currency || null,
    // PATCH /settings/business-profile per the Bank Details handoff — omitting the key
    // (not calling this mapper) leaves it unchanged; null here clears it explicitly.
    bankDetails: bankDetailsFromForm(values.bankDetails),
  }
}

export function settingsPaymentToForm(
  data: BusinessSettings | null | undefined,
): SettingsPaymentForm {
  const defaults = setupWizardContent.paymentSetup.defaults
  const wizardDefaults = setupWizardContent.payments.formDefaults
  return {
    defaultPaymentRule: data?.paymentRule
      ? PAYMENT_RULE_API_TO_UI[data.paymentRule]
      : defaults.defaultPaymentRule,
    vatApplicable: data?.vatInInvoices ?? defaults.vatApplicable,
    debtHoldEnabled: data?.debtHoldEnabled ?? defaults.debtHoldEnabled,
    goCardlessConnected: data?.gocardlessConnected ?? defaults.goCardlessConnected,
    stripeConnected: data?.stripeConnected ?? defaults.stripeConnected,
    defaultPaymentMethod: data?.defaultPaymentMethod ?? wizardDefaults.defaultPaymentMethod,
    invoiceDueDays:
      data?.invoiceDueDays != null ? String(data.invoiceDueDays) : wizardDefaults.invoiceDueDays,
    noDirectDebitAction: noDirectDebitToForm(data?.noDirectDebitAction, wizardDefaults.noDirectDebitAction),
  }
}

export function settingsPaymentFromForm(values: SettingsPaymentForm): PaymentSettingsPatch {
  return {
    paymentRule: PAYMENT_RULE_UI_TO_API[values.defaultPaymentRule],
    vatInInvoices: values.vatApplicable,
    debtHoldEnabled: values.debtHoldEnabled,
    defaultPaymentMethod: values.defaultPaymentMethod as PaymentSettingsPatch['defaultPaymentMethod'],
    invoiceDueDays: Number(values.invoiceDueDays),
    noDirectDebitAction: noDirectDebitFromForm(values.noDirectDebitAction),
  }
}

export function settingsRoundToForm(
  data: BusinessSettings | null | undefined,
): SettingsRoundForm {
  const profileDefaults = setupWizardContent.businessProfile.defaults
  return {
    // `preCleanReminderTimings` is deprecated (B2) and no longer read — reminderMode replaces it.
    ...roundSettingsToForm(data),
    workingDays: (data?.defaultWorkingDays ?? profileDefaults.workingDays).map(
      (day) => DAY_API_TO_UI[day] ?? day.toLowerCase(),
    ),
  }
}

export function settingsRoundFromForm(values: SettingsRoundForm): RoundSettingsPatch {
  return {
    ...roundSettingsFromForm(values),
    defaultWorkingDays: values.workingDays.map(
      (day) => DAY_UI_TO_API[day] ?? (day.toUpperCase() as DayOfWeek),
    ),
  }
}

export function settingsServicesToCatalogue(services: Service[] | undefined): CatalogueService[] {
  if (!services?.length) return []
  return services.map((service, index) => ({
    id: service.id ?? `service-${index}`,
    name: service.name ?? '',
    description: service.description ?? '',
    categoryId: CATEGORY_API_TO_UI[service.category ?? ''] ?? 'window-cleaning',
    price: Number.parseFloat(service.defaultPrice ?? '0') || 0,
    active: service.active ?? true,
    isDefault: service.category === 'DEFAULT',
  }))
}

export function catalogueServiceToInput(service: CatalogueService) {
  return {
    name: service.name.trim(),
    defaultPrice: service.price,
    category: service.isDefault
      ? ('DEFAULT' as const)
      : CATEGORY_UI_TO_API[service.categoryId],
    description: service.description.trim() || undefined,
    active: service.active,
  }
}

export type SettingsTechnicianRow = {
  id: string
  displayName: string
  phone: string
  role: string
  appStatus: 'pending' | 'active' | 'inactive'
  profileId: string | null
  active: boolean
}

export function settingsTechniciansToRows(
  technicians: Technician[] | undefined,
): SettingsTechnicianRow[] {
  if (!technicians?.length) return []
  return technicians.map((technician, index) => {
    const apiStatus =
      technician.appStatus ?? deriveTechnicianAppStatus(technician)
    return {
      id: technician.id ?? `tech-${index}`,
      displayName: technician.displayName ?? technician.name ?? '',
      phone: technician.phone ?? '',
      role: technician.role ?? '',
      appStatus:
        apiStatus === 'PENDING_INVITE'
          ? 'pending'
          : apiStatus === 'INACTIVE'
            ? 'inactive'
            : 'active',
      profileId: technician.profileId ?? null,
      active: technician.active !== false,
    }
  })
}

export type SettingsServiceAreaRow = {
  id: string
  name: string
  postcodeSectors: string[]
  linkedRounds: { count: number; names: string[] }
  isDefault: boolean
}

export function settingsServiceAreasToRows(
  areas: ServiceArea[] | undefined,
): SettingsServiceAreaRow[] {
  if (!areas?.length) return []
  return areas.map((area, index) => ({
    id: area.id ?? `area-${index}`,
    name: area.name ?? '',
    postcodeSectors: area.postcodeSector
      ? area.postcodeSector.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      : [],
    linkedRounds: {
      count: area.linkedRounds?.count ?? 0,
      names: area.linkedRounds?.names ?? [],
    },
    isDefault: area.isDefault ?? false,
  }))
}
