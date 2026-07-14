import type {
  BusinessProfileData,
  PaymentSetupData,
  RoundSettingsData,
  ServiceAreaData,
  ServiceCatalogueData,
  SmsTemplatesData,
  TechnicianManagementData,
} from '@/types/setup-wizard'

export type SettingsSectionId =
  | 'business-profile'
  | 'payment-setup'
  | 'round-settings'
  | 'sms-templates'
  | 'technician-management'
  | 'service-area'
  | 'service-catalogue'

export interface SettingsSectionDefinition {
  id: SettingsSectionId
  label: string
  icon: string
}

export const settingsContent = {
  title: 'Settings',
  subtitle: 'Manage business rules, payments, technicians, messages, and round preferences anytime.',
  sidebarTitle: 'Settings',
  sections: [
    { id: 'business-profile', label: 'Business Profile', icon: 'file' },
    { id: 'payment-setup', label: 'Payment Setup', icon: 'card' },
    { id: 'round-settings', label: 'Round Settings', icon: 'refresh' },
    { id: 'sms-templates', label: 'SMS Templates', icon: 'message' },
    { id: 'technician-management', label: 'Technician Mgmt', icon: 'technicians' },
    { id: 'service-area', label: 'Service Areas', icon: 'map-pin' },
    { id: 'service-catalogue', label: 'Service Catalogue', icon: 'briefcase' },
  ] satisfies SettingsSectionDefinition[],
  businessProfile: {
    heading: 'Business Profile',
    subheading: 'Set up your business information',
  },
  paymentSetup: {
    heading: 'Payment Setup',
    subheading: 'Connect your payment providers',
  },
  roundSettings: {
    heading: 'Round Settings',
    subheading: 'Configure your cleaning round preferences',
  },
  smsTemplates: {
    heading: 'SMS / WhatsApp Templates',
    subheading: 'Configure your customer messaging templates',
  },
  technicianManagement: {
    heading: 'Technician Management',
    subheading: 'Add your team members and assign areas',
    columns: {
      defaultArea: 'Default Area',
    },
  },
  serviceArea: {
    heading: 'Service Areas',
    subheading: 'Define your service areas and postcode',
    linkedRounds: 'Linked Rounds:',
  },
  serviceCatalogue: {
    heading: 'Service Catalogue',
    subheading: 'Add Services you will provide to the customer/property',
  },
  actions: {
    edit: 'Edit',
    save: 'Save Changes',
  },
  toasts: {
    saved: 'Settings saved',
    serviceAdded: 'Service added',
    serviceUpdated: 'Service updated',
    templateUpdated: 'Template updated',
    technicianAdded: 'Technician added',
    areaAdded: 'Service area added',
  },
} as const

export type SettingsBusinessProfile = Pick<
  BusinessProfileData,
  'businessName' | 'businessPhone' | 'businessEmail' | 'serviceArea' | 'workingDays' | 'timezone' | 'currency'
>

export type SettingsPaymentSetup = PaymentSetupData

export type SettingsRoundSettings = RoundSettingsData

export type SettingsSmsTemplates = SmsTemplatesData

export type SettingsTechnicianManagement = TechnicianManagementData

export type SettingsServiceArea = ServiceAreaData

export type SettingsServiceCatalogue = ServiceCatalogueData
