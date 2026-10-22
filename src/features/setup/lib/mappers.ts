import type { components } from '@/api/types.gen'
import type {
  BusinessSettings,
  CleaningFrequency,
  Service,
  ServiceArea,
  ServiceInput,
  SetupStep9Bundle,
  SetupStep9BulkItem,
  SetupStep9Input,
} from '@/api/types'
import type { SetupStep2Input, SetupStep5Input, SetupStep5Template } from '@/api/setup.api'
import { daysToCycleLength, cycleLengthToDays } from '@/lib/cycle-length'
import { bankDetailsFromForm, bankDetailsToForm } from '@/lib/bank-details'
import type {
  BusinessProfileData,
  CatalogueService,
  MessageChannel,
  WizardPaymentData,
  WizardMessage,
  WizardMessagesData,
  PropertyDraft,
  PropertyRecord,
  RecurringCycle,
  RoundSettingsData,
  ServiceArea as WizardServiceArea,
  ServiceAreaData,
  ServiceCatalogueData,
} from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'

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

const CATEGORY_UI_TO_API: Record<string, components['schemas']['ServiceCategory']> = {
  'window-cleaning': 'WINDOW_CLEANING',
  'exterior-cleaning': 'EXTERIOR_CLEANING',
  'gutter-fascia': 'GUTTER_FASCIA',
  specialist: 'SPECIALIST',
}

const CATEGORY_API_TO_UI: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_UI_TO_API).map(([ui, api]) => [api, ui]),
)

// CONTRACT-DIFF: business address, postcode and VAT rate are frontend-only until the
// step-1 endpoint accepts them. Read them if the API starts returning them; they are not
// sent in businessProfileFromForm yet.
type BusinessSettingsWithPendingFields = BusinessSettings & {
  businessAddress?: string | null
  postcode?: string | null
  vatRate?: number | string | null
}

export function businessProfileToForm(
  data: BusinessSettingsWithPendingFields | null | undefined,
): BusinessProfileData {
  const defaults = setupWizardContent.businessProfile.defaults
  if (!data) return defaults

  return {
    businessName: data.businessName ?? defaults.businessName,
    businessPhone: data.phone ?? defaults.businessPhone,
    businessEmail: data.email ?? defaults.businessEmail,
    companyNumber: data.companyNumber ?? defaults.companyNumber,
    businessAddress: data.businessAddress ?? defaults.businessAddress,
    postcode: data.postcode ?? defaults.postcode,
    vatNumber: data.vatRegistration ?? defaults.vatNumber,
    vatRegistered: data.vatRegistered ?? defaults.vatRegistered,
    vatRate: data.vatRate != null ? String(data.vatRate) : defaults.vatRate,
    workingDays: (data.defaultWorkingDays ?? []).map(
      (day) => DAY_API_TO_UI[day] ?? day.toLowerCase(),
    ),
    timezone: data.timezone ?? defaults.timezone,
    currency: data.currency ?? defaults.currency,
    // GET /setup/step/1 per the Bank Details — Setup Wizard Step 1 handoff.
    bankDetails: bankDetailsToForm(data.bankDetails),
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
    defaultWorkingDays: values.workingDays.map(
      (day) => DAY_UI_TO_API[day] ?? (day.toUpperCase() as DayOfWeek),
    ),
    timezone: values.timezone,
    currency: values.currency,
    // POST /setup/step/1 per the Bank Details — Setup Wizard Step 1 handoff.
    bankDetails: bankDetailsFromForm(values.bankDetails),
  }
}

// CONTRACT-DIFF: step 2 stores provider flags, debt hold, VAT and a payment rule. The default
// payment method, invoice due days and the no-Direct-Debit action are frontend-only for now;
// "once a day" timing is sent as COLLECT_ON_DATE until the API has a daily option.
export function wizardPaymentToForm(data: BusinessSettings | null | undefined): WizardPaymentData {
  const defaults = setupWizardContent.payments.formDefaults
  if (!data) return defaults
  const goCardlessConnected = data.gocardlessConnected ?? defaults.goCardlessConnected
  const stripeConnected = data.stripeConnected ?? defaults.stripeConnected
  return {
    ...defaults,
    goCardlessConnected,
    stripeConnected,
    defaultPaymentMethod: goCardlessConnected ? 'GOCARDLESS' : defaults.defaultPaymentMethod,
    paymentTiming: data.paymentRule === 'COLLECT_ON_DATE' ? 'daily' : 'after-visit',
    noDirectDebitAction: stripeConnected ? 'card-link' : 'invoice',
    debtHoldEnabled: data.debtHoldEnabled ?? defaults.debtHoldEnabled,
  }
}

/**
 * VAT lives in Business Profile — `vatRegistered` comes from step 1 so invoices follow it.
 * The connect flags aren't sent: providers connect through the real Stripe / GoCardless
 * flows, and echoing the flags back could overwrite a connection made since the step loaded.
 */
export function wizardPaymentFromForm(
  values: WizardPaymentData,
  vatRegistered: boolean,
): SetupStep2Input {
  return {
    paymentRule: values.paymentTiming === 'daily' ? 'COLLECT_ON_DATE' : 'COLLECT_AFTER_VISIT',
    debtHoldEnabled: values.debtHoldEnabled,
    vatInInvoices: vatRegistered,
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

// CONTRACT-DIFF: step 4 only persists the cycle length. Clean method, reminder schedule/times
// and auto-create are frontend-only until the endpoint accepts them.
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

const CHANNEL_API_TO_UI: Record<string, MessageChannel> = {
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
}

const CHANNEL_UI_TO_API: Record<MessageChannel, SetupStep5Input['channel']> = {
  sms: 'SMS',
  whatsapp: 'WHATSAPP',
  email: 'EMAIL',
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Server rows → wizard messages. The API stores one template per channel, so rows sharing
 * a name are one message. Catalogue messages with no saved rows keep their defaults;
 * saved names the catalogue doesn't know are kept under "Other".
 */
export function wizardMessagesToForm(rows: SetupStep5Template[] | undefined): WizardMessagesData {
  const { catalogue } = setupWizardContent.messages
  const aliases: Record<string, readonly string[]> = setupWizardContent.messages.aliases
  const byName = new Map<string, SetupStep5Template[]>()
  for (const row of rows ?? []) {
    const key = normalizeName(row.name)
    byName.set(key, [...(byName.get(key) ?? []), row])
  }

  const used = new Set<string>()
  const messages: WizardMessage[] = catalogue.map((message) => {
    const names = [message.name, ...(aliases[message.key] ?? [])].map(normalizeName)
    const name = names.find((candidate) => byName.has(candidate))
    if (!name) return { ...message, channels: [...message.channels] }
    used.add(name)
    const saved = byName.get(name) ?? []
    return {
      ...message,
      channels: saved.map((row) => CHANNEL_API_TO_UI[row.channel ?? 'SMS'] ?? 'sms'),
      body: saved[0]?.body ?? message.body,
    }
  })

  for (const [name, saved] of byName) {
    if (used.has(name)) continue
    messages.push({
      key: `custom-${name}`,
      name: saved[0]?.name ?? name,
      group: 'other',
      description: '',
      channels: saved.map((row) => CHANNEL_API_TO_UI[row.channel ?? 'SMS'] ?? 'sms'),
      body: saved[0]?.body ?? '',
    })
  }
  return { messages }
}

/** Wizard messages → `POST /setup/step/5` bulk-replace payload: one row per message channel. */
export function wizardMessagesFromForm(values: WizardMessagesData): SetupStep5Input[] {
  return values.messages.flatMap((message) =>
    message.channels.map((channel) => ({
      name: message.name.trim(),
      channel: CHANNEL_UI_TO_API[channel] ?? 'SMS',
      body: message.body.trim(),
      ...(channel === 'email' ? { subject: message.name.trim() } : {}),
    })),
  )
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
      // CONTRACT-DIFF: the API has no area notes yet — they stay frontend-only and aren't sent.
      notes: '',
      roundCount: area.linkedRounds?.count ?? 0,
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

const RECURRING_CYCLE_TO_FREQUENCY: Record<RecurringCycle, CleaningFrequency> = {
  '4-week': 'FOUR_WEEKLY',
  '6-week': 'SIX_WEEKLY',
  '8-week': 'EIGHT_WEEKLY',
  '12-week': 'TWELVE_WEEKLY',
}

/** Business default cycle (Round Settings) as a round frequency — prefills new rounds. */
export function defaultRoundFrequency(defaultCycleLengthDays?: number | null): CleaningFrequency {
  return RECURRING_CYCLE_TO_FREQUENCY[daysToCycleLength(defaultCycleLengthDays)] ?? 'FOUR_WEEKLY'
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
    landline: bundle.customer.landline ?? '',
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
    serviceIds: bundle.servicePlan.serviceId ? [bundle.servicePlan.serviceId] : [],
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
    ...(draft.round ? { roundId: draft.round } : {}),
    ...(draft.propertyName.trim() ? { propertyName: draft.propertyName.trim() } : {}),
    ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
    ...(draft.landline.trim() ? { landline: draft.landline.trim() } : {}),
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
    ...(draft.serviceIds.length > 0
      ? { serviceId: draft.serviceIds[0], serviceIds: draft.serviceIds }
      : draft.serviceId
        ? { serviceId: draft.serviceId }
        : {}),
    ...(draft.accessNotes.trim() ? { accessNotes: draft.accessNotes.trim() } : {}),
    ...(draft.riskNotes.trim() ? { riskNotes: draft.riskNotes.trim() } : {}),
  }
}

/**
 * One row for POST /setup/step/9/bulk. Built from the single-property mapping so both paths
 * stay in sync; serviceAreaId is required here. `serviceId` stays as the primary of a
 * multi-service selection alongside `serviceIds`.
 */
export function propertyDraftToStep9BulkItem(draft: PropertyDraft): SetupStep9BulkItem {
  const single = propertyDraftToStep9Input(draft)
  return {
    customerName: single.customerName,
    fullAddress: single.fullAddress,
    postcode: single.postcode,
    serviceAreaId: single.serviceAreaId ?? '',
    roundId: single.roundId ?? '',
    price: single.price,
    ...(single.propertyName ? { propertyName: single.propertyName } : {}),
    ...(single.phone ? { phone: single.phone } : {}),
    ...(single.landline ? { landline: single.landline } : {}),
    ...(single.email ? { email: single.email } : {}),
    ...(single.propertyType ? { propertyType: single.propertyType } : {}),
    ...(single.cleaningFrequency ? { cleaningFrequency: single.cleaningFrequency } : {}),
    ...(single.paymentMethod ? { paymentMethod: single.paymentMethod } : {}),
    ...(single.serviceId ? { serviceId: single.serviceId } : {}),
    ...(single.serviceIds?.length ? { serviceIds: single.serviceIds } : {}),
    ...(single.accessNotes ? { accessNotes: single.accessNotes } : {}),
    ...(single.riskNotes ? { riskNotes: single.riskNotes } : {}),
  }
}

export type { WizardServiceArea, CatalogueService }

