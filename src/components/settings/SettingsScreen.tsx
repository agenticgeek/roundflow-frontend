import { useMemo, useState } from 'react'
import type {
  SettingsBusinessProfile,
  SettingsPaymentSetup,
  SettingsRoundSettings,
  SettingsSectionId,
  SettingsServiceArea,
  SettingsServiceCatalogue,
  SettingsSmsTemplates,
  SettingsTechnicianManagement,
} from '@/content/settings'
import { settingsContent } from '@/content/settings'
import { setupWizardContent } from '@/content/setup-wizard'
import type { CatalogueService, MessageTemplate, ServiceArea, Technician } from '@/types/setup-wizard'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Field, FieldError, Input, Select, Toggle } from '@/components/ui'
import { DaySelector } from '@/components/setup-wizard/DaySelector'
import { MultiToggleButtons } from '@/components/setup-wizard/MultiToggleButtons'
import { AddServiceModal } from '@/components/setup-wizard/AddServiceModal'
import { EditTemplateModal } from '@/components/setup-wizard/EditTemplateModal'
import { useToast } from '@/components/ui/toast'
import { cn, formatCurrency, interpolateTemplate, truncateTemplateBody } from '@/lib/utils'

const cardClass = 'rounded-lg border border-border bg-card shadow-sm'

const settingsSelectClass = 'rounded-lg border-accent/25 bg-accent-surface'

function getInitialBusinessProfile(): SettingsBusinessProfile {
  const { defaults } = setupWizardContent.businessProfile

  return {
    businessName: defaults.businessName,
    businessPhone: defaults.businessPhone,
    businessEmail: defaults.businessEmail,
    serviceArea: defaults.serviceArea,
    workingDays: [...defaults.workingDays],
    timezone: defaults.timezone,
    currency: defaults.currency,
  }
}

function getInitialPaymentSetup(): SettingsPaymentSetup {
  return { ...setupWizardContent.paymentSetup.defaults }
}

function getInitialRoundSettings(): SettingsRoundSettings {
  const { defaults } = setupWizardContent.roundSettings
  return {
    ...defaults,
    cleanMethods: [...defaults.cleanMethods],
  }
}

function getInitialSmsTemplates(): SettingsSmsTemplates {
  return {
    templates: setupWizardContent.smsTemplates.defaults.templates.map((template) => ({
      ...template,
    })),
  }
}

function getInitialTechnicianManagement(): SettingsTechnicianManagement {
  return {
    technicians: setupWizardContent.technicianManagement.defaults.technicians.map((technician) => ({
      ...technician,
    })),
  }
}

function getInitialServiceArea(): SettingsServiceArea {
  return {
    areas: setupWizardContent.serviceArea.defaults.areas.map((area) => ({
      ...area,
      postcodeSectors: [...area.postcodeSectors],
    })),
  }
}

function getInitialServiceCatalogue(): SettingsServiceCatalogue {
  return {
    services: setupWizardContent.serviceCatalogue.defaults.services.map((service) => ({
      ...service,
    })),
  }
}

/** Settings module — sidebar navigation and section panels. */
export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('business-profile')
  const [businessProfile, setBusinessProfile] = useState<SettingsBusinessProfile>(getInitialBusinessProfile)
  const [paymentSetup, setPaymentSetup] = useState<SettingsPaymentSetup>(getInitialPaymentSetup)
  const [roundSettings, setRoundSettings] = useState<SettingsRoundSettings>(getInitialRoundSettings)
  const [smsTemplates, setSmsTemplates] = useState<SettingsSmsTemplates>(getInitialSmsTemplates)
  const [technicianManagement, setTechnicianManagement] = useState<SettingsTechnicianManagement>(
    getInitialTechnicianManagement,
  )
  const [serviceArea, setServiceArea] = useState<SettingsServiceArea>(getInitialServiceArea)
  const [serviceCatalogue, setServiceCatalogue] = useState<SettingsServiceCatalogue>(
    getInitialServiceCatalogue,
  )
  const [editing, setEditing] = useState(false)

  function handleSectionChange(section: SettingsSectionId) {
    setActiveSection(section)
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{settingsContent.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{settingsContent.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsSidebar activeSection={activeSection} onSelect={handleSectionChange} />

        <div>
          {activeSection === 'business-profile' ? (
            <BusinessProfilePanel
              values={businessProfile}
              editing={editing}
              onChange={setBusinessProfile}
              onEdit={() => setEditing(true)}
            />
          ) : activeSection === 'payment-setup' ? (
            <PaymentSetupPanel
              values={paymentSetup}
              editing={editing}
              onChange={setPaymentSetup}
              onEdit={() => setEditing(true)}
            />
          ) : activeSection === 'round-settings' ? (
            <RoundSettingsPanel
              values={roundSettings}
              editing={editing}
              onChange={setRoundSettings}
              onEdit={() => setEditing(true)}
            />
          ) : activeSection === 'sms-templates' ? (
            <SmsTemplatesPanel values={smsTemplates} onChange={setSmsTemplates} />
          ) : activeSection === 'technician-management' ? (
            <TechnicianManagementPanel
              values={technicianManagement}
              onChange={setTechnicianManagement}
            />
          ) : activeSection === 'service-area' ? (
            <ServiceAreasPanel values={serviceArea} onChange={setServiceArea} />
          ) : (
            <ServiceCataloguePanel values={serviceCatalogue} onChange={setServiceCatalogue} />
          )}

          <div className="mt-4 flex justify-end">
            <SaveChangesButton onSave={() => setEditing(false)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: SettingsSectionId
  onSelect: (section: SettingsSectionId) => void
}) {
  return (
    <nav className={cn(cardClass, 'h-fit p-4')}>
      <p className="px-2 text-sm font-semibold text-foreground">{settingsContent.sidebarTitle}</p>
      <ul className="mt-3 space-y-1">
        {settingsContent.sections.map((section) => {
          const active = activeSection === section.id

          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-surface',
                )}
              >
                <DashboardIcon name={section.icon} className="h-4 w-4 shrink-0" />
                {section.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function BusinessProfilePanel({
  values,
  editing,
  onChange,
  onEdit,
}: {
  values: SettingsBusinessProfile
  editing: boolean
  onChange: (values: SettingsBusinessProfile) => void
  onEdit: () => void
}) {
  const { businessProfile } = settingsContent
  const { fields, days, timezones, currencies } = setupWizardContent.businessProfile

  function updateField<K extends keyof SettingsBusinessProfile>(
    key: K,
    value: SettingsBusinessProfile[K],
  ) {
    onChange({ ...values, [key]: value })
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="file" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{businessProfile.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{businessProfile.subheading}</p>
          </div>
        </div>
        {!editing ? (
          <button type="button" onClick={onEdit} className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}>
            {settingsContent.actions.edit}
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-5">
        <Field label={fields.businessName.label} required labelWeight="medium">
          <Input
            value={values.businessName}
            onChange={(event) => updateField('businessName', event.target.value)}
            placeholder={fields.businessName.placeholder}
            readOnly={!editing}
            className={cn(!editing && 'bg-surface')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.businessPhone.label} required labelWeight="medium">
            <Input
              type="tel"
              value={values.businessPhone}
              onChange={(event) => updateField('businessPhone', event.target.value)}
              placeholder={fields.businessPhone.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>

          <Field label={fields.businessEmail.label} required labelWeight="medium">
            <Input
              type="email"
              value={values.businessEmail}
              onChange={(event) => updateField('businessEmail', event.target.value)}
              placeholder={fields.businessEmail.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>
        </div>

        <Field label={fields.serviceArea.label} required labelWeight="medium">
          <Input
            value={values.serviceArea}
            onChange={(event) => updateField('serviceArea', event.target.value)}
            placeholder={fields.serviceArea.placeholder}
            readOnly={!editing}
            className={cn(!editing && 'bg-surface')}
          />
        </Field>

        <Field label={fields.workingDays.label} labelWeight="medium">
          <div className={cn(!editing && 'pointer-events-none')}>
            <DaySelector
              days={days}
              selected={values.workingDays}
              onChange={(workingDays) => updateField('workingDays', workingDays)}
            />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.timezone.label} labelWeight="medium">
            <Select
              value={values.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
              options={timezones}
              disabled={!editing}
              className={settingsSelectClass}
            />
          </Field>

          <Field label={fields.currency.label} labelWeight="medium">
            <Select
              value={values.currency}
              onChange={(event) => updateField('currency', event.target.value)}
              options={currencies}
              disabled={!editing}
              className={settingsSelectClass}
            />
          </Field>
        </div>
      </div>
    </article>
  )
}

function PaymentSetupPanel({
  values,
  editing,
  onChange,
  onEdit,
}: {
  values: SettingsPaymentSetup
  editing: boolean
  onChange: (values: SettingsPaymentSetup) => void
  onEdit: () => void
}) {
  const { paymentSetup: panelCopy } = settingsContent
  const { paymentSetup } = setupWizardContent
  const { providers, settings, status } = paymentSetup
  const { showToast } = useToast()

  function updateField<K extends keyof SettingsPaymentSetup>(
    key: K,
    value: SettingsPaymentSetup[K],
  ) {
    onChange({ ...values, [key]: value })
  }

  function handleConnect(providerId: 'gocardless' | 'stripe') {
    if (providerId === 'gocardless') updateField('goCardlessConnected', true)
    if (providerId === 'stripe') updateField('stripeConnected', true)
    showToast(providerId === 'gocardless' ? 'GoCardless connected' : 'Stripe connected')
  }

  const connectionMap = {
    gocardless: values.goCardlessConnected,
    stripe: values.stripeConnected,
  } as const

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="card" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
          </div>
        </div>
        {!editing ? (
          <button type="button" onClick={onEdit} className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}>
            {settingsContent.actions.edit}
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => {
          const connected = connectionMap[provider.id]

          return (
            <div key={provider.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{provider.name}</h3>
                  <p className="mt-1 text-sm text-muted">{provider.description}</p>
                </div>
                <span
                  className={cn(
                    'inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                    connected ? 'bg-success/10 text-success' : 'bg-surface text-muted',
                  )}
                >
                  {connected ? status.connected : status.notConnected}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleConnect(provider.id)}
                disabled={connected}
                className={cn(
                  'mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200',
                  'hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <ExternalLinkIcon />
                {provider.connectLabel}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-8 space-y-5">
        <h3 className="text-base font-semibold text-foreground">{settings.heading}</h3>

        <Field label={settings.defaultPaymentRule.label} labelWeight="medium">
          <Select
            value={values.defaultPaymentRule}
            onChange={(event) => updateField('defaultPaymentRule', event.target.value)}
            options={paymentSetup.paymentRules}
            disabled={!editing}
            className={settingsSelectClass}
          />
        </Field>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{settings.vatApplicable.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.vatApplicable.description}</p>
          </div>
          <div className={cn(!editing && 'pointer-events-none opacity-70')}>
            <Toggle
              checked={values.vatApplicable}
              onChange={(vatApplicable) => updateField('vatApplicable', vatApplicable)}
              ariaLabel={settings.vatApplicable.label}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{settings.debtHoldEnabled.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.debtHoldEnabled.description}</p>
          </div>
          <div className={cn(!editing && 'pointer-events-none opacity-70')}>
            <Toggle
              checked={values.debtHoldEnabled}
              onChange={(debtHoldEnabled) => updateField('debtHoldEnabled', debtHoldEnabled)}
              ariaLabel={settings.debtHoldEnabled.label}
            />
          </div>
        </div>
      </div>
    </article>
  )
}

function RoundSettingsPanel({
  values,
  editing,
  onChange,
  onEdit,
}: {
  values: SettingsRoundSettings
  editing: boolean
  onChange: (values: SettingsRoundSettings) => void
  onEdit: () => void
}) {
  const { roundSettings: panelCopy } = settingsContent
  const { roundSettings } = setupWizardContent
  const { fields } = roundSettings

  function updateField<K extends keyof SettingsRoundSettings>(
    key: K,
    value: SettingsRoundSettings[K],
  ) {
    onChange({ ...values, [key]: value })
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="refresh" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
          </div>
        </div>
        {!editing ? (
          <button type="button" onClick={onEdit} className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}>
            {settingsContent.actions.edit}
          </button>
        ) : null}
      </div>

      <div className={cn('mt-6 space-y-6', !editing && 'pointer-events-none')}>
        <div>
          <p className="mb-2.5 text-sm font-medium text-muted">{fields.recurringCycle.label}</p>
          <div
            role="radiogroup"
            aria-label={fields.recurringCycle.label}
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {roundSettings.recurringCycles.map((option) => {
              const active = values.recurringCycle === option.id

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateField('recurringCycle', option.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors duration-150',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/30 bg-accent-surface text-primary hover:border-primary/50',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-sm font-medium text-muted">{fields.cleanMethods.label}</p>
          <MultiToggleButtons
            ariaLabel={fields.cleanMethods.label}
            options={roundSettings.cleanMethods}
            value={values.cleanMethods}
            onChange={(cleanMethods) => updateField('cleanMethods', cleanMethods)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{fields.autoGenerateVisits.label}</p>
            <p className="mt-0.5 text-sm text-muted">{fields.autoGenerateVisits.description}</p>
          </div>
          <Toggle
            checked={values.autoGenerateVisits}
            onChange={(autoGenerateVisits) => updateField('autoGenerateVisits', autoGenerateVisits)}
            ariaLabel={fields.autoGenerateVisits.label}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{fields.reminderTiming.label}</p>
          <p className="mt-0.5 text-sm text-muted">{fields.reminderTiming.description}</p>
          <Select
            className={cn('mt-3', settingsSelectClass)}
            value={values.reminderTiming}
            onChange={(event) => updateField('reminderTiming', event.target.value)}
            options={[...roundSettings.reminderTimings]}
            disabled={!editing}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{fields.reminderTimeOfDay.label}</p>
          <p className="mt-0.5 text-sm text-muted">{fields.reminderTimeOfDay.description}</p>
          <Select
            className={cn('mt-3', settingsSelectClass)}
            value={values.reminderTimeOfDay}
            onChange={(event) => updateField('reminderTimeOfDay', event.target.value)}
            options={[...roundSettings.reminderTimesOfDay]}
            disabled={!editing}
          />
        </div>
      </div>
    </article>
  )
}

function SmsTemplatesPanel({
  values,
  onChange,
}: {
  values: SettingsSmsTemplates
  onChange: (values: SettingsSmsTemplates) => void
}) {
  const { smsTemplates: panelCopy } = settingsContent
  const { labels, channelLabels, previewVariables } = setupWizardContent.smsTemplates
  const [selectedId, setSelectedId] = useState(values.templates[0]?.id ?? '')
  const [editOpen, setEditOpen] = useState(false)

  const { showToast } = useToast()

  const selectedTemplate = useMemo(
    () => values.templates.find((template) => template.id === selectedId) ?? values.templates[0],
    [values.templates, selectedId],
  )

  const previewText = useMemo(() => {
    if (!selectedTemplate) return ''
    return interpolateTemplate(selectedTemplate.body, previewVariables)
  }, [previewVariables, selectedTemplate])

  if (!selectedTemplate) return null

  const previewLabel =
    selectedTemplate.channel === 'whatsapp' ? labels.whatsappMessage : labels.smsMessage

  function saveTemplate(updated: MessageTemplate) {
    onChange({
      templates: values.templates.map((template) =>
        template.id === updated.id ? updated : template,
      ),
    })
    showToast(settingsContent.toasts.templateUpdated)
  }

  return (
    <>
      <article className={cn(cardClass, 'p-6')}>
        <div className="flex items-start gap-3 border-b border-border pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="message" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-1">
            <p className="mb-2 text-sm font-semibold text-foreground">{labels.templates}</p>
            <ul className="space-y-2">
              {values.templates.map((template) => {
                const active = template.id === selectedTemplate.id

                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(template.id)}
                      className={cn(
                        'w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-150',
                        active
                          ? 'border-primary bg-accent-surface'
                          : 'border-primary/25 bg-accent-surface/50 hover:border-primary/40 hover:bg-accent-surface',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{template.name}</span>
                        <span className="shrink-0 rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
                          {channelLabels[template.channel]}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted">
                        {truncateTemplateBody(template.body, 48)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{labels.preview}</p>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
              >
                <DashboardIcon name="edit" className="h-3.5 w-3.5" />
                {labels.edit}
              </button>
            </div>

            <div className="min-h-[14rem] rounded-xl border border-border bg-card p-5">
              <p className="text-xs text-muted">{previewLabel}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{previewText}</p>
            </div>
          </div>
        </div>
      </article>

      <EditTemplateModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        template={selectedTemplate}
        onSave={saveTemplate}
      />
    </>
  )
}

interface NewTechnicianForm {
  fullName: string
  mobile: string
  email: string
  role: string
  defaultArea: string
}

function emptyTechnicianForm(): NewTechnicianForm {
  return {
    fullName: '',
    mobile: '',
    email: '',
    role: '',
    defaultArea: '',
  }
}

function TechnicianManagementPanel({
  values,
  onChange,
}: {
  values: SettingsTechnicianManagement
  onChange: (values: SettingsTechnicianManagement) => void
}) {
  const { technicianManagement: panelCopy } = settingsContent
  const { technicianManagement } = setupWizardContent
  const { addForm, columns, appStatusLabels, roleOptions, actions } = technicianManagement
  const { showToast } = useToast()

  const [showAddForm, setShowAddForm] = useState(true)
  const [form, setForm] = useState<NewTechnicianForm>(emptyTechnicianForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const roleLabels = useMemo(
    () => Object.fromEntries(roleOptions.filter((option) => option.value).map((option) => [option.value, option.label])),
    [roleOptions],
  )

  function openForm() {
    setShowAddForm(true)
    setForm(emptyTechnicianForm())
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setForm(emptyTechnicianForm())
    setFormError(null)
  }

  function addTechnician() {
    const fullName = form.fullName.trim()
    const mobile = form.mobile.trim()

    if (!fullName) {
      setFormError(addForm.validation.nameRequired)
      return
    }
    if (!mobile) {
      setFormError(addForm.validation.mobileRequired)
      return
    }

    onChange({
      technicians: [
        ...values.technicians,
        {
          id: `tech-${Date.now()}`,
          fullName,
          mobile,
          email: form.email.trim(),
          role: form.role,
          defaultArea: form.defaultArea.trim(),
          appStatus: 'active',
        },
      ],
    })
    closeForm()
    showToast(settingsContent.toasts.technicianAdded)
  }

  function deleteTechnician(id: string) {
    onChange({
      technicians: values.technicians.filter((technician) => technician.id !== id),
    })
    setOpenMenuId(null)
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="technicians" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openForm}
          className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          {technicianManagement.addTechnician}
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {showAddForm ? (
          <div className="rounded-xl border border-primary/20 bg-accent-surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">{addForm.title}</h3>

            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={addForm.fields.fullName.label} required labelWeight="medium" size="sm">
                  <Input
                    inputSize="sm"
                    value={form.fullName}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, fullName: event.target.value }))
                      if (formError) setFormError(null)
                    }}
                    placeholder={addForm.fields.fullName.placeholder}
                    className="rounded-lg bg-card"
                    autoFocus
                  />
                </Field>

                <Field label={addForm.fields.mobile.label} required labelWeight="medium" size="sm">
                  <Input
                    inputSize="sm"
                    type="tel"
                    value={form.mobile}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, mobile: event.target.value }))
                      if (formError) setFormError(null)
                    }}
                    placeholder={addForm.fields.mobile.placeholder}
                    className="rounded-lg bg-card"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={addForm.fields.email.label} labelWeight="medium" size="sm">
                  <Input
                    inputSize="sm"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder={addForm.fields.email.placeholder}
                    className="rounded-lg bg-card"
                  />
                </Field>

                <Field
                  label={
                    <>
                      {addForm.fields.role.label}{' '}
                      <span className="font-normal text-muted">{addForm.fields.role.optional}</span>
                    </>
                  }
                  labelWeight="medium"
                  size="sm"
                >
                  <Select
                    inputSize="sm"
                    value={form.role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                    options={[...roleOptions]}
                    className={cn(settingsSelectClass, 'bg-card')}
                  />
                </Field>
              </div>

              <Field label={addForm.fields.defaultArea.label} labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  value={form.defaultArea}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, defaultArea: event.target.value }))
                  }
                  placeholder={addForm.fields.defaultArea.placeholder}
                  className="rounded-lg bg-card"
                />
              </Field>

              {formError ? <FieldError message={formError} size="sm" /> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={addTechnician}
                  className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}
                >
                  {addForm.actions.confirm}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                >
                  {addForm.actions.cancel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_3rem] gap-4 border-b border-border bg-surface/80 px-4 py-2.5 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>{columns.name}</span>
            <span>{columns.phone}</span>
            <span>{columns.role}</span>
            <span>{panelCopy.columns.defaultArea}</span>
            <span>{columns.appStatus}</span>
            <span className="sr-only">{columns.actions}</span>
          </div>

          <ul className="divide-y divide-border">
            {values.technicians.map((technician) => (
              <TechnicianRow
                key={technician.id}
                technician={technician}
                roleLabel={
                  technician.role ? (roleLabels[technician.role] ?? technician.role) : '—'
                }
                statusLabel={appStatusLabels[technician.appStatus]}
                menuOpen={openMenuId === technician.id}
                deleteLabel={actions.delete}
                moreOptionsLabel={actions.moreOptions}
                onToggleMenu={() =>
                  setOpenMenuId((current) => (current === technician.id ? null : technician.id))
                }
                onDelete={() => deleteTechnician(technician.id)}
              />
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

function TechnicianRow({
  technician,
  roleLabel,
  statusLabel,
  menuOpen,
  deleteLabel,
  moreOptionsLabel,
  onToggleMenu,
  onDelete,
}: {
  technician: Technician
  roleLabel: string
  statusLabel: string
  menuOpen: boolean
  deleteLabel: string
  moreOptionsLabel: string
  onToggleMenu: () => void
  onDelete: () => void
}) {
  return (
    <li className="grid gap-3 px-4 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_0.9fr_3rem] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{technician.fullName}</p>
        {technician.email ? (
          <p className="mt-0.5 truncate text-xs text-muted">{technician.email}</p>
        ) : null}
      </div>

      <p className="text-sm text-foreground">{technician.mobile}</p>
      <p className="text-sm text-foreground">{roleLabel}</p>
      <p className="text-sm text-foreground">{technician.defaultArea || '—'}</p>

      <div>
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
            technician.appStatus === 'active' && 'bg-success/10 text-success',
            technician.appStatus === 'inactive' && 'bg-surface text-muted',
            technician.appStatus === 'pending' && 'bg-primary/10 text-primary',
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="relative flex justify-end">
        <button
          type="button"
          aria-label={moreOptionsLabel}
          onClick={onToggleMenu}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <DashboardIcon name="more-vertical" className="h-4 w-4" />
        </button>

        {menuOpen ? (
          <div className="absolute top-full right-0 z-10 mt-1 min-w-[7rem] rounded-lg border border-border bg-card py-1 shadow-lg">
            <button
              type="button"
              onClick={onDelete}
              className="w-full px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-surface"
            >
              {deleteLabel}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

interface NewAreaForm {
  name: string
  postcodeSectors: string
  notes: string
}

function emptyAreaForm(): NewAreaForm {
  return {
    name: '',
    postcodeSectors: '',
    notes: '',
  }
}

function parsePostcodeSectors(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((sector) => sector.trim().toUpperCase())
    .filter(Boolean)
}

function linkedRoundLabelsForArea(areaName: string): string[] {
  const { assignRound } = setupWizardContent
  const dayLabels = Object.fromEntries(
    assignRound.roundDays.filter((day) => day.value).map((day) => [day.value, day.label]),
  )

  const assignment = assignRound.defaults.assignments.find(
    (item) => item.areaName.toLowerCase() === areaName.toLowerCase(),
  )

  if (!assignment) return []

  return assignment.linkedRounds.map((round) => {
    const dayLabel = dayLabels[round.day] ?? round.day
    return `${assignment.areaName} ${dayLabel}`
  })
}

function ServiceAreasPanel({
  values,
  onChange,
}: {
  values: SettingsServiceArea
  onChange: (values: SettingsServiceArea) => void
}) {
  const { serviceArea: panelCopy } = settingsContent
  const { serviceArea } = setupWizardContent
  const { addForm, actions } = serviceArea
  const { showToast } = useToast()

  const [showAddForm, setShowAddForm] = useState(true)
  const [form, setForm] = useState<NewAreaForm>(emptyAreaForm)
  const [formError, setFormError] = useState<string | null>(null)

  function openForm() {
    setShowAddForm(true)
    setForm(emptyAreaForm())
    setFormError(null)
  }

  function closeForm() {
    setShowAddForm(false)
    setForm(emptyAreaForm())
    setFormError(null)
  }

  function addArea() {
    const name = form.name.trim()
    const postcodeSectors = parsePostcodeSectors(form.postcodeSectors)

    if (!name) {
      setFormError(addForm.validation.nameRequired)
      return
    }
    if (postcodeSectors.length === 0) {
      setFormError(addForm.validation.postcodeRequired)
      return
    }

    onChange({
      areas: [
        ...values.areas,
        {
          id: `area-${Date.now()}`,
          name,
          postcodeSectors,
          notes: form.notes.trim(),
        },
      ],
    })
    closeForm()
    showToast(settingsContent.toasts.areaAdded)
  }

  function deleteArea(id: string) {
    onChange({
      areas: values.areas.filter((area) => area.id !== id),
    })
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="map-pin" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
            <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openForm}
          className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          {serviceArea.addArea}
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {showAddForm ? (
          <div className="rounded-xl border border-primary/20 bg-accent-surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">{addForm.title}</h3>

            <div className="mt-4 space-y-3">
              <Input
                inputSize="sm"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                  if (formError) setFormError(null)
                }}
                placeholder={addForm.fields.areaName.placeholder}
                aria-label={addForm.fields.areaName.label}
                className="rounded-lg bg-card"
                autoFocus
              />

              <Input
                inputSize="sm"
                value={form.postcodeSectors}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, postcodeSectors: event.target.value }))
                  if (formError) setFormError(null)
                }}
                placeholder={addForm.fields.postcodeSectors.placeholder}
                aria-label={addForm.fields.postcodeSectors.label}
                className="rounded-lg bg-card"
              />

              <Input
                inputSize="sm"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder={addForm.fields.notes.placeholder}
                aria-label={addForm.fields.notes.label}
                className="rounded-lg bg-card"
              />

              {formError ? <FieldError message={formError} size="sm" /> : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={addArea}
                  className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}
                >
                  {addForm.actions.confirm}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                >
                  {addForm.actions.cancel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {values.areas.map((area) => (
            <ServiceAreaCard
              key={area.id}
              area={area}
              linkedRoundsLabel={panelCopy.linkedRounds}
              linkedRounds={linkedRoundLabelsForArea(area.name)}
              deleteLabel={actions.delete}
              onDelete={() => deleteArea(area.id)}
            />
          ))}
        </ul>
      </div>
    </article>
  )
}

function ServiceAreaCard({
  area,
  linkedRoundsLabel,
  linkedRounds,
  deleteLabel,
  onDelete,
}: {
  area: ServiceArea
  linkedRoundsLabel: string
  linkedRounds: string[]
  deleteLabel: string
  onDelete: () => void
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{area.name}</h3>
        <button
          type="button"
          onClick={onDelete}
          aria-label={deleteLabel}
          className="-mt-0.5 -mr-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-danger"
        >
          <DashboardIcon name="trash" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {area.postcodeSectors.map((sector) => (
          <span
            key={sector}
            className="rounded-md bg-sidebar px-2 py-0.5 text-[11px] font-semibold tracking-wide text-sidebar-foreground uppercase"
          >
            {sector}
          </span>
        ))}
      </div>

      {area.notes ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{area.notes}</p>
      ) : null}

      {linkedRounds.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted">{linkedRoundsLabel}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {linkedRounds.map((round) => (
              <span key={round} className="text-sm font-medium text-primary">
                {round}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </li>
  )
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.31v2.44a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4a.75.75 0 0 0 0 1.5h2.31l-9.194 8.496a.75.75 0 0 0-.053 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const categoryTagClass: Record<string, string> = {
  'window-cleaning': 'bg-primary/10 text-primary',
  'exterior-cleaning': 'bg-accent-surface text-accent',
  'gutter-fascia': 'bg-warning-surface text-warning-foreground',
  specialist: 'bg-sidebar/10 text-sidebar',
}

function ServiceCataloguePanel({
  values,
  onChange,
}: {
  values: SettingsServiceCatalogue
  onChange: (values: SettingsServiceCatalogue) => void
}) {
  const { serviceCatalogue: panelCopy } = settingsContent
  const { serviceCatalogue } = setupWizardContent
  const { categories, columns, tags, actions } = serviceCatalogue
  const { showToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<CatalogueService | null>(null)

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.id !== 'all')
        .map((category) => ({ value: category.id, label: category.label })),
    [categories],
  )

  const categoryLabels = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.label])),
    [categories],
  )

  function toggleActive(id: string) {
    onChange({
      services: values.services.map((service) =>
        service.id === id ? { ...service, active: !service.active } : service,
      ),
    })
  }

  function deleteService(id: string) {
    onChange({
      services: values.services.filter((service) => service.id !== id),
    })
  }

  function openAddModal() {
    setEditingService(null)
    setModalOpen(true)
  }

  function openEditModal(service: CatalogueService) {
    setEditingService(service)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingService(null)
  }

  function saveService(service: CatalogueService) {
    const isEdit = values.services.some((item) => item.id === service.id)

    onChange({
      services: (() => {
        const next = isEdit
          ? values.services.map((item) => (item.id === service.id ? service : item))
          : [...values.services, service]

        if (!service.isDefault) return next

        return next.map((item) =>
          item.id === service.id ? item : { ...item, isDefault: false },
        )
      })(),
    })

    showToast(isEdit ? settingsContent.toasts.serviceUpdated : settingsContent.toasts.serviceAdded)
  }

  return (
    <>
      <article className={cn(cardClass, 'p-6')}>
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
              <DashboardIcon name="briefcase" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">{panelCopy.heading}</h2>
              <p className="mt-0.5 text-sm text-muted">{panelCopy.subheading}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
          >
            <DashboardIcon name="plus" className="h-4 w-4" />
            {serviceCatalogue.addService}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1fr_7rem_6rem_8.5rem] gap-4 border-b border-border bg-surface/80 px-5 py-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>{columns.service}</span>
            <span className="text-right">{columns.defaultPrice}</span>
            <span className="text-center">{columns.active}</span>
            <span />
          </div>

          <ul className="divide-y divide-border">
            {values.services.map((service) => (
              <li
                key={service.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_7rem_6rem_8.5rem] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{service.name}</span>
                    {service.isDefault ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        {tags.default}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        categoryTagClass[service.categoryId] ?? 'bg-primary/10 text-primary',
                      )}
                    >
                      {categoryLabels[service.categoryId]}
                    </span>
                  </div>
                  {service.description ? (
                    <p className="mt-1 text-sm text-muted">{service.description}</p>
                  ) : null}
                </div>

                <p className="font-semibold text-foreground sm:text-right">
                  {formatCurrency(service.price)}
                </p>

                <div className="flex sm:justify-center">
                  <Toggle
                    checked={service.active}
                    onChange={() => toggleActive(service.id)}
                    ariaLabel={`${service.name} active`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(service)}
                    className="rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent-surface"
                  >
                    {actions.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteService(service.id)}
                    className="rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/15"
                  >
                    {actions.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <AddServiceModal
        open={modalOpen}
        onClose={closeModal}
        onSave={saveService}
        editingService={editingService}
        categoryOptions={categoryOptions}
      />
    </>
  )
}

function SaveChangesButton({ onSave }: { onSave: () => void }) {
  const { showToast } = useToast()

  return (
    <button
      type="button"
      onClick={() => {
        onSave()
        showToast(settingsContent.toasts.saved)
      }}
      className={dashboardCtaClass}
    >
      {settingsContent.actions.save}
    </button>
  )
}
