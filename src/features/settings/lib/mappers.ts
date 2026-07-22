import type { BusinessSettings, Service, ServiceArea, Technician } from '@/api/types'
import type { PaymentSettingsPatch } from '@/api/settings.api'
import { daysToCycleLength, cycleLengthToDays } from '@/lib/cycle-length'
import { deriveTechnicianAppStatus } from '@/api/types'
import type { components } from '@/api/types.gen'
import type {
  CatalogueService,
  RecurringCycle,
} from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'

const DAY_UI_TO_API: Record<string, string> = {
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

const PAYMENT_RULE_UI_TO_API: Record<string, PaymentSettingsPatch['paymentRule']> = {
  'collect-after-visit': 'COLLECT_AFTER_VISIT',
  'collect-before-visit': 'COLLECT_BEFORE_VISIT',
  // CONTRACT-DIFF: UI "Monthly Invoice" maps to COLLECT_ON_DATE until labels align.
  'monthly-invoice': 'COLLECT_ON_DATE',
}

const PAYMENT_RULE_API_TO_UI: Record<string, string> = {
  COLLECT_AFTER_VISIT: 'collect-after-visit',
  COLLECT_BEFORE_VISIT: 'collect-before-visit',
  COLLECT_ON_DATE: 'monthly-invoice',
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
  vatNumber: string
  vatRegistered: boolean | null
  timezone: string
  currency: string
}

export type SettingsPaymentForm = {
  defaultPaymentRule: string
  vatApplicable: boolean
  debtHoldEnabled: boolean
  goCardlessConnected: boolean
  stripeConnected: boolean
}

export type SettingsRoundForm = {
  recurringCycle: RecurringCycle
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
    vatNumber: data?.vatRegistration ?? defaults.vatNumber,
    vatRegistered: data?.vatRegistered ?? defaults.vatRegistered,
    timezone: data?.timezone ?? defaults.timezone,
    currency: data?.currency ?? defaults.currency,
  }
}

export function settingsBusinessFromForm(values: SettingsBusinessForm) {
  return {
    businessName: values.businessName.trim(),
    phone: values.businessPhone.trim() || null,
    email: values.businessEmail.trim() || null,
    companyNumber: values.companyNumber.trim() || null,
    vatRegistration: values.vatNumber.trim() || null,
    vatRegistered: values.vatRegistered ?? undefined,
    timezone: values.timezone || null,
    currency: values.currency || null,
  }
}

export function settingsPaymentToForm(
  data: BusinessSettings | null | undefined,
): SettingsPaymentForm {
  const defaults = setupWizardContent.paymentSetup.defaults
  return {
    defaultPaymentRule:
      PAYMENT_RULE_API_TO_UI[data?.paymentRule ?? ''] ?? defaults.defaultPaymentRule,
    vatApplicable: data?.vatInInvoices ?? defaults.vatApplicable,
    debtHoldEnabled: data?.debtHoldEnabled ?? defaults.debtHoldEnabled,
    goCardlessConnected: data?.gocardlessConnected ?? defaults.goCardlessConnected,
    stripeConnected: data?.stripeConnected ?? defaults.stripeConnected,
  }
}

export function settingsPaymentFromForm(values: SettingsPaymentForm): PaymentSettingsPatch {
  return {
    paymentRule: PAYMENT_RULE_UI_TO_API[values.defaultPaymentRule],
    vatInInvoices: values.vatApplicable,
    debtHoldEnabled: values.debtHoldEnabled,
  }
}

export function settingsRoundToForm(
  data: BusinessSettings | null | undefined,
): SettingsRoundForm {
  const defaults = setupWizardContent.roundSettings.defaults
  const profileDefaults = setupWizardContent.businessProfile.defaults
  return {
    recurringCycle: daysToCycleLength(data?.defaultCycleLength) ?? defaults.recurringCycle,
    workingDays: (data?.defaultWorkingDays ?? profileDefaults.workingDays).map(
      (day) => DAY_API_TO_UI[day] ?? day.toLowerCase(),
    ),
  }
}

export function settingsRoundFromForm(values: SettingsRoundForm) {
  return {
    defaultCycleLength: cycleLengthToDays(values.recurringCycle),
    defaultWorkingDays: values.workingDays.map(
      (day) => DAY_UI_TO_API[day] ?? day.toUpperCase(),
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
