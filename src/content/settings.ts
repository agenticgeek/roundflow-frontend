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
    stripeConnected: 'Stripe connected',
    disconnect: 'Disconnect',
    disconnecting: 'Disconnecting…',
    disconnected: '{provider} disconnected',
    goCardlessConnect: {
      tokenLabel: 'Access token',
      tokenPlaceholder: 'Paste your GoCardless access token',
      tokenRequired: 'Paste your GoCardless access token.',
      environmentLabel: 'Environment',
      environments: [
        { value: 'live', label: 'Live' },
        { value: 'sandbox', label: 'Sandbox' },
      ],
      connect: 'Connect',
      connecting: 'Connecting…',
      cancel: 'Cancel',
      connected: 'GoCardless connected',
      failed: 'Could not connect GoCardless.',
    },
    goCardlessWebhook: {
      title: 'Finish connecting GoCardless',
      intro:
        'GoCardless needs a webhook so payments and mandates update automatically. Until you add the secret below, RoundFlow won’t hear about GoCardless payments.',
      steps: [
        'In your GoCardless dashboard, go to Developers → Webhooks → Add endpoint.',
        'Paste the URL below and save it.',
        'GoCardless then shows a webhook secret — copy it and paste it here.',
      ],
      urlLabel: 'Webhook URL',
      urlMissing:
        'The webhook URL is only shown straight after connecting. If you don’t have it, disconnect and connect GoCardless again.',
      copy: 'Copy',
      copied: 'Copied',
      secretLabel: 'Webhook secret',
      secretPlaceholder: 'Paste the secret GoCardless showed you',
      secretRequired: 'Paste the webhook secret from GoCardless.',
      save: 'Save secret',
      saving: 'Saving…',
      saved: 'GoCardless webhook secret saved',
      later: 'Do this later',
      reopen: 'Add webhook secret',
      savedNote: 'Webhook secret saved',
    },
  },
  roundSettings: {
    heading: 'Round Settings',
    subheading: 'Configure your cleaning round preferences',
  },
  smsTemplates: {
    heading: 'SMS / WhatsApp Templates',
    subheading: 'Configure your customer messaging templates',
    empty: 'No message templates yet.',
    loadError: 'Could not load message templates.',
    channels: { SMS: 'SMS', WHATSAPP: 'WhatsApp', EMAIL: 'Email' } as Record<string, string>,
    edit: 'Edit',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    saved: 'Template saved',
    bodyRequired: 'The message can’t be empty.',
    sendingNote:
      'Messages are sent through your GHL account. Until it’s connected, they’re saved and shown to you instead of being sent.',
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
    addArea: 'Add Area',
    addForm: {
      title: 'Add New Area',
      fields: {
        areaName: { label: 'Area Name', placeholder: 'e.g. Alnwick' },
        postcodeSectors: {
          label: 'Postcode Sectors',
          placeholder: 'e.g. NE66, NE67',
          hint: 'Separate multiple sectors with commas.',
        },
      },
      actions: { confirm: 'Add Area', cancel: 'Cancel' },
      validation: {
        nameRequired: 'Area name is required.',
        postcodeRequired: 'At least one postcode sector is required.',
        postcodeInvalid: 'Enter valid UK postcode sectors, comma-separated (e.g. NE66, NE67).',
      },
    },
    actions: { delete: 'Delete area' },
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
  'businessName' | 'businessPhone' | 'businessEmail' | 'workingDays' | 'timezone' | 'currency'
>

export type SettingsPaymentSetup = PaymentSetupData

export type SettingsRoundSettings = RoundSettingsData

export type SettingsSmsTemplates = SmsTemplatesData

export type SettingsTechnicianManagement = TechnicianManagementData

export type SettingsServiceArea = ServiceAreaData

export type SettingsServiceCatalogue = ServiceCatalogueData
