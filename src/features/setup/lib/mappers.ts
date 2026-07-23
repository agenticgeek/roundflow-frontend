import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  Round,
  RoundInput,
  Service,
  ServiceArea,
  ServiceInput,
  SetupStep9Bundle,
  SetupStep9Input,
  SetupStep10Input,
  SetupStep10Result,
  SetupStep11Input,
  SetupStep11Status,
  Technician,
  TechnicianAppStatus,
  TechnicianInput,
} from '@/api/types'
import type { SetupStep2Input } from '@/api/setup.api'
import { daysToCycleLength, cycleLengthToDays } from '@/lib/cycle-length'
import { deriveTechnicianAppStatus } from '@/api/types'
import type {
  ActivateSystemData,
  AssignTechniciansData,
  BusinessProfileData,
  CatalogueService,
  PaymentSetupData,
  PropertyDraft,
  PropertyRecord,
  RoundSettingsData,
  ServiceArea as WizardServiceArea,
  ServiceAreaData,
  ServiceCatalogueData,
  Technician as WizardTechnician,
  TechnicianManagementData,
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

const PAYMENT_RULE_UI_TO_API: Record<string, SetupStep2Input['paymentRule']> = {
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

export function businessProfileToForm(
  data: BusinessSettings | null | undefined,
): BusinessProfileData {
  const defaults = setupWizardContent.businessProfile.defaults
  if (!data) return defaults

  return {
    businessName: data.businessName ?? defaults.businessName,
    businessPhone: data.phone ?? defaults.businessPhone,
    businessEmail: data.email ?? defaults.businessEmail,
    serviceArea: defaults.serviceArea,
    companyNumber: data.companyNumber ?? defaults.companyNumber,
    vatNumber: data.vatRegistration ?? defaults.vatNumber,
    vatRegistered: data.vatRegistered ?? defaults.vatRegistered,
    workingDays: (data.defaultWorkingDays ?? []).map(
      (day) => DAY_API_TO_UI[day] ?? day.toLowerCase(),
    ),
    timezone: data.timezone ?? defaults.timezone,
    currency: data.currency ?? defaults.currency,
  }
}

export function businessProfileFromForm(values: BusinessProfileData) {
  return {
    businessName: values.businessName.trim(),
    phone: values.businessPhone.trim(),
    email: values.businessEmail.trim(),
    companyNumber: values.companyNumber.trim() || undefined,
    vatRegistered: values.vatRegistered ?? undefined,
    vatRegistration: values.vatNumber.trim() || undefined,
    defaultWorkingDays: values.workingDays.map((day) => DAY_UI_TO_API[day] ?? day.toUpperCase()),
    timezone: values.timezone,
    currency: values.currency,
  }
}

export function paymentSetupToForm(
  data: BusinessSettings | null | undefined,
): PaymentSetupData {
  const defaults = setupWizardContent.paymentSetup.defaults
  if (!data) return defaults

  return {
    goCardlessConnected: data.gocardlessConnected ?? defaults.goCardlessConnected,
    stripeConnected: data.stripeConnected ?? defaults.stripeConnected,
    defaultPaymentRule:
      PAYMENT_RULE_API_TO_UI[data.paymentRule ?? ''] ?? defaults.defaultPaymentRule,
    vatApplicable: data.vatInInvoices ?? defaults.vatApplicable,
    debtHoldEnabled: data.debtHoldEnabled ?? defaults.debtHoldEnabled,
  }
}

export function paymentSetupFromForm(values: PaymentSetupData): SetupStep2Input {
  return {
    paymentRule: PAYMENT_RULE_UI_TO_API[values.defaultPaymentRule],
    debtHoldEnabled: values.debtHoldEnabled,
    vatInInvoices: values.vatApplicable,
    gocardlessConnected: values.goCardlessConnected,
    stripeConnected: values.stripeConnected,
  }
}

export function servicesToForm(services: Service[] | undefined): ServiceCatalogueData {
  const defaults = setupWizardContent.serviceCatalogue.defaults
  if (!services?.length) return defaults

  return {
    services: services.map((service, index) => ({
      id: service.id ?? `service-${index}`,
      name: service.name ?? '',
      description: service.description ?? '',
      categoryId:
        CATEGORY_API_TO_UI[service.category ?? ''] ?? 'window-cleaning',
      price: Number.parseFloat(service.defaultPrice ?? '0') || 0,
      active: service.active ?? true,
      isDefault: index === 0,
    })),
  }
}

export function servicesFromForm(values: ServiceCatalogueData): ServiceInput[] {
  return values.services.map((service) => ({
    name: service.name.trim(),
    defaultPrice: service.price,
    category: CATEGORY_UI_TO_API[service.categoryId],
    description: service.description.trim() || undefined,
    active: service.active,
  }))
}

export function roundSettingsToForm(
  data: BusinessSettings | null | undefined,
): RoundSettingsData {
  const defaults = setupWizardContent.roundSettings.defaults
  if (!data) return defaults

  return {
    ...defaults,
    recurringCycle: daysToCycleLength(data.defaultCycleLength),
  }
}

export function roundSettingsFromForm(values: RoundSettingsData) {
  return {
    defaultCycleLength: cycleLengthToDays(values.recurringCycle),
  }
}

function toWizardAppStatus(
  status: TechnicianAppStatus | undefined,
): WizardTechnician['appStatus'] {
  switch (status) {
    case 'PENDING_INVITE':
      return 'pending'
    case 'INACTIVE':
      return 'inactive'
    case 'ACTIVE':
    default:
      return 'active'
  }
}

export function techniciansToForm(
  technicians: Technician[] | undefined,
): TechnicianManagementData {
  const defaults = setupWizardContent.technicianManagement.defaults
  if (!technicians?.length) return defaults

  return {
    technicians: technicians.map((technician, index) => ({
      id: technician.id ?? `tech-${index}`,
      fullName: technician.displayName ?? technician.name ?? '',
      mobile: technician.phone ?? '',
      email: '',
      role: technician.role ?? '',
      defaultArea: '',
      appStatus:
        toWizardAppStatus(technician.appStatus ?? deriveTechnicianAppStatus(technician)),
    })),
  }
}

/** Step 6 replaces invite-pending rows only — accepted technicians are preserved server-side. */
export function pendingTechniciansFromForm(
  values: TechnicianManagementData,
): TechnicianInput[] {
  return values.technicians
    .filter(
      (technician) =>
        technician.appStatus === 'pending' || technician.id.startsWith('tech-'),
    )
    .map((technician) => ({
      name: technician.fullName.trim(),
      phone: technician.mobile.trim() || undefined,
      role: technician.role.trim() || undefined,
      active: true,
    }))
}

export function serviceAreasToForm(
  areas: ServiceArea[] | undefined,
): ServiceAreaData {
  const defaults = setupWizardContent.serviceArea.defaults
  if (!areas?.length) return defaults

  return {
    areas: areas.map((area, index) => ({
      id: area.id ?? `area-${index}`,
      name: area.name ?? '',
      postcodeSectors: area.postcodeSector
        ? area.postcodeSector.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        : [],
      notes: '',
    })),
  }
}

export function serviceAreasFromForm(values: ServiceAreaData) {
  return values.areas.map((area, index) => ({
    name: area.name.trim(),
    postcodeSector: area.postcodeSectors.join(',') || undefined,
    isDefault: index === 0,
  }))
}

export interface FirstRoundFormValues {
  name: string
  defaultDay: string
  frequency: string
  serviceAreaId: string
}

export function firstRoundToForm(
  rounds: Round[] | undefined,
  serviceAreas: ServiceArea[] | undefined,
): FirstRoundFormValues {
  const round = rounds?.[0]
  return {
    name: round?.name ?? '',
    defaultDay: round?.defaultDay ?? 'MON',
    frequency: round?.frequency ?? 'FOUR_WEEKLY',
    serviceAreaId: round?.serviceAreaId ?? serviceAreas?.[0]?.id ?? '',
  }
}

export function firstRoundFromForm(values: FirstRoundFormValues): RoundInput {
  return {
    name: values.name.trim(),
    defaultDay: values.defaultDay as RoundInput['defaultDay'],
    frequency: values.frequency as RoundInput['frequency'],
    serviceAreaId: values.serviceAreaId || undefined,
  }
}

export function step9BundlesToRecords(
  bundles: SetupStep9Bundle[] | undefined,
): PropertyRecord[] {
  if (!bundles?.length) return []

  return bundles.map((bundle) => ({
    id: bundle.property.id,
    customerName: bundle.customer.name,
    propertyName: bundle.property.propertyName ?? bundle.customer.name,
    phone: bundle.customer.phone ?? '',
    email: bundle.customer.email ?? '',
    fullAddress: bundle.property.addressLine,
    postcode: bundle.property.postcode,
    serviceArea: bundle.property.serviceAreaId ?? '',
    propertyType: bundle.property.propertyType ?? 'HOUSE',
    cleaningFrequency: bundle.servicePlan.cleaningFrequency ?? 'FOUR_WEEKLY',
    pricePerVisit: bundle.servicePlan.price,
    vat: '',
    paymentMethod: bundle.servicePlan.paymentMethod ?? '',
    startDate: '',
    preferredDay: '',
    nextVisitDate: '',
    customerNotes: '',
    riskNotes: bundle.property.riskNotes ?? '',
    accessNotes: bundle.property.accessNotes ?? '',
    round: bundle.property.roundId ?? '',
    assignServiceArea: bundle.property.serviceAreaId ?? '',
    serviceId: bundle.servicePlan.serviceId ?? '',
  }))
}

export function propertyDraftToStep9Input(draft: PropertyDraft): SetupStep9Input {
  const price = Number(String(draft.pricePerVisit).replace(/[^0-9.]/g, ''))
  const serviceAreaId = draft.assignServiceArea || draft.serviceArea || undefined

  return {
    customerName: draft.customerName.trim(),
    fullAddress: draft.fullAddress.trim(),
    postcode: draft.postcode.trim(),
    price,
    roundId: draft.round,
    ...(draft.propertyName.trim() ? { propertyName: draft.propertyName.trim() } : {}),
    ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
    ...(draft.email.trim() ? { email: draft.email.trim() } : {}),
    ...(serviceAreaId ? { serviceAreaId } : {}),
    ...(draft.propertyType
      ? { propertyType: draft.propertyType as SetupStep9Input['propertyType'] }
      : {}),
    ...(draft.cleaningFrequency
      ? {
          cleaningFrequency:
            draft.cleaningFrequency as SetupStep9Input['cleaningFrequency'],
        }
      : {}),
    ...(draft.paymentMethod
      ? { paymentMethod: draft.paymentMethod as SetupStep9Input['paymentMethod'] }
      : {}),
    ...(draft.serviceId ? { serviceId: draft.serviceId } : {}),
    ...(draft.accessNotes.trim() ? { accessNotes: draft.accessNotes.trim() } : {}),
    ...(draft.riskNotes.trim() ? { riskNotes: draft.riskNotes.trim() } : {}),
  }
}

export function step10ToForm(data: SetupStep10Result | undefined): AssignTechniciansData {
  if (!data) return { rounds: [] }

  return {
    rounds: data.assignments.map((assignment) => ({
      id: assignment.roundId,
      name: assignment.roundName,
      areaName: assignment.serviceAreaName ?? '—',
      day: assignment.defaultDay ?? '',
      propertyCount: assignment.propertyCount,
      technicianId: assignment.technicianIds[0] ?? '',
    })),
  }
}

export function step10FromForm(values: AssignTechniciansData): SetupStep10Input {
  return {
    assignments: values.rounds.map((round) => ({
      roundId: round.id,
      technicianIds: round.technicianId ? [round.technicianId] : [],
    })),
  }
}

export function techniciansForAssignStep(
  technicians: Technician[] | undefined,
): WizardTechnician[] {
  return (technicians ?? [])
    .filter((technician): technician is Technician & { id: string } => Boolean(technician.id))
    .map((technician) => ({
      id: technician.id,
      fullName: technician.displayName ?? technician.name ?? 'Technician',
      mobile: technician.phone ?? '',
      email: '',
      role: technician.role ?? '',
      defaultArea: '',
      appStatus:
        technician.appStatus === 'ACTIVE'
          ? 'active'
          : technician.appStatus === 'INACTIVE'
            ? 'inactive'
            : 'pending',
    }))
}

export function step11ToForm(
  status: SetupStep11Status | undefined,
  roundIds: string[] = [],
): ActivateSystemData {
  const defaults = setupWizardContent.activateSystem.defaults
  const today = new Date().toISOString().slice(0, 10)

  return {
    generateVisitsMode: defaults.generateVisitsMode,
    startDate: defaults.startDate || today,
    cycleWeeks: defaults.cycleWeeks,
    roundIds: status?.activated ? roundIds : roundIds,
  }
}

export function step11FromForm(values: ActivateSystemData): SetupStep11Input {
  const generateAll = values.generateVisitsMode === 'all'
  return {
    startDate: values.startDate,
    cycleWeeks: values.cycleWeeks,
    generateAll,
    ...(!generateAll ? { roundIds: values.roundIds } : {}),
  }
}

export type { WizardServiceArea, CatalogueService }

