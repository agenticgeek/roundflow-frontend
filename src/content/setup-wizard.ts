import type {
  BusinessProfileData,
  CatalogueService,
  CleanMethod,
  MessageTemplate,
  PaymentSetupData,
  RecurringCycle,
  RoundSettingsData,
  ServiceCatalogueData,
  SmsTemplatesData,
  Technician,
  TechnicianManagementData,
  ServiceArea,
  ServiceAreaData,
  AssignRoundData,
  AssignedAreaRound,
  AssignTechniciansData,
  WizardRound,
  AddPropertyData,
  ActivateSystemData,
  PropertyDraft,
  SetupStepDefinition,
} from '@/types/setup-wizard'

export interface SelectOption {
  value: string
  label: string
}

export interface SetupWizardContent {
  title: string
  subtitle: string
  steps: readonly SetupStepDefinition[]
  footer: {
    back: string
    skip: string
    skipStep: string
    continue: string
    launch: string
    stepLabel: string
  }
  bulkReplaceConfirm: {
    title: string
    servicesDescription: string
    serviceAreasDescription: string
    cancel: string
    confirm: string
  }
  stepper: {
    showNextSteps: string
    showPreviousSteps: string
  }
  placeholders: {
    comingSoonTitle: string
    comingSoonBody: string
  }
  validation: {
    required: string
    vatRequired: string
    emailInvalid: string
    phoneInvalid: string
    companyNumberInvalid: string
    vatNumberRequired: string
    vatNumberInvalid: string
  }
  businessProfile: {
    heading: string
    subheading: string
    fields: {
      businessName: { label: string; placeholder: string; required: true }
      businessPhone: { label: string; placeholder: string; required: true }
      businessEmail: { label: string; placeholder: string; required: true }
      companyNumber: { label: string; placeholder: string; required: false }
      vatNumber: { label: string; placeholder: string; required: false }
      vatRegistered: { label: string; yes: string; no: string }
      workingDays: { label: string }
      timezone: { label: string }
      currency: { label: string }
    }
    days: readonly { id: string; label: string }[]
    timezones: SelectOption[]
    currencies: SelectOption[]
    defaults: BusinessProfileData
  }
  paymentSetup: {
    heading: string
    subheading: string
    status: {
      notConnected: string
      connected: string
    }
    providers: readonly {
      id: 'gocardless' | 'stripe'
      name: string
      description: string
      connectLabel: string
    }[]
    settings: {
      heading: string
      defaultPaymentRule: { label: string }
      vatApplicable: { label: string; description: string }
      debtHoldEnabled: { label: string; description: string }
    }
    bankDetails: {
      heading: string
      description: string
      fields: {
        accountName: { label: string; placeholder: string }
        bankName: { label: string; optional: string; placeholder: string }
        accountNumber: { label: string; placeholder: string }
      }
      validation: {
        accountNameRequired: string
        accountNumberInvalid: string
      }
    }
    paymentRules: SelectOption[]
    defaults: PaymentSetupData
  }
  serviceCatalogue: {
    heading: string
    subheading: string
    addService: string
    searchPlaceholder: string
    columns: {
      service: string
      defaultPrice: string
      active: string
    }
    categories: readonly { id: string; label: string }[]
    statusFilters: readonly { id: string; label: string }[]
    tags: { default: string }
    actions: { edit: string; delete: string }
    infoBanner: string
    emptyResults: string
    addServiceModal: {
      title: string
      editTitle: string
      subtitle: string
      editSubtitle: string
      fields: {
        name: { label: string; placeholder: string }
        description: { label: string; optional: string; placeholder: string }
        price: { label: string; placeholder: string }
        category: { label: string }
        active: { label: string; description: string }
        default: { label: string; description: string }
      }
      actions: { cancel: string; confirm: string; save: string }
      validation: { nameRequired: string; priceInvalid: string }
    }
    defaults: ServiceCatalogueData
  }
  roundSettings: {
    heading: string
    subheading: string
    fields: {
      recurringCycle: { label: string }
      cleanMethods: { label: string }
      autoGenerateVisits: { label: string; description: string }
      reminderTiming: { label: string; description: string }
      reminderTimeOfDay: { label: string; description: string }
    }
    recurringCycles: readonly { id: RecurringCycle; label: string }[]
    cleanMethods: readonly { id: CleanMethod; label: string }[]
    reminderTimings: SelectOption[]
    reminderTimingPlaceholder: string
    reminderTimesOfDay: SelectOption[]
    reminderTimeOfDayPlaceholder: string
    defaults: RoundSettingsData
  }
  smsTemplates: {
    heading: string
    subheading: string
    labels: {
      templates: string
      preview: string
      edit: string
      smsMessage: string
      whatsappMessage: string
      emailMessage: string
    }
    channelLabels: {
      sms: string
      whatsapp: string
      email: string
    }
    editModal: {
      title: string
      fields: {
        body: { label: string; placeholder: string }
      }
      actions: { cancel: string; save: string }
      validation: { bodyRequired: string }
    }
    previewVariables: Record<string, string>
    defaults: SmsTemplatesData
  }
  technicianManagement: {
    heading: string
    subheading: string
    addTechnician: string
    addForm: {
      title: string
      fields: {
        fullName: { label: string; placeholder: string }
        mobile: { label: string; placeholder: string }
        email: { label: string; placeholder: string }
        role: { label: string; optional: string }
        defaultArea: { label: string; placeholder: string }
      }
      actions: { confirm: string; cancel: string }
      validation: {
        nameRequired: string
        mobileRequired: string
        mobileInvalid: string
        emailInvalid: string
      }
    }
    columns: {
      name: string
      phone: string
      role: string
      round: string
      appStatus: string
      actions: string
    }
    appStatusLabels: Record<Technician['appStatus'], string>
    roleOptions: SelectOption[]
    actions: { viewDetails: string; delete: string; moreOptions: string }
    defaults: TechnicianManagementData
  }
  serviceArea: {
    heading: string
    subheading: string
    addArea: string
    addForm: {
      title: string
      fields: {
        areaName: { label: string; placeholder: string }
        postcodeSectors: { label: string; placeholder: string }
        notes: { label: string; placeholder: string }
      }
      actions: { confirm: string; cancel: string }
      validation: { nameRequired: string; postcodeRequired: string; postcodeInvalid: string }
    }
    actions: { delete: string }
    defaults: ServiceAreaData
  }
  assignRound: {
    heading: string
    subheading: string
    fields: {
      areaName: { label: string; placeholder: string }
      postcodeSector: { label: string; placeholder: string }
      roundDay: { label: string; placeholder: string }
    }
    actions: { addRound: string; delete: string }
    labels: { linkedRounds: string }
    roundDays: SelectOption[]
    validation: {
      areaNameRequired: string
      postcodeRequired: string
      roundDayRequired: string
      duplicateRound: string
    }
    defaults: AssignRoundData
  }
  assignTechnicians: {
    heading: string
    subheading: string
    summary: {
      totalRounds: string
      technicians: string
      unassigned: string
    }
    sections: {
      roundAssignments: string
      technicianWorkload: string
    }
    columns: {
      round: string
      area: string
      properties: string
      assignedTechnician: string
      status: string
      actions: string
    }
    status: {
      assigned: string
      missing: string
    }
    actions: {
      edit: string
      unassigned: string
      roundsSuffix: string
    }
    modal: {
      title: string
      labels: {
        roundName: string
        area: string
        day: string
        properties: string
        assignTechnician: string
        propertiesSuffix: string
      }
      actions: { save: string }
    }
    defaults: AssignTechniciansData
  }
  addProperty: {
    addProperty: string
    subSteps: readonly { label: string; title: string; subtitle: string }[]
    sections: {
      customerProperty: string
      address: string
    }
    fields: {
      customerName: { label: string; placeholder: string }
      propertyName: { label: string; optional: string; placeholder: string }
      phone: { label: string; placeholder: string }
      landline: { label: string; optional: string; placeholder: string }
      email: { label: string; optional: string; placeholder: string }
      fullAddress: { label: string; placeholder: string }
      postcode: { label: string; placeholder: string }
      serviceArea: { label: string; placeholder: string }
      propertyType: { label: string; placeholder: string }
      cleaningFrequency: { label: string }
      pricePerVisit: { label: string; placeholder: string }
      vat: { label: string; placeholder: string }
      paymentMethod: { label: string; placeholder: string }
      startDate: { label: string; placeholder: string }
      preferredDay: { label: string; optional: string; placeholder: string }
      nextVisitDate: { label: string; optional: string; placeholder: string }
      customerNotes: { label: string; hint: string; placeholder: string }
      riskNotes: { label: string; hint: string; placeholder: string }
      accessNotes: { label: string; placeholder: string }
      round: { label: string; placeholder: string }
      assignServiceArea: { label: string; hint: string; placeholder: string }
    }
    propertyTypes: SelectOption[]
    cleaningFrequencies: SelectOption[]
    vatOptions: SelectOption[]
    paymentMethods: SelectOption[]
    preferredDays: SelectOption[]
    actions: { assignProperty: string; addProperty: string }
    validation: {
      customerNameRequired: string
      fullAddressRequired: string
      postcodeRequired: string
      postcodeInvalid: string
      phoneRequired: string
      phoneInvalid: string
      landlineInvalid: string
      emailInvalid: string
      priceRequired: string
      roundRequired: string
      nextVisitDateBeforeStart: string
    }
    defaults: AddPropertyData
    draftDefaults: PropertyDraft
  }
  activateSystem: {
    heading: string
    subheading: string
    sections: {
      generateVisits: string
      startDateCycle: string
      readyToActivate: string
    }
    options: {
      allRounds: { label: string; description: string; recommended: string }
      selectedRounds: { label: string; description: string }
    }
    fields: {
      firstCycleStartDate: { label: string; placeholder: string }
      frequencyCycle: { label: string }
    }
    readyDescription: string
    actions: { activate: string }
    cycleOptions: SelectOption[]
    validation: { roundsRequired: string }
    emptyRounds: string
    defaults: ActivateSystemData
  }
  reviewLaunch: {
    heading: string
    subheading: string
    progress: {
      title: string
      completed: string
    }
    ready: {
      title: string
      description: string
    }
    nextSteps: {
      title: string
      items: readonly string[]
    }
  }
}

const defaultMessageTemplates = [
  {
    id: 'pre-clean-reminder',
    name: 'Pre-Clean Reminder',
    channel: 'sms',
    body: 'Hi {{customer_name}}, your window clean is scheduled for {{clean_date}}. Please ensure access is available. Thanks, {{business_name}}',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    channel: 'sms',
    body: 'Hi {{customer_name}}, payment of £{{amount_owed}} is due for your recent window clean. Please pay at your earliest convenience. Thanks, {{business_name}}',
  },
  {
    id: 'payment-failed',
    name: 'Payment Failed',
    channel: 'sms',
    body: 'Hi {{customer_name}}, your payment of £{{amount_owed}} was unsuccessful. Please update your payment details. Thanks, {{business_name}}',
  },
  {
    id: 'access-issue',
    name: 'Access Issue Follow-up',
    channel: 'sms',
    body: "Hi {{customer_name}}, we couldn't access your property for today's clean. Please contact us to reschedule. Thanks, {{business_name}}",
  },
  {
    id: 'job-completed',
    name: 'Job Completed',
    channel: 'whatsapp',
    body: 'Hi {{customer_name}}, your windows have been cleaned today. Thank you for your business! {{business_name}}',
  },
  {
    id: 'weather-delay',
    name: 'Weather Delay',
    channel: 'sms',
    body: "Hi {{customer_name}}, due to weather conditions we've had to reschedule your clean to {{new_date}}. Sorry for any inconvenience. {{business_name}}",
  },
] satisfies MessageTemplate[]

const defaultTechnicians = [
  {
    id: 'tech-james-smith',
    fullName: 'James Smith',
    mobile: '07111 111111',
    email: 'james@example.com',
    role: 'lead-technician',
    defaultArea: 'Alnwick',
    appStatus: 'active',
  },
  {
    id: 'tech-sarah-johnson',
    fullName: 'Sarah Johnson',
    mobile: '07222 222222',
    email: 'sarah@example.com',
    role: 'technician',
    defaultArea: 'Bamburgh',
    appStatus: 'active',
  },
  {
    id: 'tech-michael-brown',
    fullName: 'Michael Brown',
    mobile: '07333 333333',
    email: 'michael@example.com',
    role: 'technician',
    defaultArea: 'Seahouses',
    appStatus: 'active',
  },
  {
    id: 'tech-emma-wilson',
    fullName: 'Emma Wilson',
    mobile: '07444 444444',
    email: 'emma@example.com',
    role: 'technician',
    defaultArea: 'Ashington',
    appStatus: 'active',
  },
] satisfies Technician[]

const defaultServiceAreas = [
  {
    id: 'area-alnwick',
    name: 'Alnwick',
    postcodeSectors: ['NE66'],
    notes: 'Main town center and surrounding areas',
  },
] satisfies ServiceArea[]

const defaultAssignRounds = [
  {
    id: 'assign-alnwick',
    areaName: 'Alnwick',
    postcodeSector: 'NE66',
    notes: 'Main town center and surrounding areas',
    linkedRounds: [
      { id: 'lr-alnwick-monday', day: 'monday' },
      { id: 'lr-alnwick-wednesday', day: 'wednesday' },
    ],
  },
  {
    id: 'assign-bamburgh',
    areaName: 'Bamburgh',
    postcodeSector: 'NE69',
    notes: 'Coastal village round',
    linkedRounds: [
      { id: 'lr-bamburgh-tuesday', day: 'tuesday' },
      { id: 'lr-bamburgh-friday', day: 'friday' },
    ],
  },
  {
    id: 'assign-seahouses',
    areaName: 'Seahouses',
    postcodeSector: 'NE68',
    notes: 'Harbour and high street',
    linkedRounds: [{ id: 'lr-seahouses-thursday', day: 'thursday' }],
  },
  {
    id: 'assign-ashington',
    areaName: 'Ashington',
    postcodeSector: 'NE63',
    notes: 'Town centre estates',
    linkedRounds: [
      { id: 'lr-ashington-monday', day: 'monday' },
      { id: 'lr-ashington-saturday', day: 'saturday' },
    ],
  },
] satisfies AssignedAreaRound[]

const defaultAssignTechnicianRounds = [
  {
    id: 'assign-alnwick:lr-alnwick-monday',
    areaName: 'Alnwick',
    day: 'monday',
    propertyCount: 20,
    technicianId: 'tech-james-smith',
  },
  {
    id: 'assign-alnwick:lr-alnwick-wednesday',
    areaName: 'Alnwick',
    day: 'wednesday',
    propertyCount: 18,
    technicianId: '',
  },
  {
    id: 'assign-bamburgh:lr-bamburgh-tuesday',
    areaName: 'Bamburgh',
    day: 'tuesday',
    propertyCount: 15,
    technicianId: 'tech-sarah-johnson',
  },
  {
    id: 'assign-bamburgh:lr-bamburgh-friday',
    areaName: 'Bamburgh',
    day: 'friday',
    propertyCount: 12,
    technicianId: '',
  },
  {
    id: 'assign-seahouses:lr-seahouses-thursday',
    areaName: 'Seahouses',
    day: 'thursday',
    propertyCount: 24,
    technicianId: 'tech-james-smith',
  },
  {
    id: 'assign-ashington:lr-ashington-monday',
    areaName: 'Ashington',
    day: 'monday',
    propertyCount: 22,
    technicianId: '',
  },
  {
    id: 'assign-ashington:lr-ashington-saturday',
    areaName: 'Ashington',
    day: 'saturday',
    propertyCount: 16,
    technicianId: 'tech-michael-brown',
  },
] satisfies WizardRound[]

export const setupWizardContent = {
  title: 'Setup Wizard',
  subtitle: 'Configure your window cleaning business system',
  steps: [
    { id: 'business-profile', label: 'Business Profile' },
    { id: 'payment-setup', label: 'Payment Setup' },
    { id: 'service-catalogue', label: 'Service Catalogue' },
    { id: 'round-settings', label: 'Round Settings' },
    { id: 'sms-templates', label: 'SMS/Whatsapp Templates' },
    { id: 'technician-management', label: 'Technician Management' },
    { id: 'service-area', label: 'Service Area' },
    { id: 'first-round', label: 'Assign Round' },
    { id: 'add-property', label: 'Add Property' },
    { id: 'assign-technicians', label: 'Assign Technicians' },
    { id: 'generate-visits', label: 'Generate Visits' },
    { id: 'review-launch', label: 'Review & Launch' },
  ],
  footer: {
    back: 'Back',
    skip: 'Skip setup',
    skipStep: 'Skip this step',
    continue: 'Continue',
    launch: 'Launch',
    stepLabel: 'Step {current} of {total}',
  },
  bulkReplaceConfirm: {
    title: 'Replace existing items?',
    servicesDescription:
      'Saving replaces all current services with the list shown. This cannot be undone from here.',
    serviceAreasDescription:
      'Saving replaces all current service areas with the list shown. This cannot be undone from here.',
    cancel: 'Cancel',
    confirm: 'Replace and continue',
  },
  stepper: {
    showNextSteps: 'Show next steps',
    showPreviousSteps: 'Show previous steps',
  },
  placeholders: {
    comingSoonTitle: 'Coming soon',
    comingSoonBody: 'This step will be available in the next update. You can continue for now.',
  },
  validation: {
    required: 'Please fill in all required fields.',
    vatRequired: 'Please select whether your business is VAT registered.',
    emailInvalid: 'Enter a valid email address.',
    phoneInvalid: 'Enter a valid phone number.',
    companyNumberInvalid: 'Company number must be 15 characters or fewer (letters and numbers only).',
    vatNumberRequired: 'Enter your VAT registration number.',
    vatNumberInvalid: 'VAT registration number must be 5–12 characters (letters and numbers only).',
  },
  businessProfile: {
    heading: 'Business Profile',
    subheading: 'Set up your business information.',
    fields: {
      businessName: {
        label: 'Business Name',
        placeholder: 'e.g., Crystal Clear Window Cleaning',
        required: true,
      },
      businessPhone: {
        label: 'Business Phone',
        placeholder: '07123 456789',
        required: true,
      },
      businessEmail: {
        label: 'Business Email',
        placeholder: 'info@example.com',
        required: true,
      },
      companyNumber: {
        label: 'Company Number',
        placeholder: 'e.g., 12345678',
        required: false,
      },
      vatNumber: {
        label: 'VAT Registration Number',
        placeholder: 'e.g., GB123456789',
        required: false,
      },
      vatRegistered: {
        label: 'VAT Registered',
        yes: 'Yes',
        no: 'No',
      },
      workingDays: {
        label: 'Default Working Days',
      },
      timezone: {
        label: 'Timezone',
      },
      currency: {
        label: 'Currency',
      },
    },
    days: [
      { id: 'mon', label: 'Mon' },
      { id: 'tue', label: 'Tue' },
      { id: 'wed', label: 'Wed' },
      { id: 'thu', label: 'Thu' },
      { id: 'fri', label: 'Fri' },
      { id: 'sat', label: 'Sat' },
      { id: 'sun', label: 'Sun' },
    ],
    timezones: [
      { value: 'Europe/London', label: 'Europe/London (GMT)' },
      { value: 'Europe/Dublin', label: 'Europe/Dublin (GMT)' },
      { value: 'America/New_York', label: 'America/New_York (EST)' },
    ],
    currencies: [
      { value: 'GBP', label: 'GB (£)' },
      { value: 'USD', label: 'US ($)' },
      { value: 'EUR', label: 'EU (€)' },
    ],
    defaults: {
      businessName: '',
      businessPhone: '',
      businessEmail: '',
      companyNumber: '',
      vatNumber: '',
      vatRegistered: null,
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      timezone: 'Europe/London',
      currency: 'USD',
    },
  },
  paymentSetup: {
    heading: 'Payment Setup',
    subheading: 'Connect your payment providers',
    status: {
      notConnected: 'Not Connected',
      connected: 'Connected',
    },
    providers: [
      {
        id: 'gocardless',
        name: 'GoCardless',
        description: 'Direct Debit collections',
        connectLabel: 'Connect GoCardless',
      },
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'Payment links and card payments',
        connectLabel: 'Connect Stripe',
      },
    ],
    settings: {
      heading: 'Default Payment Settings',
      defaultPaymentRule: { label: 'Default Payment Rule' },
      vatApplicable: {
        label: 'VAT Applicable',
        description: 'Include VAT in invoices by default',
      },
      debtHoldEnabled: {
        label: 'Debt Hold Enabled',
        description: 'Block service if payment is overdue',
      },
    },
    bankDetails: {
      heading: 'Bank Account Details',
      description:
        'Printed in the invoice footer so customers paying by bank transfer know where to send payment.',
      fields: {
        accountName: { label: 'Account Name', placeholder: 'e.g. Alnwick Window Cleaning Ltd' },
        bankName: { label: 'Bank Name', optional: '(optional)', placeholder: 'e.g. Barclays' },
        accountNumber: { label: 'Account Number', placeholder: '12345678' },
      },
      validation: {
        accountNameRequired: 'Account name is required when adding bank details.',
        accountNumberInvalid: 'Account number must be 8 digits.',
      },
    },
    paymentRules: [
      { value: 'collect-after-visit', label: 'Collect after Visit' },
      { value: 'collect-before-visit', label: 'Collect before Visit' },
      { value: 'monthly-invoice', label: 'Monthly Invoice' },
    ],
    defaults: {
      goCardlessConnected: false,
      stripeConnected: false,
      defaultPaymentRule: 'collect-after-visit',
      vatApplicable: true,
      debtHoldEnabled: true,
      bankDetails: { accountName: '', bankName: '', accountNumber: '' },
    },
  },
  serviceCatalogue: {
    heading: 'Service Catalogue',
    subheading: 'Add Services you will provide to the customer/property',
    addService: 'Add Service',
    searchPlaceholder: 'Search services...',
    columns: {
      service: 'SERVICE',
      defaultPrice: 'DEFAULT PRICE',
      active: 'ACTIVE',
    },
    categories: [
      { id: 'all', label: 'All' },
      { id: 'window-cleaning', label: 'Window Cleaning' },
      { id: 'exterior-cleaning', label: 'Exterior Cleaning' },
      { id: 'gutter-fascia', label: 'Gutter & Fascia' },
      { id: 'specialist', label: 'Specialist' },
    ],
    statusFilters: [
      { id: 'all', label: 'All' },
      { id: 'active', label: 'Active' },
      { id: 'inactive', label: 'Inactive' },
    ],
    tags: { default: 'Default' },
    actions: { edit: 'Edit', delete: 'Delete' },
    infoBanner:
      'Default services are pre-selected when creating a new job. Toggle Active to hide a service without deleting it.',
    emptyResults: 'No services match your filters.',
    addServiceModal: {
      title: 'Add New Service',
      editTitle: 'Edit Service',
      subtitle: 'Create a custom service that can be added to jobs.',
      editSubtitle: 'Update this service in your catalogue.',
      fields: {
        name: { label: 'Service Name', placeholder: 'e.g. Pressure Washing' },
        description: {
          label: 'Description',
          optional: '(optional)',
          placeholder: 'Brief description of the service...',
        },
        price: { label: 'Default Price (£)', placeholder: '0.00' },
        category: { label: 'Category' },
        active: { label: 'Active', description: 'Available to add to jobs' },
        default: { label: 'Default', description: 'Pre-selected on new jobs' },
      },
      actions: { cancel: 'Cancel', confirm: 'Add Service', save: 'Save Changes' },
      validation: {
        nameRequired: 'Service name is required.',
        priceInvalid: 'Enter a price between £0.01 and £100,000.00.',
      },
    },
    defaults: {
      services: [
        {
          id: 'windows-only',
          name: 'Windows Only',
          description: 'Standard window clean inside and out',
          categoryId: 'window-cleaning',
          price: 12,
          active: true,
          isDefault: true,
        },
        {
          id: 'full-house',
          name: 'Full House',
          description: 'Complete exterior window service for the whole property',
          categoryId: 'window-cleaning',
          price: 25,
          active: true,
        },
        {
          id: 'conservatory',
          name: 'Conservatory',
          description: 'Conservatory roof and frame cleaning',
          categoryId: 'specialist',
          price: 35,
          active: true,
        },
        {
          id: 'gutters-fascia',
          name: 'Gutters & Fascia',
          description: 'Gutter clearing and fascia wash',
          categoryId: 'gutter-fascia',
          price: 45,
          active: true,
        },
        {
          id: 'solar-panels',
          name: 'Solar Panels',
          description: 'Professional solar panel cleaning',
          categoryId: 'specialist',
          price: 60,
          active: false,
        },
        {
          id: 'pressure-wash',
          name: 'Pressure Wash',
          description: 'Driveway and patio pressure washing',
          categoryId: 'exterior-cleaning',
          price: 80,
          active: false,
        },
      ] satisfies CatalogueService[],
    },
  },
  roundSettings: {
    heading: 'Round Settings',
    subheading: 'Configure your cleaning round preferences',
    fields: {
      recurringCycle: { label: 'Default Recurring Cycle' },
      cleanMethods: { label: 'Default Clean Methods' },
      autoGenerateVisits: {
        label: 'Auto-Generate Visits',
        description: 'Automatically create visits based on schedule',
      },
      reminderTiming: {
        label: 'Pre-Clean Reminder Timing',
        description: 'Choose one or more times reminders are sent to customers before the scheduled clean.',
      },
      reminderTimeOfDay: {
        label: 'Pre-Clean Reminder Timing',
        description: 'Set the time of day reminders are sent to customers.',
      },
    },
    recurringCycles: [
      { id: '4-week', label: '4-week' },
      { id: '6-week', label: '6-week' },
      { id: '8-week', label: '8-week' },
      { id: '12-week', label: '12-week' },
    ],
    cleanMethods: [
      { id: 'traditional', label: 'Traditional' },
      { id: 'water-fed-pole', label: 'Water-fed Pole' },
    ],
    reminderTimings: [
      { value: 'EVENING_BEFORE', label: 'Evening before the clean' },
      { value: 'TWO_HOURS_BEFORE', label: '2 hours before the clean' },
    ],
    reminderTimingPlaceholder: 'Select reminder timings',
    reminderTimesOfDay: [
      { value: '18:00', label: '6:00 PM' },
      { value: '19:00', label: '7:00 PM' },
      { value: '20:00', label: '8:00 PM' },
      { value: '21:00', label: '9:00 PM' },
    ],
    reminderTimeOfDayPlaceholder: 'Select times of day',
    defaults: {
      recurringCycle: '4-week',
      cleanMethods: ['traditional', 'water-fed-pole'],
      autoGenerateVisits: true,
      reminderTiming: ['EVENING_BEFORE'],
      reminderTimeOfDay: ['19:00'],
    },
  },
  smsTemplates: {
    heading: 'SMS / WhatsApp Templates',
    subheading: 'Configure your customer messaging templates',
    labels: {
      templates: 'Templates',
      preview: 'Preview',
      edit: 'Edit',
      smsMessage: 'SMS Message',
      whatsappMessage: 'WhatsApp Message',
      emailMessage: 'Email Message',
    },
    channelLabels: {
      sms: 'SMS',
      whatsapp: 'WhatsApp',
      email: 'Email',
    },
    editModal: {
      title: 'Edit Template',
      fields: {
        body: {
          label: 'Message Body',
          placeholder: 'Hi {{customer_name}}, your message here...',
        },
      },
      actions: { cancel: 'Cancel', save: 'Save Changes' },
      validation: { bodyRequired: 'Message body is required.' },
    },
    previewVariables: {
      customer_name: 'John Smith',
      clean_date: 'Monday 5th June',
      new_date: 'Tuesday 6th June',
      amount_owed: '25.00',
      business_name: 'Crystal Clear',
    },
    defaults: {
      templates: defaultMessageTemplates.map((template) => ({ ...template })),
    },
  },
  technicianManagement: {
    heading: 'Technician Management',
    subheading: 'Add your team members and assign areas',
    addTechnician: 'Add Technician',
    addForm: {
      title: 'Add New Technician',
      fields: {
        fullName: { label: 'Full Name', placeholder: 'e.g. Mark Thompson' },
        mobile: { label: 'Mobile Number', placeholder: '07123 456789' },
        email: { label: 'Email', placeholder: 'mark@example.com' },
        role: { label: 'Role', optional: '(optional)' },
        defaultArea: { label: 'Default Area', placeholder: 'e.g. Alnwick' },
      },
      actions: { confirm: 'Add Technician', cancel: 'Cancel' },
      validation: {
        nameRequired: 'Full name is required.',
        mobileRequired: 'Mobile number is required.',
        mobileInvalid: 'Enter a valid mobile number.',
        emailInvalid: 'Enter a valid email address.',
      },
    },
    columns: {
      name: 'Name',
      phone: 'Phone',
      role: 'Role',
      round: 'Round',
      appStatus: 'App Status',
      actions: 'Actions',
    },
    appStatusLabels: {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
    },
    roleOptions: [
      { value: '', label: 'Select role' },
      { value: 'lead-technician', label: 'Lead Technician' },
      { value: 'technician', label: 'Technician' },
      { value: 'apprentice', label: 'Apprentice' },
    ],
    actions: {
      viewDetails: 'View technician details',
      delete: 'Delete',
      moreOptions: 'More options',
    },
    defaults: {
      technicians: defaultTechnicians.map((technician) => ({ ...technician })),
    },
  },
  serviceArea: {
    heading: 'Service Areas',
    subheading: 'Define your service areas and postcode',
    addArea: 'Add Area',
    addForm: {
      title: 'Add New Area',
      fields: {
        areaName: { label: 'Area Name', placeholder: 'Area Name: Alnwick' },
        postcodeSectors: {
          label: 'Postcode Sectors',
          placeholder: 'Postcode Sectors* (e.g; NE66,NE67)',
        },
        notes: { label: 'Notes', placeholder: 'Notes (Optional)' },
      },
      actions: { confirm: 'Add Area', cancel: 'Cancel' },
      validation: {
        nameRequired: 'Area name is required.',
        postcodeRequired: 'At least one postcode sector is required.',
        postcodeInvalid: 'Enter valid UK postcode sectors, comma-separated (e.g. NE66, NE67).',
      },
    },
    actions: { delete: 'Delete area' },
    defaults: {
      areas: defaultServiceAreas.map((area) => ({ ...area, postcodeSectors: [...area.postcodeSectors] })),
    },
  },
  assignRound: {
    heading: 'Assign Area to Round',
    subheading: 'Link areas to specific rounds for scheduling',
    fields: {
      areaName: { label: 'Service Area Name', placeholder: 'Example: Alnwick' },
      postcodeSector: {
        label: 'Post Code Sector (for precise allotment)',
        placeholder: 'XX-XXXX',
      },
      roundDay: { label: 'Round Day', placeholder: 'Select Day' },
    },
    actions: { addRound: 'Add Round', delete: 'Delete assignment' },
    labels: { linkedRounds: 'Linked Rounds:' },
    roundDays: [
      { value: '', label: 'Select Day' },
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' },
    ],
    validation: {
      areaNameRequired: 'Service area name is required.',
      postcodeRequired: 'Post code sector is required.',
      roundDayRequired: 'Please select a round day.',
      duplicateRound: 'This round day is already linked to this area.',
    },
    defaults: {
      assignments: defaultAssignRounds.map((assignment) => ({
        ...assignment,
        linkedRounds: assignment.linkedRounds.map((round) => ({ ...round })),
      })),
    },
  },
  assignTechnicians: {
    heading: 'Assign Technicians to Rounds',
    subheading: 'Match each round with a responsible technician',
    summary: {
      totalRounds: 'Total Rounds',
      technicians: 'Technicians',
      unassigned: 'Unassigned',
    },
    sections: {
      roundAssignments: 'Round Assignments',
      technicianWorkload: 'Technician Workload',
    },
    columns: {
      round: 'ROUND',
      area: 'AREA',
      properties: 'PROPERTIES',
      assignedTechnician: 'ASSIGNED TECHNICIAN',
      status: 'STATUS',
      actions: 'ACTIONS',
    },
    status: {
      assigned: 'Assigned',
      missing: 'Missing',
    },
    actions: {
      edit: 'Edit',
      unassigned: '— Unassigned —',
      roundsSuffix: 'rounds',
    },
    modal: {
      title: 'Round Details',
      labels: {
        roundName: 'ROUND NAME',
        area: 'AREA',
        day: 'DAY',
        properties: 'PROPERTIES',
        assignTechnician: 'ASSIGN TECHNICIAN',
        propertiesSuffix: 'properties',
      },
      actions: { save: 'Save Changes' },
    },
    defaults: {
      rounds: defaultAssignTechnicianRounds.map((round) => ({ ...round })),
    },
  },
  addProperty: {
    addProperty: 'Add Property',
    subSteps: [
      {
        label: '01',
        title: 'Property Details',
        subtitle: 'Add properties to link with the rounds',
      },
      {
        label: '02',
        title: 'Service Plan',
        subtitle: 'Customer/Property chosen plan for service',
      },
      {
        label: '03',
        title: 'Scheduling Settings',
        subtitle: 'Allot the timing for the customer/property',
      },
      {
        label: '04',
        title: 'Risk & Notes',
        subtitle: 'All safety/risks/technician notes',
      },
      {
        label: '05',
        title: 'Assign Property to Round',
        subtitle: 'Assign the property in whichever round you want',
      },
    ],
    sections: {
      customerProperty: 'Customer/Property',
      address: 'Address',
    },
    fields: {
      customerName: { label: 'Customer Name', placeholder: 'Jack Big' },
      propertyName: {
        label: 'Property Name',
        optional: '(optional / auto customer name)',
        placeholder: 'Property Name',
      },
      phone: { label: 'Phone Number', placeholder: '07123 456789' },
      landline: { label: 'Landline Number', optional: '(optional)', placeholder: '01665 600000' },
      email: { label: 'Email', optional: '(optional)', placeholder: 'customer@example.com' },
      fullAddress: { label: 'Full Address', placeholder: 'Street#X, 25th Avenue Park' },
      postcode: { label: 'Postcode', placeholder: 'NE66 1AA' },
      serviceArea: { label: 'Service Area', placeholder: 'Select service area' },
      propertyType: { label: 'Property Type', placeholder: 'House' },
      cleaningFrequency: { label: 'Cleaning Frequency' },
      pricePerVisit: { label: 'Price per visit', placeholder: '£ XX' },
      vat: { label: 'VAT (Yes/No)', placeholder: 'Select' },
      paymentMethod: { label: 'Payment Method', placeholder: 'Select' },
      startDate: { label: 'Start Date', placeholder: '01/02/2025' },
      preferredDay: { label: 'Preferred Day', optional: '(optional)', placeholder: 'Select' },
      nextVisitDate: { label: 'Next Visit Date', optional: '(optional)', placeholder: '01/03/2025' },
      customerNotes: {
        label: 'Customer Notes',
        hint: '(internal)',
        placeholder: "Type customer's requirements for technician",
      },
      riskNotes: {
        label: 'Risk Notes',
        hint: '(warning)',
        placeholder: 'Dog behind fence',
      },
      accessNotes: { label: 'Access Notes', placeholder: 'Key under mat, side gate access' },
      round: { label: 'Round', placeholder: 'Select round' },
      assignServiceArea: {
        label: 'Select Service Area',
        hint: '(for precise allotment)',
        placeholder: 'Select service area',
      },
    },
    propertyTypes: [
      { value: 'HOUSE', label: 'House' },
      { value: 'FLAT_APARTMENT', label: 'Flat / Apartment' },
      { value: 'COMMERCIAL', label: 'Commercial' },
      { value: 'OFFICE', label: 'Office' },
      { value: 'CONSERVATORY', label: 'Conservatory' },
    ],
    cleaningFrequencies: [
      { value: 'FOUR_WEEKLY', label: 'Every 4 weeks' },
      { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
      { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
      { value: 'TWELVE_WEEKLY', label: 'Every 12 weeks' },
    ],
    vatOptions: [
      { value: '', label: 'Select' },
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    paymentMethods: [
      { value: '', label: 'Select' },
      { value: 'GOCARDLESS', label: 'GoCardless' },
      { value: 'STRIPE', label: 'Stripe' },
      { value: 'CASH', label: 'Cash' },
      { value: 'CHEQUE', label: 'Cheque' },
      { value: 'BACS', label: 'Bank Transfer' },
    ],
    preferredDays: [
      { value: '', label: 'Select' },
      { value: 'MON', label: 'Monday' },
      { value: 'TUE', label: 'Tuesday' },
      { value: 'WED', label: 'Wednesday' },
      { value: 'THU', label: 'Thursday' },
      { value: 'FRI', label: 'Friday' },
    ],
    actions: { assignProperty: 'Assign Property', addProperty: 'Add Property' },
    validation: {
      customerNameRequired: 'Customer name is required.',
      fullAddressRequired: 'Full address is required.',
      postcodeRequired: 'Postcode is required.',
      postcodeInvalid: 'Enter a valid UK postcode (e.g. NE66 1AA).',
      phoneRequired: 'Phone number is required.',
      phoneInvalid: 'Enter a valid phone number.',
      landlineInvalid: 'Enter a valid landline number.',
      emailInvalid: 'Enter a valid email address.',
      priceRequired: 'Price per visit is required.',
      roundRequired: 'Please select a round.',
      nextVisitDateBeforeStart: 'Next visit date cannot be before the start date.',
    },
    defaults: { properties: [] },
    draftDefaults: {
      customerName: '',
      propertyName: '',
      phone: '',
      landline: '',
      email: '',
      fullAddress: '',
      postcode: '',
      serviceArea: '',
      propertyType: 'HOUSE',
      cleaningFrequency: 'FOUR_WEEKLY',
      pricePerVisit: '',
      vat: '',
      paymentMethod: '',
      startDate: '',
      preferredDay: '',
      nextVisitDate: '',
      customerNotes: '',
      riskNotes: '',
      accessNotes: '',
      round: '',
      assignServiceArea: '',
      serviceId: '',
    },
  },
  activateSystem: {
    heading: 'Activate System & Generate Visits',
    subheading: 'Create first cycle of visits from your configured rounds',
    sections: {
      generateVisits: '1. Generate Visits',
      startDateCycle: '2. Start Date & Cycle',
      readyToActivate: 'Ready to Activate?',
    },
    options: {
      allRounds: {
        label: 'All Rounds',
        description: 'Generate visits for all configured rounds',
        recommended: '(recommended)',
      },
      selectedRounds: {
        label: 'Selected Rounds Only',
        description: 'Generate visits for specific rounds only',
      },
    },
    fields: {
      firstCycleStartDate: {
        label: 'First Cycle Start Date',
        placeholder: 'YYYY-MM-DD',
      },
      frequencyCycle: {
        label: 'Cycle length (weeks)',
      },
    },
    readyDescription: 'This will generate the first set of visits and make them available for your team.',
    actions: { activate: 'Generate Visits' },
    cycleOptions: [
      { value: '4', label: '4 weeks' },
      { value: '6', label: '6 weeks' },
      { value: '8', label: '8 weeks' },
      { value: '12', label: '12 weeks' },
    ],
    validation: {
      roundsRequired: 'Select at least one round, or switch to All Rounds.',
    },
    emptyRounds: 'No rounds configured yet — choose All Rounds, or add a round in the First Round step.',
    defaults: {
      generateVisitsMode: 'all',
      startDate: '',
      cycleWeeks: 8,
      roundIds: [],
    },
  },
  reviewLaunch: {
    heading: 'Review & Launch',
    subheading: 'Review your setup and launch your window cleaning system',
    progress: {
      title: 'Setup Progress',
      completed: '{completed} of {total} completed',
    },
    ready: {
      title: 'Ready to Launch',
      description:
        'All required steps are complete. You can now launch your system and start managing your window cleaning business.',
    },
    nextSteps: {
      title: 'What happens next?',
      items: [
        "You'll be taken to your main dashboard",
        'Access Settings anytime to update your configuration',
        'Your technicians will receive app invitations if configured',
      ],
    },
  },
} satisfies SetupWizardContent
