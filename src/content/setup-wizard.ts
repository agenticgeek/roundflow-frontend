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
  ServiceAreaData,
  AssignRoundData,
  AssignedAreaRound,
  AssignTechniciansData,
  WizardRound,
  AddPropertyData,
  ActivateSystemData,
  PropertyDraft,
  ReminderSchedule,
  SetupStepDefinition,
  WizardPaymentData,
  WizardMessage,
  MessageChannel,
  MessageGroup,
} from '@/types/setup-wizard'

export interface SelectOption {
  value: string
  label: string
}

/** Business Profile form (step 1) — the address is stored as line 1 / line 2 / town / postcode (GAP-001). */
export type BusinessProfileForm = BusinessProfileData & { addressLine2: string; town: string }

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
  unsavedChanges: {
    message: string
    discard: string
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
    fieldRequired: string
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
    sections: {
      details: { heading: string }
      vat: { heading: string; description: string }
      workingPattern: { heading: string }
    }
    fields: {
      businessName: { label: string; placeholder: string; required: true }
      businessPhone: { label: string; placeholder: string; required: true }
      businessEmail: { label: string; placeholder: string; required: true }
      companyNumber: { label: string; placeholder: string; required: false }
      businessAddress: { label: string; placeholder: string }
      addressLine2: { label: string; placeholder: string }
      town: { label: string; placeholder: string }
      postcode: { label: string; placeholder: string; invalid: string }
      vatNumber: { label: string; placeholder: string; required: false }
      vatRegistered: { label: string; description: string }
      vatRate: { label: string }
      workingDays: { label: string; hint: string }
      timezone: { label: string }
      currency: { label: string }
    }
    days: readonly { id: string; label: string }[]
    timezoneSearch: string
    currencies: SelectOption[]
    vatRates: SelectOption[]
    /** Shown read-only — RoundFlow only supports UK businesses. */
    locale: {
      currency: string
      currencyLabel: string
      timezone: string
      note: string
    }
    bankDetails: {
      heading: string
      description: string
      fields: {
        accountName: { label: string; placeholder: string }
        bankName: { label: string; optional: string; placeholder: string }
        accountNumber: { label: string; placeholder: string }
        sortCode: { label: string; placeholder: string }
      }
      validation: {
        accountNameRequired: string
        accountNumberInvalid: string
        sortCodeInvalid: string
      }
    }
    defaults: BusinessProfileForm
  }
  paymentSetup: {
    heading: string
    subheading: string
    status: {
      notConnected: string
      connected: string
    }
    disconnect: string
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
    sections: {
      frequency: { heading: string; description: string }
      cleanMethod: { heading: string }
      reminder: { heading: string; description: string }
      keepGoing: { heading: string }
    }
    fields: {
      /** `recurringCycle` + `reminderTiming` are also used by Settings → Round Settings. */
      recurringCycle: { label: string }
      reminderTiming: { label: string; description: string }
      autoGenerateVisits: { label: string; description: string }
      reminderTime: { label: string }
    }
    /** Short labels — Settings → Round Settings. */
    recurringCycles: readonly { id: RecurringCycle; label: string }[]
    /** Wizard labels, e.g. "Every 4 weeks". */
    frequencyOptions: readonly { id: RecurringCycle; label: string }[]
    cleanMethods: readonly { id: CleanMethod; label: string }[]
    reminderOptions: readonly { id: ReminderSchedule; label: string; description?: string }[]
    eveningReminderTimes: SelectOption[]
    morningReminderTimes: SelectOption[]
    reminderTimings: SelectOption[]
    reminderTimingPlaceholder: string
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
    empty: string
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
    info: string
    empty: string
    addForm: {
      title: string
      editTitle: string
      fields: {
        areaName: { label: string; placeholder: string }
        postcodeSectors: { label: string; placeholder: string; hint: string; remove: string }
        notes: { label: string; placeholder: string }
      }
      actions: { confirm: string; save: string; cancel: string }
      validation: {
        nameRequired: string
        postcodeRequired: string
        postcodeInvalid: string
        sectorTaken: string
      }
    }
    list: {
      heading: string
      /** `{count}` rounds, `{step}` = where Rounds sits in the stepper. */
      noRounds: string
      roundsOne: string
      roundsMany: string
    }
    actions: { edit: string; delete: string }
    defaults: ServiceAreaData
  }
  activate: {
    heading: string
    subheading: string
    sections: { rounds: string; startDate: string; preview: string }
    scope: {
      all: { label: string; description: string }
      selected: { label: string; description: string }
      pickRounds: string
    }
    startDate: { label: string; today: string; hint: string }
    preview: {
      columns: { round: string; day: string; frequency: string; properties: string; firstVisit: string; visits: string }
      footerRounds: string
      footerVisits: string
      none: string
      noAreaRounds: string
      unassignedProperties: string
      warningSuffix: string
      fixNow: string
      technicianInfo: string
    }
    alreadyGenerated: string
    ready: { heading: string; description: string; button: string; buttonGoLive: string; working: string }
    validation: { roundsRequired: string; noVisits: string }
  }
  live: {
    heading: string
    subheading: string
    title: string
    titleFallback: string
    summary: string
    stats: { areas: string; rounds: string; properties: string; technicians: string; visits: string }
    next: {
      assign: { title: string; description: string; action: string }
      fixRounds: { titleAreas: string; titleProperties: string; titleBoth: string; description: string; action: string }
      stripe: { title: string; description: string; action: string }
    }
    goToDashboard: string
  }
  properties: {
    heading: string
    subheading: string
    summary: string
    notInRound: string
    importCsv: string
    formTitle: string
    sections: { address: string; round: string; customer: string; service: string; notes: string }
    fields: {
      postcode: { label: string; placeholder: string; area: string; noArea: string }
      propertyType: { label: string }
      address: { label: string; placeholder: string }
      customerName: { label: string; placeholder: string }
      mobile: { label: string; placeholder: string }
      email: { label: string; placeholder: string; hint: string }
      propertyName: { label: string; placeholder: string }
      services: { label: string; placeholder: string }
      price: { label: string; placeholder: string; hint: string }
      paymentMethod: { label: string; hint: string }
      lastCleaned: { label: string; hint: string }
      sendDdLink: { label: string }
      accessNotes: { label: string; placeholder: string }
      riskNotes: { label: string; placeholder: string }
      internalNotes: { label: string; placeholder: string }
    }
    round: {
      summary: string
      afterActivation: string
      suggested: string
      unassigned: { label: string; description: string }
      areaHint: string
      noAreaHint: string
      noRounds: string
    }
    actions: { saveAndAdd: string; save: string; saving: string }
    list: {
      heading: string
      columns: { property: string; postcode: string; round: string }
      notInRound: string
    }
    frequencyPhrases: Record<string, string>
  }
  messages: {
    heading: string
    subheading: string
    groups: Record<MessageGroup, string>
    channelLabels: Record<MessageChannel, string>
    channelOrder: readonly MessageChannel[]
    editor: {
      characters: string
      smsParts: string
      insertVariable: string
      preview: string
      reset: string
      save: string
      saving: string
      saved: string
      bodyRequired: string
      channelRequired: string
    }
    footerInfo: string
    variables: readonly string[]
    previewValues: Record<string, string>
    /** Saved names that map onto a catalogue message (older template names). */
    aliases: Record<string, readonly string[]>
    catalogue: readonly WizardMessage[]
  }
  payments: {
    heading: string
    subheading: string
    info: string
    status: { connected: string; notConnected: string }
    details: { mode: string; sandbox: string; live: string }
    stripeRedirecting: string
    connectAfterSetup: string
    providers: {
      gocardless: { name: string; description: string; connect: string; disconnect: string }
      stripe: { name: string; description: string; connect: string; disconnect: string; explainer: string }
    }
    defaults: {
      heading: string
      description: string
      fields: {
        method: { label: string; stripeDisabledHint: string }
        timing: { label: string; hint: string }
        dueDays: { label: string; suffix: string; invalid: string }
        noDirectDebit: { label: string; hint: string }
        debtHold: { label: string; description: string }
      }
      vat: { label: string; registered: string; notRegistered: string; source: string; change: string }
    }
    methods: readonly { value: string; label: string; requires?: 'gocardless' | 'stripe' }[]
    timings: SelectOption[]
    noDirectDebitActions: readonly { value: string; label: string; requiresStripe?: boolean }[]
    formDefaults: WizardPaymentData
  }
  technicians: {
    heading: string
    subheading: string
    info: string
    form: {
      title: string
      editTitle: string
      fields: {
        fullName: { label: string; placeholder: string }
        mobile: { label: string; placeholder: string }
        email: { label: string; placeholder: string; hint: string }
        role: { label: string; hint: string }
        areas: { label: string; hint: string; empty: string }
        sendInvite: { label: string }
      }
      actions: { add: string; save: string; cancel: string }
      validation: {
        nameRequired: string
        mobileRequired: string
        mobileInvalid: string
        emailRequired: string
        emailInvalid: string
        areasRequired: string
      }
    }
    team: {
      heading: string
      empty: string
      columns: { name: string; mobile: string; areas: string; role: string; appAccess: string }
    }
    appAccess: { active: string; invited: string; notInvited: string; inactive: string }
    actions: { edit: string; resend: string; sendInvite: string; sending: string }
    toasts: { inviteSent: string; addEmailFirst: string }
    roles: SelectOption[]
  }
  rounds: {
    heading: string
    subheading: string
    /** `{step}` = where Properties sits in the stepper. */
    info: string
    form: {
      title: string
      editTitle: string
      fields: {
        area: { label: string; placeholder: string }
        name: { label: string; placeholder: string; placeholderFor: string }
        day: { label: string; hint: string }
        frequency: { label: string; hint: string }
        sectors: { label: string; hint: string; noArea: string; empty: string }
      }
      actions: { add: string; save: string; cancel: string }
      validation: {
        areaRequired: string
        nameRequired: string
        dayRequired: string
        duplicateName: string
        roundsRequired: string
      }
    }
    areaCard: {
      addRound: string
      noSectors: string
      empty: string
      columns: { round: string; day: string; frequency: string; sectors: string }
      edit: string
    }
    noAreas: string
    days: SelectOption[]
    frequencies: SelectOption[]
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
    addedTitle: string
    importCsv: {
      openButton: string
      title: string
      description: string
      pasteLabel: string
      pastePlaceholder: string
      uploadButton: string
      orDivider: string
      fileSelected: string
      fileError: string
      roundLabel: string
      roundPlaceholder: string
      serviceAreaLabel: string
      serviceAreaPlaceholder: string
      servicesFilterLabel: string
      servicesFilterPlaceholder: string
      noServicesHint: string
      priceLabel: string
      pricePlaceholder: string
      customizeHint: string
      parse: string
      clear: string
      cancel: string
      readyTitle: string
      skippedTitle: string
      importButton: string
      importing: string
      progress: { title: string; detail: string; starting: string; hint: string }
      done: string
      partial: string
      failedTitle: string
      unrecognized: string
      roundRequired: string
      serviceAreaRequired: string
      priceRequired: string
      allPricesRequired: string
      bulkPartialFailure: string
      rowError: string
      emptyPaste: string
      noValidRows: string
      columns: {
        name: string
        address: string
        postcode: string
        phone: string
        email: string
        service: string
        price: string
      }
    }
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
      pricePerVisit: { label: string; placeholder: string; hint: string }
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
    { id: 'business-profile', step: 1, label: 'Business' },
    { id: 'service-area', step: 7, label: 'Areas' },
    { id: 'round-settings', step: 4, label: 'Round Settings' },
    { id: 'first-round', step: 8, label: 'Rounds' },
    { id: 'service-catalogue', step: 3, label: 'Services' },
    { id: 'technician-management', step: 6, label: 'Technicians' },
    { id: 'payment-setup', step: 2, label: 'Payments' },
    { id: 'sms-templates', step: 5, label: 'Messages' },
    { id: 'add-property', step: 9, label: 'Properties' },
    // Steps 10 (assign technicians) and 12 (review) left the wizard: activation finishes
    // setup, and technicians are assigned afterwards from the Round Planner.
    { id: 'generate-visits', step: 11, label: 'Activate' },
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
    title: 'Delete removed items?',
    servicesDescription:
      'You removed these saved services. Saving will permanently delete them from your account:',
    serviceAreasDescription:
      'You removed these saved service areas. Saving will permanently delete them from your account:',
    cancel: 'Keep them',
    confirm: 'Delete and save',
  },
  unsavedChanges: {
    message:
      "This step has unsaved changes that couldn't be saved. Fix the highlighted fields, or discard your changes.",
    discard: 'Discard changes and leave',
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
    fieldRequired: 'This field is required.',
    vatRequired: 'Please select whether your business is VAT registered.',
    emailInvalid: 'Enter a valid email address.',
    phoneInvalid: 'Enter a valid phone number (7–15 digits).',
    companyNumberInvalid: 'Company number must be 15 characters or fewer (letters and numbers only).',
    vatNumberRequired: 'Enter your VAT registration number.',
    vatNumberInvalid: 'VAT registration number must be 5–12 characters (letters and numbers only).',
  },
  businessProfile: {
    heading: 'Business Profile',
    subheading: 'Your details appear on invoices, messages and customer payment pages',
    sections: {
      details: { heading: 'Business details' },
      vat: {
        heading: 'VAT',
        description: 'This is the only place VAT is set — invoices use it automatically',
      },
      workingPattern: { heading: 'Working pattern' },
    },
    fields: {
      businessName: {
        label: 'Business name',
        placeholder: 'e.g. Crystal Clear Window Cleaning',
        required: true,
      },
      businessPhone: {
        label: 'Business phone',
        placeholder: '07123 456789',
        required: true,
      },
      businessEmail: {
        label: 'Business email',
        placeholder: 'info@example.co.uk',
        required: true,
      },
      companyNumber: {
        label: 'Company number (optional)',
        placeholder: 'e.g. 12345678',
        required: false,
      },
      businessAddress: {
        label: 'Address line 1',
        placeholder: 'e.g. 12 Bondgate Within',
      },
      addressLine2: {
        label: 'Address line 2 (optional)',
        placeholder: 'e.g. Unit 3',
      },
      town: {
        label: 'Town',
        placeholder: 'e.g. Alnwick',
      },
      postcode: {
        label: 'Postcode',
        placeholder: 'e.g. NE66 1TD',
        invalid: 'Enter a valid UK postcode, e.g. NE66 1TD.',
      },
      vatNumber: {
        label: 'VAT number',
        placeholder: 'e.g. GB 123 4567 89',
        required: false,
      },
      vatRegistered: {
        label: 'VAT registered',
        description: 'Add VAT to invoices',
      },
      vatRate: {
        label: 'VAT rate',
      },
      workingDays: {
        label: 'Default working days',
        hint: 'Rounds can only be scheduled on these days.',
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
    timezoneSearch: 'Search city or region…',
    currencies: [
      { value: 'GBP', label: 'GB (£)' },
      { value: 'USD', label: 'US ($)' },
      { value: 'EUR', label: 'EU (€)' },
    ],
    vatRates: [
      { value: '20', label: '20%' },
      { value: '5', label: '5%' },
      { value: '0', label: '0%' },
    ],
    locale: {
      currency: 'GBP',
      currencyLabel: 'GBP (£)',
      timezone: 'Europe/London',
      note: 'RoundFlow is built for UK businesses',
    },
    bankDetails: {
      heading: 'Bank Account Details',
      description:
        'Printed in the invoice footer so customers paying by bank transfer know where to send payment. UK accounts only: 8-digit account number and 6-digit sort code.',
      fields: {
        accountName: { label: 'Account Name', placeholder: 'e.g. Alnwick Window Cleaning Ltd' },
        bankName: { label: 'Bank Name', optional: '(optional)', placeholder: 'e.g. Barclays' },
        accountNumber: { label: 'Account Number', placeholder: '12345678' },
        sortCode: { label: 'Sort Code', placeholder: '30-80-12' },
      },
      validation: {
        accountNameRequired: 'Account name is required when adding bank details.',
        accountNumberInvalid: 'Account number must be 8 digits.',
        sortCodeInvalid: 'Sort code must be 6 digits, e.g. 30-80-12.',
      },
    },
    defaults: {
      businessName: '',
      businessPhone: '',
      businessEmail: '',
      companyNumber: '',
      businessAddress: '',
      addressLine2: '',
      town: '',
      postcode: '',
      vatNumber: '',
      vatRegistered: null,
      vatRate: '20',
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      timezone: 'Europe/London',
      currency: 'GBP',
      bankDetails: { accountName: '', bankName: '', accountNumber: '', sortCode: '' },
    },
  },
  paymentSetup: {
    heading: 'Payment Setup',
    subheading: 'Connect your payment providers',
    status: {
      notConnected: 'Not Connected',
      connected: 'Connected',
    },
    disconnect: 'Disconnect',
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
    paymentRules: [
      { value: 'collect-after-visit', label: 'Collect after Visit' },
      { value: 'collect-before-visit', label: 'Collect before Visit' },
      { value: 'monthly-invoice', label: 'Monthly Invoice' },
      { value: 'daily-batch', label: 'Once a day (all completed visits)' },
    ],
    defaults: {
      goCardlessConnected: false,
      stripeConnected: false,
      defaultPaymentRule: 'collect-after-visit',
      vatApplicable: true,
      debtHoldEnabled: true,
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
    // New tenants get real default services seeded by the backend (audit follow-up
    // 2026-10-22), so there are no client-side samples here.
    defaults: {
      services: [] satisfies CatalogueService[],
    },
  },
  roundSettings: {
    heading: 'Round Settings',
    subheading: 'Defaults for new rounds — every round can still be changed individually',
    sections: {
      frequency: {
        heading: 'Default frequency for new rounds',
        description: 'How often each property in a round is cleaned',
      },
      cleanMethod: { heading: 'Default clean method' },
      reminder: {
        heading: 'Pre-clean reminder',
        description: 'Visits don’t have time slots, so reminders go out at a fixed time',
      },
      keepGoing: { heading: 'Keep rounds going' },
    },
    fields: {
      recurringCycle: { label: 'Default Recurring Cycle' },
      reminderTiming: {
        label: 'Pre-Clean Reminder Timing',
        description: 'Choose one or more times reminders are sent to customers before the scheduled clean.',
      },
      autoGenerateVisits: {
        label: 'Create the next visit automatically',
        description:
          'When a visit is completed or skipped, the next one is scheduled from the round’s frequency. If the customer owes money, the next visit is marked On hold.',
      },
      reminderTime: { label: 'Reminder time' },
    },
    recurringCycles: [
      { id: '4-week', label: '4-week' },
      { id: '6-week', label: '6-week' },
      { id: '8-week', label: '8-week' },
      { id: '12-week', label: '12-week' },
    ],
    frequencyOptions: [
      { id: '4-week', label: 'Every 4 weeks' },
      { id: '6-week', label: 'Every 6 weeks' },
      { id: '8-week', label: 'Every 8 weeks' },
      { id: '12-week', label: 'Every 12 weeks' },
    ],
    cleanMethods: [
      { id: 'traditional', label: 'Traditional' },
      { id: 'water-fed-pole', label: 'Water-fed pole' },
      { id: 'both', label: 'Both' },
    ],
    reminderOptions: [
      {
        id: 'evening-before',
        label: 'The evening before',
        description: 'Sent to every customer on the next day’s rounds',
      },
      {
        id: 'morning-of',
        label: 'The morning of the clean',
        description: 'Sent before technicians start',
      },
      { id: 'none', label: 'Don’t send reminders' },
    ],
    eveningReminderTimes: [
      { value: '17:00', label: '5:00 PM' },
      { value: '17:30', label: '5:30 PM' },
      { value: '18:00', label: '6:00 PM' },
      { value: '18:30', label: '6:30 PM' },
      { value: '19:00', label: '7:00 PM' },
      { value: '19:30', label: '7:30 PM' },
      { value: '20:00', label: '8:00 PM' },
      { value: '20:30', label: '8:30 PM' },
      { value: '21:00', label: '9:00 PM' },
    ],
    morningReminderTimes: [
      { value: '06:00', label: '6:00 AM' },
      { value: '06:30', label: '6:30 AM' },
      { value: '07:00', label: '7:00 AM' },
      { value: '07:30', label: '7:30 AM' },
      { value: '08:00', label: '8:00 AM' },
      { value: '08:30', label: '8:30 AM' },
      { value: '09:00', label: '9:00 AM' },
    ],
    reminderTimings: [
      { value: 'EVENING_BEFORE', label: 'Evening before the clean' },
      { value: 'TWO_HOURS_BEFORE', label: '2 hours before the clean' },
    ],
    reminderTimingPlaceholder: 'Select reminder timings',
    defaults: {
      recurringCycle: '4-week',
      cleanMethod: 'both',
      reminderSchedule: 'evening-before',
      eveningReminderTime: '19:00',
      morningReminderTime: '07:00',
      autoGenerateVisits: true,
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
    empty: 'No technicians yet. Use "Add Technician" to invite your team — you can also do this later.',
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
    // Values the API accepts (TRAINEE / STANDARD / SENIOR / LEAD) — see lib/technician-roles.
    roleOptions: [
      { value: '', label: 'Select role' },
      { value: 'STANDARD', label: 'Technician' },
      { value: 'SENIOR', label: 'Senior technician' },
      { value: 'LEAD', label: 'Lead technician' },
      { value: 'TRAINEE', label: 'Trainee' },
    ],
    actions: {
      viewDetails: 'View technician details',
      delete: 'Delete',
      moreOptions: 'More options',
    },
    defaults: {
      technicians: [],
    },
  },
  serviceArea: {
    heading: 'Service Areas',
    subheading:
      'The areas you cover. Rounds sit inside an area, and properties are placed in an area by their postcode.',
    info: 'Areas are the top level of your setup: Area → Rounds → Properties. A postcode sector can only belong to one area.',
    empty: 'No service areas yet. Add your first area above.',
    addForm: {
      title: 'Add a service area',
      editTitle: 'Edit service area',
      fields: {
        areaName: { label: 'Area name', placeholder: 'e.g. Alnwick' },
        postcodeSectors: {
          label: 'Postcode sectors',
          placeholder: 'Type a sector, press Enter',
          hint: 'e.g. NE66 1 — the first part of the postcode plus the next digit',
          remove: 'Remove {sector}',
        },
        notes: { label: 'Notes (optional)', placeholder: 'e.g. Town centre and surrounding villages' },
      },
      actions: { confirm: 'Add area', save: 'Save area', cancel: 'Cancel' },
      validation: {
        nameRequired: 'Area name is required.',
        postcodeRequired: 'Add at least one postcode sector.',
        postcodeInvalid: '{sector} isn’t a valid postcode sector — use e.g. NE66 1.',
        sectorTaken: '{sector} already belongs to {area}.',
      },
    },
    list: {
      heading: 'Your areas ({count})',
      noRounds: '0 rounds · add in Step {step}',
      roundsOne: '1 round',
      roundsMany: '{count} rounds',
    },
    actions: { edit: 'Edit', delete: 'Delete' },
    defaults: {
      areas: [],
    },
  },
  activate: {
    heading: 'Activate & Generate Visits',
    subheading: 'Create the first visits. Each round keeps its own day and frequency.',
    sections: { rounds: '1. Which rounds?', startDate: '2. Start date', preview: '3. Preview' },
    scope: {
      all: { label: 'All rounds (recommended)', description: 'Create visits for every round' },
      selected: { label: 'Selected rounds only', description: 'Start some rounds now, the rest later' },
      pickRounds: 'Rounds to start now',
    },
    startDate: {
      label: 'Start creating visits from',
      today: '(today)',
      hint: 'Each round starts on its own day on or after this date. Properties with a “last cleaned” date continue their cycle instead.',
    },
    preview: {
      columns: {
        round: 'Round',
        day: 'Day',
        frequency: 'Frequency',
        properties: 'Properties',
        firstVisit: 'First visit',
        visits: 'Visits',
      },
      footerRounds: '{count} rounds · {areas}',
      footerVisits: '{count} visits will be created',
      none: 'No rounds selected yet.',
      noAreaRounds: '{areas} has no rounds',
      unassignedProperties: '{count} properties aren’t in a round',
      warningSuffix: ' — they won’t get visits yet.',
      fixNow: 'Fix now →',
      technicianInfo:
        'Visits are created without a technician. Next, you’ll assign technicians to each round’s first visits.',
    },
    alreadyGenerated: '{count} visits have already been generated — going live won’t create them again.',
    ready: {
      heading: 'Ready to go live?',
      description: '{count} visits will appear on the Round Planner and Today’s Work. This finishes setup.',
      button: 'Generate visits & go live',
      buttonGoLive: 'Go live',
      working: 'Going live…',
    },
    validation: {
      roundsRequired: 'Pick at least one round, or choose All rounds.',
      noVisits: 'There’s nothing to generate yet — add properties to a round first.',
    },
  },
  live: {
    heading: 'You’re live',
    subheading: 'Setup is complete',
    title: 'RoundFlow is live for {business}',
    titleFallback: 'RoundFlow is live',
    summary: '{visits} visits created across {rounds} rounds, starting {date}.',
    stats: { areas: 'areas', rounds: 'rounds', properties: 'properties', technicians: 'technicians', visits: 'visits' },
    next: {
      assign: {
        title: 'Assign technicians to the first visits',
        description: 'Required before the first round day',
        action: 'Start →',
      },
      fixRounds: {
        titleAreas: 'Add rounds to {areas}',
        titleProperties: 'Place {count} unassigned properties',
        titleBoth: 'Add rounds to {areas} and place {count} unassigned properties',
        description: 'They won’t get visits until they’re in a round',
        action: 'Open →',
      },
      stripe: {
        title: 'Connect Stripe',
        description: 'So customers without a Direct Debit can pay by card',
        action: 'Open →',
      },
    },
    goToDashboard: 'Go to dashboard',
  },
  properties: {
    heading: 'Properties',
    subheading: 'Add the properties you clean. The postcode decides the area; the round decides the day and frequency.',
    summary: '{count} properties added',
    notInRound: '{count} not in a round',
    importCsv: 'Import CSV',
    formTitle: 'Add a property',
    sections: {
      address: 'Address',
      round: 'Round',
      customer: 'Customer',
      service: 'Service, price & payment',
      notes: 'Access & notes',
    },
    fields: {
      postcode: { label: 'Postcode', placeholder: 'e.g. NE66 1AB', area: 'Area: {area}', noArea: 'No matching area' },
      propertyType: { label: 'Property type' },
      address: { label: 'Address', placeholder: 'e.g. 4 Hotspur Street, Alnwick' },
      customerName: { label: 'Customer name', placeholder: 'e.g. John Smith' },
      mobile: { label: 'Mobile', placeholder: '07700 900789' },
      email: { label: 'Email', placeholder: 'e.g. john@example.co.uk', hint: 'Needed to email invoices' },
      propertyName: { label: 'Property name (optional)', placeholder: 'Defaults to the address' },
      services: { label: 'Services', placeholder: 'Select services' },
      price: { label: 'Price per visit', placeholder: '£0.00', hint: 'Starts from the service’s default price' },
      paymentMethod: { label: 'Payment method', hint: 'Default from Payment Setup' },
      lastCleaned: {
        label: 'Last cleaned (optional)',
        hint: 'For existing customers — keeps their cycle instead of starting fresh',
      },
      sendDdLink: { label: 'Send a Direct Debit setup link to the customer now' },
      accessNotes: { label: 'Access notes', placeholder: 'e.g. Side gate, code 1234' },
      riskNotes: { label: 'Risk notes', placeholder: 'e.g. Dog in back garden' },
      internalNotes: { label: 'Internal notes (not shown to technicians)', placeholder: 'e.g. Prefers text over calls' },
    },
    round: {
      summary: 'Every {day}, {frequency}',
      afterActivation: 'next visit after activation',
      suggested: 'Suggested — {sector}',
      unassigned: {
        label: 'Leave unassigned for now',
        description: 'The property won’t get visits until you add it to a round',
      },
      areaHint: 'Only rounds in {area} are shown, because the postcode is in {area}.',
      noAreaHint: 'Enter the postcode to see the rounds in its area.',
      noRounds: '{area} has no rounds yet — leave it unassigned, or add a round in Step {step}.',
    },
    actions: { saveAndAdd: 'Save & add another', save: 'Save property', saving: 'Saving…' },
    list: {
      heading: 'Added properties ({count})',
      columns: { property: 'Property', postcode: 'Postcode', round: 'Round' },
      notInRound: 'Not in a round',
    },
    frequencyPhrases: {
      FOUR_WEEKLY: 'every 4 weeks',
      SIX_WEEKLY: 'every 6 weeks',
      EIGHT_WEEKLY: 'every 8 weeks',
      TWELVE_WEEKLY: 'every 12 weeks',
    },
  },
  messages: {
    heading: 'Message Templates',
    subheading:
      'What customers receive by SMS, WhatsApp or email. Sensible defaults are ready — edit any you like.',
    groups: { visits: 'Visits', payments: 'Payments', other: 'Other' },
    channelLabels: { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' },
    channelOrder: ['sms', 'email', 'whatsapp'],
    editor: {
      characters: '{count} / 160 characters',
      smsParts: '{count} SMS',
      insertVariable: 'Insert a variable',
      preview: 'Preview',
      reset: 'Reset to default',
      save: 'Save template',
      saving: 'Saving…',
      saved: 'Template saved',
      bodyRequired: 'The message can’t be empty.',
      channelRequired: 'Choose at least one channel.',
    },
    footerInfo:
      'Messages are sent through your GHL account. Until it’s connected, they’re saved and shown to you instead of being sent.',
    variables: [
      'customer_name',
      'property_address',
      'visit_date',
      'amount',
      'invoice_number',
      'pay_link',
      'dd_setup_link',
      'business_name',
    ],
    previewValues: {
      customer_name: 'John Smith',
      property_address: '4 Hotspur St',
      visit_date: 'Mon 19 Oct',
      amount: '18.00',
      invoice_number: 'INV-2026-014',
      pay_link: 'pay.roundflow.app/i/7Kq2',
      dd_setup_link: 'pay.roundflow.app/dd/3Fh8',
      business_name: 'your business',
      // Older template variables.
      clean_date: 'Mon 19 Oct',
      new_date: 'Tue 20 Oct',
      amount_owed: '18.00',
    },
    // Older wizard names, and the templates the backend seeds for new tenants.
    aliases: {
      'pre-clean-reminder': ['pre-clean reminder', 'appointment reminder'],
      'visit-completed': ['job completed'],
      'access-issue': ['access issue follow-up', 'missed visit notice'],
      'invoice-link': ['invoice ready'],
      'payment-reminder': ['payment overdue reminder'],
      'complaint-received': ['complaint acknowledgement'],
    },
    catalogue: [
      {
        key: 'pre-clean-reminder',
        name: 'Pre-clean reminder',
        group: 'visits',
        description: 'Sent before a clean, at the time set in Round Settings',
        channels: ['sms'],
        body: 'Hi {{customer_name}}, we’re cleaning your windows at {{property_address}} on {{visit_date}}. Please leave side gates unlocked. Thanks, {{business_name}}',
      },
      {
        key: 'visit-completed',
        name: 'Visit completed',
        group: 'visits',
        description: 'Sent when a technician marks the visit done',
        channels: ['whatsapp'],
        body: 'Hi {{customer_name}}, your windows at {{property_address}} have been cleaned today. Thank you! {{business_name}}',
      },
      {
        key: 'access-issue',
        name: 'Access issue',
        group: 'visits',
        description: 'Sent when a technician can’t get in',
        channels: ['sms'],
        body: 'Hi {{customer_name}}, we couldn’t get access to {{property_address}} today. Reply to rearrange your clean. Thanks, {{business_name}}',
      },
      {
        key: 'weather-delay',
        name: 'Weather delay',
        group: 'visits',
        description: 'Sent when a round is moved because of the weather',
        channels: ['sms'],
        body: 'Hi {{customer_name}}, due to the weather we’ve moved your window clean to {{visit_date}}. Sorry for any inconvenience. {{business_name}}',
      },
      {
        key: 'invoice-link',
        name: 'Invoice & card payment link',
        group: 'payments',
        description: 'Sent after a visit for customers without a Direct Debit',
        channels: ['sms', 'email'],
        body: 'Hi {{customer_name}}, your window clean at {{property_address}} is done. Invoice {{invoice_number}}: £{{amount}}. Pay securely here: {{pay_link}} — Thanks, {{business_name}}',
      },
      {
        key: 'dd-setup-link',
        name: 'Direct Debit setup link',
        group: 'payments',
        description: 'Sent to set up a Direct Debit with GoCardless',
        channels: ['sms', 'email'],
        body: 'Hi {{customer_name}}, set up a Direct Debit for your window cleaning and you’ll never need to pay by hand: {{dd_setup_link}} — Thanks, {{business_name}}',
      },
      {
        key: 'payment-reminder',
        name: 'Payment reminder',
        group: 'payments',
        description: 'Sent when an invoice is overdue',
        channels: ['sms'],
        body: 'Hi {{customer_name}}, a reminder that £{{amount}} for invoice {{invoice_number}} is now due. Pay here: {{pay_link}} — Thanks, {{business_name}}',
      },
      {
        key: 'payment-failed',
        name: 'Payment failed',
        group: 'payments',
        description: 'Sent when a Direct Debit or card payment fails',
        channels: ['sms'],
        body: 'Hi {{customer_name}}, your payment of £{{amount}} didn’t go through. Please pay here: {{pay_link}} — Thanks, {{business_name}}',
      },
      {
        key: 'complaint-received',
        name: 'Complaint received',
        group: 'other',
        description: 'Sent when you log a complaint for a customer',
        channels: ['email'],
        body: 'Hi {{customer_name}}, thanks for letting us know about your clean at {{property_address}}. We’re looking into it and will be in touch shortly. {{business_name}}',
      },
    ],
  },
  payments: {
    heading: 'Payment Setup',
    subheading: 'Connect the accounts your customers will pay into — optional, you can do this later',
    info: 'Money goes straight into your own GoCardless and Stripe accounts. RoundFlow never holds your money or sees bank or card details.',
    status: { connected: 'Connected', notConnected: 'Not connected' },
    details: { mode: 'Mode', sandbox: 'Test mode (sandbox)', live: 'Live' },
    stripeRedirecting: 'Opening Stripe…',
    connectAfterSetup:
      'Only admins and managers can connect {provider}.',
    providers: {
      gocardless: {
        name: 'GoCardless',
        description: 'Direct Debit collections — customers pay from their bank automatically after each clean',
        connect: 'Connect GoCardless',
        disconnect: 'Disconnect',
      },
      stripe: {
        name: 'Stripe',
        description: 'Card payments — customers without a Direct Debit get a secure pay link after each clean',
        connect: 'Connect Stripe',
        disconnect: 'Disconnect',
        explainer:
          'You’ll sign in to (or create) your own account and approve RoundFlow. Money is paid straight into your bank account.',
      },
    },
    defaults: {
      heading: 'Payment defaults',
      description: 'Used for new properties — change any property later',
      fields: {
        method: {
          label: 'Default payment method',
          stripeDisabledHint: 'Card link (Stripe) is disabled until Stripe is connected',
        },
        timing: { label: 'When to take payment', hint: 'Or: once a day for all completed visits' },
        dueDays: { label: 'Invoice due after', suffix: 'days', invalid: 'Enter a number of days (0–90).' },
        noDirectDebit: {
          label: 'Customers without a Direct Debit',
          hint: 'Becomes “Send a card payment link” once Stripe is connected',
        },
        debtHold: {
          label: 'Put the next clean on hold if payment is overdue',
          description:
            'The visit stays on the planner marked “On hold” and no reminder is sent. Released automatically when paid.',
        },
      },
      vat: {
        label: 'VAT',
        registered: 'Registered · {rate}%',
        notRegistered: 'Not registered',
        source: 'Set in Business Profile (Step {step})',
        change: 'Change',
      },
    },
    methods: [
      { value: 'GOCARDLESS', label: 'Direct Debit (GoCardless)', requires: 'gocardless' },
      { value: 'STRIPE', label: 'Card link (Stripe)', requires: 'stripe' },
      { value: 'BACS', label: 'Bank transfer' },
      { value: 'CASH', label: 'Cash' },
      { value: 'CHEQUE', label: 'Cheque' },
    ],
    timings: [
      { value: 'after-visit', label: 'After each visit is completed' },
      { value: 'daily', label: 'Once a day for all completed visits' },
    ],
    noDirectDebitActions: [
      { value: 'invoice', label: 'Send invoice only' },
      { value: 'card-link', label: 'Send a card payment link', requiresStripe: true },
    ],
    formDefaults: {
      goCardlessConnected: false,
      stripeConnected: false,
      defaultPaymentMethod: 'BACS',
      paymentTiming: 'after-visit',
      invoiceDueDays: '7',
      noDirectDebitAction: 'invoice',
      debtHoldEnabled: true,
    },
  },
  technicians: {
    heading: 'Technicians',
    subheading: 'Invite your team to the RoundFlow app and set the areas they cover',
    info: 'Technicians aren’t tied to a round. After launch you assign them to visits — and several technicians can share a round.',
    form: {
      title: 'Add a technician',
      editTitle: 'Edit technician',
      fields: {
        fullName: { label: 'Full name', placeholder: 'e.g. Sarah Johnson' },
        mobile: { label: 'Mobile', placeholder: '07700 900123' },
        email: {
          label: 'Email',
          placeholder: 'e.g. sarah@example.co.uk',
          hint: 'The app invite is sent here',
        },
        role: { label: 'Role', hint: 'Technician · Senior · Lead · Trainee' },
        areas: {
          label: 'Areas covered',
          hint: 'Choose one or more. Used to suggest technicians when assigning visits.',
          empty: 'Add a service area first.',
        },
        sendInvite: { label: 'Send the app invite now' },
      },
      actions: { add: 'Add technician', save: 'Save technician', cancel: 'Cancel' },
      validation: {
        nameRequired: 'Full name is required.',
        mobileRequired: 'Mobile number is required.',
        mobileInvalid: 'Enter a valid mobile number.',
        emailRequired: 'Email is required — the app invite is sent here.',
        emailInvalid: 'Enter a valid email address.',
        areasRequired: 'Choose at least one area.',
      },
    },
    team: {
      heading: 'Your team ({count})',
      empty: 'No technicians yet. Add your first one above.',
      columns: {
        name: 'Name',
        mobile: 'Mobile',
        areas: 'Areas',
        role: 'Role',
        appAccess: 'App access',
      },
    },
    appAccess: {
      active: 'Active',
      invited: 'Invite sent',
      notInvited: 'Not invited',
      inactive: 'Inactive',
    },
    actions: { edit: 'Edit', resend: 'Resend', sendInvite: 'Send invite', sending: 'Sending…' },
    toasts: { inviteSent: 'Invite sent to {email}.', addEmailFirst: 'Add an email before sending an invite.' },
    roles: [
      { value: 'STANDARD', label: 'Technician' },
      { value: 'SENIOR', label: 'Senior technician' },
      { value: 'LEAD', label: 'Lead technician' },
      { value: 'TRAINEE', label: 'Trainee' },
    ],
  },
  rounds: {
    heading: 'Rounds',
    subheading:
      'Rounds sit inside an area. Each round has its own day and frequency — properties inherit both',
    info: 'Every round belongs to one area. In Step {step}, a property can only join rounds in its own area (worked out from its postcode).',
    form: {
      title: 'Add a round',
      editTitle: 'Edit round',
      fields: {
        area: { label: 'Area', placeholder: 'Select an area' },
        name: {
          label: 'Round name',
          placeholder: 'e.g. Alnwick Monday',
          placeholderFor: 'e.g. {area} {day}',
        },
        day: { label: 'Day', hint: 'Only your working days (Step {step}) are listed' },
        frequency: {
          label: 'Frequency',
          hint: 'Default from Round Settings — 4, 6, 8 or 12 weeks',
        },
        sectors: {
          label: 'Postcode sectors in this round (optional)',
          hint: 'Only sectors from the chosen area. Helps suggest a round for new properties.',
          noArea: 'Choose an area to see its sectors.',
          empty: 'This area has no postcode sectors.',
        },
      },
      actions: { add: 'Add round', save: 'Save round', cancel: 'Cancel' },
      validation: {
        areaRequired: 'Choose an area.',
        nameRequired: 'Round name is required.',
        dayRequired: 'Choose a day.',
        duplicateName: 'There’s already a round called {name}.',
        roundsRequired: 'Add at least one round to continue — or skip this step for now.',
      },
    },
    areaCard: {
      addRound: '+ Add round to {area}',
      noSectors: 'No postcode sectors',
      empty: 'No rounds yet — properties in {area} would stay unassigned and won’t get visits.',
      columns: { round: 'Round', day: 'Day', frequency: 'Frequency', sectors: 'Sectors' },
      edit: 'Edit',
    },
    noAreas: 'Add a service area first — every round belongs to one area.',
    days: [
      { value: 'MON', label: 'Monday' },
      { value: 'TUE', label: 'Tuesday' },
      { value: 'WED', label: 'Wednesday' },
      { value: 'THU', label: 'Thursday' },
      { value: 'FRI', label: 'Friday' },
      { value: 'SAT', label: 'Saturday' },
      { value: 'SUN', label: 'Sunday' },
    ],
    frequencies: [
      { value: 'FOUR_WEEKLY', label: 'Every 4 weeks' },
      { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
      { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
      { value: 'TWELVE_WEEKLY', label: 'Every 12 weeks' },
    ],
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
    addedTitle: 'Added properties',
    importCsv: {
      openButton: 'Import from CSV',
      title: 'Import properties from a spreadsheet',
      description:
        'Upload a CSV or Excel (.xlsx) file, or paste rows copied from your customer export. We read the name, phone, email and service address columns. Pick the round and a default price to apply to every imported property — you can edit each one later.',
      pasteLabel: 'Paste your rows (including the header row)',
      pastePlaceholder:
        'First name\tLast name\tMobile phone\tEmail\tService street 1\tService city\tService postcode\nOliver\tClarke\t07500 208 733\toliver@example.com\t63 Manor Road\tLiverpool\tL24 2XD',
      uploadButton: 'Upload CSV or Excel file',
      orDivider: 'or paste below',
      fileSelected: 'Loaded {name}',
      fileError: "Couldn't read that file. Use a .csv, .tsv or .xlsx export.",
      roundLabel: 'Round for imported properties',
      roundPlaceholder: 'Select a round',
      serviceAreaLabel: 'Service area for imported properties',
      serviceAreaPlaceholder: 'Select a service area',
      servicesFilterLabel: 'Services to offer (pick which apply, then check/uncheck per property)',
      servicesFilterPlaceholder: 'Select services',
      noServicesHint: 'Pick services above to assign them per property.',
      priceLabel: 'Default price per visit (£)',
      pricePlaceholder: 'e.g. 20',
      customizeHint:
        'Each property’s price is the sum of its checked services — tick/untick services per row, or type a custom price.',
      parse: 'Preview',
      clear: 'Clear',
      cancel: 'Cancel',
      readyTitle: 'Ready to import',
      skippedTitle: 'Skipped rows',
      importButton: 'Import {count} properties',
      importing: 'Importing {done} of {total}…',
      progress: {
        title: 'Adding properties…',
        detail: '{done} of {total} saved',
        /** Before the first chunk returns there's no count yet (GAP-009). */
        starting: 'Starting {total}…',
        hint: 'Keep this page open until it finishes.',
      },
      done: 'Imported {added} properties.',
      partial: 'Imported {added} of {total}. {failed} failed — they’re still listed below; fix them and import again.',
      failedTitle: 'Failed to save',
      unrecognized:
        "Couldn't recognise the columns. Make sure the first pasted line is the header row (e.g. First name, Last name, Service postcode).",
      roundRequired: 'Choose a round for the imported properties.',
      serviceAreaRequired: 'Choose a service area for the imported properties.',
      priceRequired: 'Enter a default price per visit.',
      allPricesRequired: 'Enter a price for every property before importing.',
      bulkPartialFailure:
        'The import stopped partway ({message}). Rows that were saved have been taken off this list, so importing again only sends the rest.',
      rowError: 'Row {row}',
      emptyPaste: 'Paste some rows first.',
      noValidRows: 'No rows could be imported — check the skipped list below.',
      columns: {
        name: 'Customer',
        address: 'Address',
        postcode: 'Postcode',
        phone: 'Phone',
        email: 'Email',
        service: 'Services',
        price: 'Price (£)',
      },
    },
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
      pricePerVisit: {
        label: 'Price per visit',
        placeholder: '£ XX',
        hint: "Filled in from the service's catalogue price — change it to override for this property.",
      },
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
      serviceIds: [],
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
