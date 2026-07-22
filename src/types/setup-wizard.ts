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
  label: string
}

export interface BusinessProfileData {
  businessName: string
  businessPhone: string
  businessEmail: string
  serviceArea: string
  companyNumber: string
  vatNumber: string
  vatRegistered: boolean | null
  workingDays: string[]
  timezone: string
  currency: string
}

export interface PaymentSetupData {
  goCardlessConnected: boolean
  stripeConnected: boolean
  defaultPaymentRule: string
  vatApplicable: boolean
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

export type RecurringCycle = '1-week' | '2-week' | '3-week' | '4-week'

export type CleanMethod = 'traditional' | 'water-fed-pole'

export interface RoundSettingsData {
  recurringCycle: RecurringCycle
  cleanMethods: CleanMethod[]
  autoGenerateVisits: boolean
  reminderTiming: string
  reminderTimeOfDay: string
}

export type MessageChannel = 'sms' | 'whatsapp'

export interface MessageTemplate {
  id: string
  name: string
  channel: MessageChannel
  body: string
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
  serviceId: string
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
