/** Identifiers for each setup wizard step — order is defined in config. */
export type SetupStepId =
  | 'business-profile'
  | 'payment-setup'
  | 'service-catalogue'
  | 'round-settings'
  | 'sms-templates'
  | 'technician-management'
  | 'service-area'
  | 'first-round'
  | 'add-property'
  | 'assign-technicians'
  | 'generate-visits'
  | 'review-launch'

export interface SetupStepDefinition {
  id: SetupStepId
  /** Backend step number (`/setup/step/{step}`) — independent of the display order. */
  step: number
  label: string
}

/** Business bank account printed in the invoice footer for bank-transfer payers. */
export interface BankDetailsForm {
  accountName: string
  bankName: string
  accountNumber: string
  sortCode: string
}

export interface BusinessProfileData {
  businessName: string
  businessPhone: string
  businessEmail: string
  companyNumber: string
  businessAddress: string
  postcode: string
  vatNumber: string
  vatRegistered: boolean | null
  vatRate: string
  workingDays: string[]
  timezone: string
  currency: string
  bankDetails: BankDetailsForm
}

export interface PaymentSetupData {
  goCardlessConnected: boolean
  stripeConnected: boolean
  defaultPaymentRule: string
  vatApplicable: boolean
  debtHoldEnabled: boolean
}

/** Wizard Payments step — Settings → Payment still uses PaymentSetupData. */
export type PaymentTimingOption = 'after-visit' | 'daily'
export type NoDirectDebitAction = 'invoice' | 'card-link'

export interface WizardPaymentData {
  goCardlessConnected: boolean
  stripeConnected: boolean
  /** PaymentMethod enum value (GOCARDLESS, STRIPE, BACS, CASH, CHEQUE). */
  defaultPaymentMethod: string
  paymentTiming: PaymentTimingOption
  invoiceDueDays: string
  noDirectDebitAction: NoDirectDebitAction
  debtHoldEnabled: boolean
}

export interface CatalogueService {
  id: string
  name: string
  description: string
  categoryId: string
  price: number
  active: boolean
  isDefault?: boolean
}

export interface ServiceCatalogueData {
  services: CatalogueService[]
}

export type RecurringCycle = '4-week' | '6-week' | '8-week' | '12-week'

export type CleanMethod = 'traditional' | 'water-fed-pole' | 'both'

/** When the pre-clean reminder goes out — visits have no time slots, so it's a fixed time. */
export type ReminderSchedule = 'evening-before' | 'morning-of' | 'none'

export interface RoundSettingsData {
  recurringCycle: RecurringCycle
  cleanMethod: CleanMethod
  reminderSchedule: ReminderSchedule
  /** `HH:mm` — used when reminderSchedule is `evening-before`. */
  eveningReminderTime: string
  /** `HH:mm` — used when reminderSchedule is `morning-of`. */
  morningReminderTime: string
  autoGenerateVisits: boolean
}

export type MessageChannel = 'sms' | 'whatsapp' | 'email'

export interface MessageTemplate {
  id: string
  name: string
  channel: MessageChannel
  body: string
  /** Email channel only. */
  subject?: string | null
}

export type MessageGroup = 'visits' | 'payments' | 'other'

/** One customer message in the wizard — saved as one template row per channel. */
export interface WizardMessage {
  /** Catalogue key, or `custom-…` for a saved template the catalogue doesn't know. */
  key: string
  name: string
  group: MessageGroup
  description: string
  channels: MessageChannel[]
  body: string
}

export interface WizardMessagesData {
  messages: WizardMessage[]
}

export interface SmsTemplatesData {
  templates: MessageTemplate[]
}

export type TechnicianAppStatus = 'active' | 'inactive' | 'pending'

export interface Technician {
  id: string
  fullName: string
  mobile: string
  email: string
  role: string
  defaultArea: string
  appStatus: TechnicianAppStatus
}

export interface TechnicianManagementData {
  technicians: Technician[]
}

export interface ServiceArea {
  id: string
  name: string
  postcodeSectors: string[]
  notes: string
  /** Rounds linked server-side — read-only, 0 for areas not saved yet. */
  roundCount: number
}

export interface ServiceAreaData {
  areas: ServiceArea[]
}

export interface LinkedRound {
  id: string
  day: string
}

export interface AssignedAreaRound {
  id: string
  areaName: string
  postcodeSector: string
  notes: string
  linkedRounds: LinkedRound[]
}

export interface AssignRoundData {
  assignments: AssignedAreaRound[]
}

export interface WizardRound {
  id: string
  /** Prefer API round name when present. */
  name?: string
  areaName: string
  day: string
  propertyCount: number
  technicianId: string
}

export interface AssignTechniciansData {
  rounds: WizardRound[]
}

export interface PropertyDraft {
  customerName: string
  propertyName: string
  phone: string
  landline: string
  email: string
  fullAddress: string
  postcode: string
  serviceArea: string
  propertyType: string
  cleaningFrequency: string
  pricePerVisit: string
  vat: string
  paymentMethod: string
  startDate: string
  preferredDay: string
  nextVisitDate: string
  customerNotes: string
  riskNotes: string
  accessNotes: string
  round: string
  assignServiceArea: string
  /** Primary service (kept for back-compat; = serviceIds[0]). */
  serviceId: string
  /** All services chosen for this property. Price is the sum of their catalogue prices (editable). */
  serviceIds: string[]
}

export interface PropertyRecord extends PropertyDraft {
  id: string
}

export interface AddPropertyData {
  properties: PropertyRecord[]
}

export type GenerateVisitsMode = 'all' | 'selected'

export interface ActivateSystemData {
  generateVisitsMode: GenerateVisitsMode
  startDate: string
  cycleWeeks: number
  roundIds: string[]
}

export type SetupWizardData = {
  'business-profile'?: BusinessProfileData
  'payment-setup'?: PaymentSetupData
  'service-catalogue'?: ServiceCatalogueData
  'round-settings'?: RoundSettingsData
  'sms-templates'?: SmsTemplatesData
  'technician-management'?: TechnicianManagementData
  'service-area'?: ServiceAreaData
  'assign-round'?: AssignRoundData
  'assign-technicians'?: AssignTechniciansData
  'add-properties'?: AddPropertyData
  'activate-system'?: ActivateSystemData
}
