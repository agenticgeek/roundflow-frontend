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
  | 'integrations'
  | 'email'
  | 'kpi-thresholds'
  | 'failed-messages'

export interface SettingsSectionDefinition {
  id: SettingsSectionId
  label: string
  icon: string
  /** Hidden from a MANAGER (the API answers 403 ADMIN_ONLY). */
  adminOnly?: true
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
    { id: 'email', label: 'Email and branding', icon: 'message' },
    { id: 'integrations', label: 'SMS and calling (optional)', icon: 'message' },
    { id: 'kpi-thresholds', label: 'KPI Thresholds', icon: 'alert' },
    { id: 'failed-messages', label: 'Failed integration messages', icon: 'alert', adminOnly: true },
  ] satisfies SettingsSectionDefinition[],
  businessProfile: {
    heading: 'Business Profile',
    subheading: 'Set up your business information',
    /** GAP-001: printed on invoices. */
    address: {
      line1: 'Address line 1',
      line2: 'Address line 2',
      town: 'Town',
      postcode: 'Postcode',
    },
    vatRate: 'VAT rate',
  },
  paymentSetup: {
    heading: 'Payment Setup',
    subheading: 'Connect your payment providers',
    stripeConnected: 'Stripe connected',
    stripeConnectFailed: 'Stripe wasn’t connected: {message}',
    /** GAP-008 payment defaults. */
    defaults: {
      method: 'Default payment method',
      methodHint: 'Direct Debit and card link need GoCardless / Stripe connected.',
      dueDays: 'Invoice due after (days)',
      dueDaysInvalid: 'Enter a number of days (0–90).',
      noDirectDebit: 'Customers without a Direct Debit',
    },
    /** GHL-10: printed on every invoice. */
    invoiceDetails: {
      footerLabel: 'Invoice footer',
      footerHelp: 'Optional. Shown at the bottom of every invoice, for example a thank-you or your complaints contact. Up to 500 characters.',
      footerTooLong: 'Keep the footer under 500 characters.',
      termsLabel: 'Payment terms',
      termsHelp: 'Optional. Replaces "Payment due within N days" on invoices, for example "Payment due on receipt". Up to 200 characters.',
      termsTooLong: 'Keep the payment terms under 200 characters.',
    },
    stripeCallbackFailed: 'Couldn\'t connect Stripe',
    stripeCallbackBack: 'Back to settings',
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
    /** GAP-003. */
    cleanMethod: 'Default clean method',
    reminder: 'Pre-clean reminder',
    reminderDescription: 'Visits don’t have time slots, so reminders go out at a fixed time.',
    reminderTime: 'Reminder time',
  },
  serviceDelete: {
    title: 'Delete this service?',
    body: '“{name}” will be removed from the service catalogue.',
    keep: 'Keep',
    confirm: 'Yes, delete',
    deleting: 'Deleting…',
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
      'Email templates are sent by RoundFlow. SMS and WhatsApp templates are sent through your GoHighLevel account (Settings › SMS and calling).',
    /** GAP-017: shown when GoHighLevel isn't connected. */
    notConnectedNote: 'GoHighLevel isn’t connected, so SMS and WhatsApp messages aren’t being sent. Email still works.',
    connectMessaging: 'Set up SMS',
    new: 'New template',
    create: 'Create template',
    creating: 'Creating…',
    created: 'Template created',
    nameLabel: 'Template name',
    channelLabel: 'Channel',
    bodyLabel: 'Message',
    subjectLabel: 'Subject',
    nameRequired: 'Give the template a name.',
    subjectRequired: 'Email templates need a subject.',
    delete: 'Delete',
    deleting: 'Deleting…',
    deleted: 'Template deleted',
    confirmDelete: 'Delete “{name}”? This cannot be undone.',
    confirmDeleteYes: 'Yes, delete',
  },
  integrations: {
    heading: 'SMS and calling (optional)',
    subheading:
      'Email is sent by RoundFlow itself, with nothing to set up here. Connect GoHighLevel only if you also want to send SMS and WhatsApp. Calling a customer uses the phone link on their page and needs no setup.',
  },
  /** Settings › Integrations › Messaging (GoHighLevel) — private-integration connect (GAP-017). */
  ghl: {
    title: 'SMS and WhatsApp (GoHighLevel)',
    description:
      'SMS and WhatsApp messages go out through your GoHighLevel sub-account. Email does not need it. Connect it with GoHighLevel sign-in, or with a Private Integration token.',
    connected: 'Connected',
    notConnected: 'Not connected',
    loading: 'Checking connection…',
    loadError: 'Couldn’t check the GoHighLevel connection.',
    retry: 'Retry',
    /** GAP-017 part 2: connected details. */
    location: 'Location',
    method: 'Connected with',
    methods: { oauth: 'GoHighLevel sign-in', private: 'Private Integration token' } as Record<string, string>,
    test: 'Test connection',
    testing: 'Testing…',
    testOk: 'GoHighLevel connection works',
    testOkLocation: 'GoHighLevel connection works — {location}',
    oauthConnect: 'Sign in with GoHighLevel',
    oauthRedirecting: 'Opening GoHighLevel…',
    oauthOr: 'Or connect with a Private Integration token',
    connectedReturn: 'GoHighLevel connected',
    connectFailedReturn: 'GoHighLevel wasn’t connected: {message}',
    connectFailedFallback: 'GoHighLevel wasn’t connected. Try again.',
    locationLabel: 'Location ID',
    locationPlaceholder: 'e.g. ve9EPM428h8vShlRW1KT',
    locationHint: 'GoHighLevel › Settings › Business Profile — the sub-account’s Location ID.',
    tokenLabel: 'Private Integration token',
    tokenPlaceholder: 'pit-…',
    tokenHint: 'GoHighLevel › Settings › Private Integrations › Create — give it contacts and conversations access.',
    tokenRequired: 'Paste the Private Integration token.',
    locationRequired: 'Enter the Location ID.',
    connect: 'Connect GoHighLevel',
    connecting: 'Verifying…',
    connectedToast: 'GoHighLevel connected',
    webhookTitle: 'Add the webhook in GoHighLevel',
    webhookIntro:
      'Paste this URL into a GoHighLevel workflow “Webhook” action so replies and delivery updates reach RoundFlow.',
    webhookLabel: 'Webhook URL',
    copy: 'Copy',
    copied: 'Copied',
    disconnect: 'Disconnect',
    disconnecting: 'Disconnecting…',
    disconnectConfirm: 'SMS and WhatsApp will stop sending until you reconnect. Email is not affected. Disconnect GoHighLevel?',
    disconnectYes: 'Yes, disconnect',
    cancel: 'Cancel',
    disconnectedToast: 'GoHighLevel disconnected',
    readOnly: 'Only admins and managers can change integrations.',
  },
  /** GAP-025: Settings › KPI thresholds — a breach raises a technician alert (once a month). */
  kpiThresholds: {
    heading: 'KPI Thresholds',
    subheading: 'Get an alert when a technician’s monthly KPI crosses a limit',
    loadError: 'Could not load KPI thresholds.',
    retry: 'Retry',
    empty: 'No thresholds yet — add one to start getting KPI alerts.',
    add: 'Add threshold',
    remove: 'Remove threshold',
    save: 'Save thresholds',
    saving: 'Saving…',
    saved: 'KPI thresholds saved',
    readOnly: 'Only admins and managers can change thresholds.',
    columns: { metric: 'Metric', operator: 'Alert when', value: 'Value' },
    valueInvalid: 'Each threshold needs a value of 0 or more.',
    metrics: [
      { value: 'strikes', label: 'Strikes' },
      { value: 'damages', label: 'Damages' },
      { value: 'upsells', label: 'Upsells' },
      { value: 'revenuePerHour', label: 'Revenue per hour (£)' },
      { value: 'timeOnJobMinutes', label: 'Time on job (minutes)' },
    ],
    operators: [
      { value: 'GT', label: 'is above' },
      { value: 'LT', label: 'is below' },
    ],
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
        areaName: { label: 'Area Name', placeholder: 'Area name' },
        postcodeSectors: {
          label: 'Postcode Sectors',
          placeholder: 'Postcode sectors, comma-separated',
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
