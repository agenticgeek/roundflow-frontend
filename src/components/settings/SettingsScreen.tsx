import { useMemo, useState, type ReactNode } from 'react'
import type { SettingsSectionId } from '@/content/settings'
import { settingsContent } from '@/content/settings'
import { setupWizardContent } from '@/content/setup-wizard'
import type { CatalogueService } from '@/types/setup-wizard'
import {
  useBusinessProfile,
  useConnectPayment,
  useCreateService,
  useCreateServiceArea,
  useCreateTechnician,
  useDeleteService,
  useDeleteServiceArea,
  useDeleteTechnician,
  useMessageTemplates,
  usePaymentSettings,
  useRoundSettings,
  useServiceAreas,
  useServices,
  useTechnicians,
  useUpdateBusinessProfile,
  useUpdatePaymentSettings,
  useUpdateRoundSettings,
  useUpdateService,
  useUpdateTechnician,
} from '@/features/settings/hooks/useSettings'
import {
  catalogueServiceToInput,
  settingsBusinessFromForm,
  settingsBusinessToForm,
  settingsPaymentFromForm,
  settingsPaymentToForm,
  settingsRoundFromForm,
  settingsRoundToForm,
  settingsServiceAreasToRows,
  settingsServicesToCatalogue,
  settingsTechniciansToRows,
  type SettingsBusinessForm,
  type SettingsPaymentForm,
  type SettingsRoundForm,
  type SettingsServiceAreaRow,
  type SettingsTechnicianRow,
} from '@/features/settings/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { Field, FieldError, Input, Select, Toggle } from '@/components/ui'
import { DaySelector } from '@/components/setup-wizard/DaySelector'
import { AddServiceModal } from '@/components/setup-wizard/AddServiceModal'
import { useToast } from '@/components/ui/toast'
import {
  SettingsFormSkeleton,
  SettingsPaymentSkeleton,
  SettingsServiceAreasSkeleton,
  SettingsServicesSkeleton,
  SettingsSmsSkeleton,
  SettingsTechniciansSkeleton,
} from '@/components/settings/SettingsSkeletons'
import { cn, formatCurrency } from '@/lib/utils'

const cardClass = 'rounded-lg border border-border bg-card shadow-sm'
const settingsSelectClass = 'rounded-lg border-accent/25 bg-accent-surface'

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={cn(cardClass, 'p-6 text-sm')}>
      <p className="text-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-semibold text-primary underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  )
}

function MutationGate({
  canMutate,
  children,
  className,
}: {
  canMutate: boolean
  children: ReactNode
  className?: string
}) {
  if (canMutate) return <>{children}</>
  return (
    <div className={className} title="You don't have permission to edit settings">
      <div className="pointer-events-none opacity-60">{children}</div>
    </div>
  )
}

/** Settings module — sidebar navigation and section panels backed by the API. */
export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('business-profile')
  const { canMutate } = useAppBootstrap()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {settingsContent.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">{settingsContent.subtitle}</p>
        {!canMutate ? (
          <p className="mt-2 text-sm text-muted">
            You can view settings, but only admins and managers can make changes.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsSidebar
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <div key={activeSection} className="animate-wizard-step">
          {activeSection === 'business-profile' ? (
            <BusinessProfilePanel canMutate={canMutate} />
          ) : activeSection === 'payment-setup' ? (
            <PaymentSetupPanel canMutate={canMutate} />
          ) : activeSection === 'round-settings' ? (
            <RoundSettingsPanel canMutate={canMutate} />
          ) : activeSection === 'sms-templates' ? (
            <SmsTemplatesPanel />
          ) : activeSection === 'technician-management' ? (
            <TechnicianManagementPanel canMutate={canMutate} />
          ) : activeSection === 'service-area' ? (
            <ServiceAreasPanel canMutate={canMutate} />
          ) : (
            <ServiceCataloguePanel canMutate={canMutate} />
          )}
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
      <p className="px-2 text-sm font-semibold text-foreground">
        {settingsContent.sidebarTitle}
      </p>
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

function PanelHeader({
  icon,
  heading,
  subheading,
  editing,
  canMutate,
  onEdit,
}: {
  icon: string
  heading: string
  subheading: string
  editing: boolean
  canMutate: boolean
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
          <DashboardIcon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{heading}</h2>
          <p className="mt-0.5 text-sm text-muted">{subheading}</p>
        </div>
      </div>
      {!editing && canMutate ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(dashboardCtaClass, 'px-4 py-2 text-sm')}
        >
          {settingsContent.actions.edit}
        </button>
      ) : null}
    </div>
  )
}

function SaveBar({
  onSave,
  onCancel,
  pending,
  disabled,
}: {
  onSave: () => void
  onCancel: () => void
  pending: boolean
  disabled?: boolean
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={pending || disabled}
        className={cn(dashboardCtaClass, 'disabled:cursor-not-allowed disabled:opacity-60')}
      >
        {pending ? 'Saving…' : settingsContent.actions.save}
      </button>
    </div>
  )
}

function BusinessProfilePanel({ canMutate }: { canMutate: boolean }) {
  const query = useBusinessProfile()
  const update = useUpdateBusinessProfile()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SettingsBusinessForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (query.isPending) return <SettingsFormSkeleton />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load business profile."
        onRetry={() => query.refetch()}
      />
    )
  }

  const values = draft ?? settingsBusinessToForm(query.data)

  function updateField<K extends keyof SettingsBusinessForm>(
    key: K,
    value: SettingsBusinessForm[K],
  ) {
    setDraft({ ...values, [key]: value })
  }

  function startEdit() {
    setDraft(settingsBusinessToForm(query.data))
    setEditing(true)
    setFormError(null)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
    setFormError(null)
  }

  async function save() {
    if (!canMutate) return
    setFormError(null)
    try {
      await update.mutateAsync(settingsBusinessFromForm(values))
      setDraft(null)
      setEditing(false)
      showToast(settingsContent.toasts.saved)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError(error.message)
        return
      }
      throw error
    }
  }

  const { fields, timezones, currencies } = setupWizardContent.businessProfile

  return (
    <article className={cn(cardClass, 'p-6')}>
      <PanelHeader
        icon="file"
        heading={settingsContent.businessProfile.heading}
        subheading={settingsContent.businessProfile.subheading}
        editing={editing}
        canMutate={canMutate}
        onEdit={startEdit}
      />

      <div className="mt-6 space-y-5">
        <Field label={fields.businessName.label} required labelWeight="medium">
          <Input
            value={values.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
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
              onChange={(e) => updateField('businessPhone', e.target.value)}
              placeholder={fields.businessPhone.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>
          <Field label={fields.businessEmail.label} required labelWeight="medium">
            <Input
              type="email"
              value={values.businessEmail}
              onChange={(e) => updateField('businessEmail', e.target.value)}
              placeholder={fields.businessEmail.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.companyNumber.label} labelWeight="medium">
            <Input
              value={values.companyNumber}
              onChange={(e) => updateField('companyNumber', e.target.value)}
              placeholder={fields.companyNumber.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>
          <Field label={fields.vatNumber.label} labelWeight="medium">
            <Input
              value={values.vatNumber}
              onChange={(e) => updateField('vatNumber', e.target.value)}
              placeholder={fields.vatNumber.placeholder}
              readOnly={!editing}
              className={cn(!editing && 'bg-surface')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fields.timezone.label} labelWeight="medium">
            <Select
              value={values.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              options={timezones}
              disabled={!editing}
              className={settingsSelectClass}
            />
          </Field>
          <Field label={fields.currency.label} labelWeight="medium">
            <Select
              value={values.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              options={currencies}
              disabled={!editing}
              className={settingsSelectClass}
            />
          </Field>
        </div>

        {formError ? <FieldError message={formError} /> : null}
      </div>

      {editing ? (
        <SaveBar
          onSave={save}
          onCancel={cancelEdit}
          pending={update.isPending}
        />
      ) : null}
    </article>
  )
}

function PaymentSetupPanel({ canMutate }: { canMutate: boolean }) {
  const query = usePaymentSettings()
  const update = useUpdatePaymentSettings()
  const connect = useConnectPayment()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SettingsPaymentForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (query.isPending) return <SettingsPaymentSkeleton />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load payment settings."
        onRetry={() => query.refetch()}
      />
    )
  }

  const values = draft ?? settingsPaymentToForm(query.data)
  const { providers, settings, status } = setupWizardContent.paymentSetup

  function updateField<K extends keyof SettingsPaymentForm>(
    key: K,
    value: SettingsPaymentForm[K],
  ) {
    setDraft({ ...values, [key]: value })
  }

  function startEdit() {
    setDraft(settingsPaymentToForm(query.data))
    setEditing(true)
    setFormError(null)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
    setFormError(null)
  }

  async function save() {
    if (!canMutate) return
    setFormError(null)
    try {
      await update.mutateAsync(settingsPaymentFromForm(values))
      setDraft(null)
      setEditing(false)
      showToast(settingsContent.toasts.saved)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError(error.message)
        return
      }
      throw error
    }
  }

  async function handleConnect(providerId: 'gocardless' | 'stripe') {
    if (!canMutate) return
    await connect.mutateAsync(providerId)
    showToast(providerId === 'gocardless' ? 'GoCardless connected' : 'Stripe connected')
  }

  const connectionMap = {
    gocardless: values.goCardlessConnected,
    stripe: values.stripeConnected,
  } as const

  return (
    <article className={cn(cardClass, 'p-6')}>
      <PanelHeader
        icon="card"
        heading={settingsContent.paymentSetup.heading}
        subheading={settingsContent.paymentSetup.subheading}
        editing={editing}
        canMutate={canMutate}
        onEdit={startEdit}
      />

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
              <MutationGate canMutate={canMutate}>
                <button
                  type="button"
                  onClick={() => handleConnect(provider.id)}
                  disabled={connected || connect.isPending}
                  className={cn(
                    'mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
                    connected
                      ? 'cursor-not-allowed border-border text-muted'
                      : 'border-primary/30 text-primary hover:bg-accent-surface',
                  )}
                >
                  {provider.connectLabel}
                </button>
              </MutationGate>
            </div>
          )
        })}
      </div>

      <div className={cn('mt-6 space-y-5', !editing && 'pointer-events-none')}>
        <Field label={settings.defaultPaymentRule.label} labelWeight="medium">
          <Select
            value={values.defaultPaymentRule}
            onChange={(e) => updateField('defaultPaymentRule', e.target.value)}
            options={[...setupWizardContent.paymentSetup.paymentRules]}
            disabled={!editing}
            className={settingsSelectClass}
          />
        </Field>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{settings.vatApplicable.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.vatApplicable.description}</p>
          </div>
          <Toggle
            checked={values.vatApplicable}
            onChange={(vatApplicable) => updateField('vatApplicable', vatApplicable)}
            ariaLabel={settings.vatApplicable.label}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{settings.debtHoldEnabled.label}</p>
            <p className="mt-0.5 text-sm text-muted">{settings.debtHoldEnabled.description}</p>
          </div>
          <Toggle
            checked={values.debtHoldEnabled}
            onChange={(debtHoldEnabled) => updateField('debtHoldEnabled', debtHoldEnabled)}
            ariaLabel={settings.debtHoldEnabled.label}
          />
        </div>

        {formError ? <FieldError message={formError} /> : null}
      </div>

      {editing ? (
        <SaveBar onSave={save} onCancel={cancelEdit} pending={update.isPending} />
      ) : null}
    </article>
  )
}

function RoundSettingsPanel({ canMutate }: { canMutate: boolean }) {
  const query = useRoundSettings()
  const update = useUpdateRoundSettings()
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SettingsRoundForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (query.isPending) return <SettingsFormSkeleton fields={2} />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load round settings."
        onRetry={() => query.refetch()}
      />
    )
  }

  const values = draft ?? settingsRoundToForm(query.data)
  const { fields, recurringCycles, days } = {
    fields: setupWizardContent.roundSettings.fields,
    recurringCycles: setupWizardContent.roundSettings.recurringCycles,
    days: setupWizardContent.businessProfile.days,
  }

  function startEdit() {
    setDraft(settingsRoundToForm(query.data))
    setEditing(true)
    setFormError(null)
  }

  function cancelEdit() {
    setDraft(null)
    setEditing(false)
    setFormError(null)
  }

  async function save() {
    if (!canMutate) return
    setFormError(null)
    try {
      await update.mutateAsync(settingsRoundFromForm(values))
      setDraft(null)
      setEditing(false)
      showToast(settingsContent.toasts.saved)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError(error.message)
        return
      }
      throw error
    }
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <PanelHeader
        icon="refresh"
        heading={settingsContent.roundSettings.heading}
        subheading={settingsContent.roundSettings.subheading}
        editing={editing}
        canMutate={canMutate}
        onEdit={startEdit}
      />

      <div className={cn('mt-6 space-y-6', !editing && 'pointer-events-none')}>
        <div>
          <p className="mb-2.5 text-sm font-medium text-muted">{fields.recurringCycle.label}</p>
          <div
            role="radiogroup"
            aria-label={fields.recurringCycle.label}
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {recurringCycles.map((option) => {
              const active = values.recurringCycle === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDraft({ ...values, recurringCycle: option.id })}
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

        <Field label={setupWizardContent.businessProfile.fields.workingDays.label} labelWeight="medium">
          <DaySelector
            days={days}
            selected={values.workingDays}
            onChange={(workingDays) => setDraft({ ...values, workingDays })}
          />
        </Field>

        {formError ? <FieldError message={formError} /> : null}
      </div>

      {editing ? (
        <SaveBar onSave={save} onCancel={cancelEdit} pending={update.isPending} />
      ) : null}
    </article>
  )
}

function SmsTemplatesPanel() {
  const query = useMessageTemplates()
  const templates = setupWizardContent.smsTemplates.defaults.templates

  if (query.isPending) return <SettingsSmsSkeleton />

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
          <DashboardIcon name="message" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {settingsContent.smsTemplates.heading}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {settingsContent.smsTemplates.subheading}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-primary/20 bg-accent-surface px-4 py-3 text-sm text-foreground">
        Message templates are managed in GoHighLevel for now.
        {query.data?.reason ? ` ${query.data.reason}` : null}
        {' '}Editing here is disabled until the messaging API ships.
      </div>

      <ul className="mt-5 space-y-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <p className="text-sm font-semibold text-foreground">{template.name}</p>
            <p className="mt-1 text-sm text-muted line-clamp-2">{template.body}</p>
          </li>
        ))}
      </ul>
    </article>
  )
}

function TechnicianManagementPanel({ canMutate }: { canMutate: boolean }) {
  const query = useTechnicians()
  const create = useCreateTechnician()
  const update = useUpdateTechnician()
  const remove = useDeleteTechnician()
  const { showToast } = useToast()
  const { addForm, columns, appStatusLabels, roleOptions, actions, addTechnician: addTechnicianLabel } =
    setupWizardContent.technicianManagement

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', mobile: '', role: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const technicians = useMemo(
    () => settingsTechniciansToRows(query.data),
    [query.data],
  )

  if (query.isPending) return <SettingsTechniciansSkeleton />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load technicians."
        onRetry={() => query.refetch()}
      />
    )
  }

  async function addTechnicianSubmit() {
    if (!canMutate) return
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
    setFormError(null)
    await create.mutateAsync({
      name: fullName,
      phone: mobile,
      role: form.role || undefined,
      active: true,
    })
    setForm({ fullName: '', mobile: '', role: '' })
    setShowAddForm(false)
    showToast(settingsContent.toasts.technicianAdded)
  }

  async function handleRemoveOrDeactivate(technician: SettingsTechnicianRow) {
    if (!canMutate) return
    if (technician.profileId) {
      await update.mutateAsync({ id: technician.id, input: { active: false } })
    } else {
      await remove.mutateAsync(technician.id)
    }
    setOpenMenuId(null)
  }

  const pending =
    create.isPending || update.isPending || remove.isPending

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="technicians" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {settingsContent.technicianManagement.heading}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {settingsContent.technicianManagement.subheading}
            </p>
          </div>
        </div>
        <MutationGate canMutate={canMutate}>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={pending}
            className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
          >
            <DashboardIcon name="plus" className="h-4 w-4" />
            {addTechnicianLabel}
          </button>
        </MutationGate>
      </div>

      <div className="mt-6 space-y-5">
        {showAddForm && canMutate ? (
          <div className="rounded-xl border border-primary/20 bg-accent-surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">{addForm.title}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={addForm.fields.fullName.label} required labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder={addForm.fields.fullName.placeholder}
                  className="rounded-lg bg-card"
                />
              </Field>
              <Field label={addForm.fields.mobile.label} required labelWeight="medium" size="sm">
                <Input
                  inputSize="sm"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                  placeholder={addForm.fields.mobile.placeholder}
                  className="rounded-lg bg-card"
                />
              </Field>
              <Field label={addForm.fields.role.label} labelWeight="medium" size="sm">
                <Select
                  inputSize="sm"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  options={[...roleOptions]}
                  className={cn(settingsSelectClass, 'bg-card')}
                />
              </Field>
            </div>
            {formError ? <FieldError message={formError} size="sm" /> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addTechnicianSubmit}
                disabled={create.isPending}
                className={cn(dashboardCtaClass, 'px-4 py-2 text-sm disabled:opacity-60')}
              >
                {create.isPending ? 'Adding…' : addForm.actions.confirm}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setFormError(null)
                }}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
              >
                {addForm.actions.cancel}
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.9fr_3rem] gap-4 border-b border-border bg-surface/80 px-4 py-2.5 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>{columns.name}</span>
            <span>{columns.phone}</span>
            <span>{columns.role}</span>
            <span>{columns.appStatus}</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {technicians.map((technician) => (
              <li
                key={technician.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr_0.9fr_3rem] sm:items-center"
              >
                <span className="font-semibold text-foreground">{technician.displayName}</span>
                <span className="text-sm text-muted">{technician.phone || '—'}</span>
                <span className="text-sm text-muted">{technician.role || '—'}</span>
                <span className="text-sm text-muted">
                  {appStatusLabels[technician.appStatus]}
                </span>
                <div className="relative justify-self-end">
                  {canMutate && technician.appStatus !== 'inactive' ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId((id) =>
                            id === technician.id ? null : technician.id,
                          )
                        }
                        className="rounded-md p-1 text-muted hover:bg-surface"
                        aria-label={actions.moreOptions}
                        disabled={pending}
                      >
                        ···
                      </button>
                      {openMenuId === technician.id ? (
                        <div className="absolute right-0 z-10 mt-1 min-w-[9rem] rounded-lg border border-border bg-card p-1 shadow-md">
                          <button
                            type="button"
                            onClick={() => handleRemoveOrDeactivate(technician)}
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                          >
                            {technician.profileId ? 'Deactivate' : actions.delete}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

function parsePostcodeSectors(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((sector) => sector.trim().toUpperCase())
    .filter(Boolean)
}

function ServiceAreasPanel({ canMutate }: { canMutate: boolean }) {
  const query = useServiceAreas()
  const create = useCreateServiceArea()
  const remove = useDeleteServiceArea()
  const { showToast } = useToast()
  const { addForm, actions } = setupWizardContent.serviceArea

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', postcodeSectors: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const areas = useMemo(() => settingsServiceAreasToRows(query.data), [query.data])

  if (query.isPending) return <SettingsServiceAreasSkeleton />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load service areas."
        onRetry={() => query.refetch()}
      />
    )
  }

  async function addArea() {
    if (!canMutate) return
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
    setFormError(null)
    await create.mutateAsync({
      name,
      postcodeSector: postcodeSectors.join(','),
      isDefault: areas.length === 0,
    })
    setForm({ name: '', postcodeSectors: '' })
    setShowAddForm(false)
    showToast(settingsContent.toasts.areaAdded)
  }

  async function deleteArea(area: SettingsServiceAreaRow) {
    if (!canMutate || (area.linkedRounds.count ?? 0) > 0) return
    try {
      await remove.mutateAsync(area.id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast('This service area no longer exists.')
        query.refetch()
        return
      }
      throw error
    }
  }

  return (
    <article className={cn(cardClass, 'p-6')}>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
            <DashboardIcon name="map-pin" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {settingsContent.serviceArea.heading}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {settingsContent.serviceArea.subheading}
            </p>
          </div>
        </div>
        <MutationGate canMutate={canMutate}>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={create.isPending}
            className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
          >
            <DashboardIcon name="plus" className="h-4 w-4" />
            {setupWizardContent.serviceArea.addArea}
          </button>
        </MutationGate>
      </div>

      <div className="mt-6 space-y-5">
        {showAddForm && canMutate ? (
          <div className="rounded-xl border border-primary/20 bg-accent-surface p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">{addForm.title}</h3>
            <div className="mt-4 space-y-3">
              <Input
                inputSize="sm"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={addForm.fields.areaName.placeholder}
                className="rounded-lg bg-card"
              />
              <Input
                inputSize="sm"
                value={form.postcodeSectors}
                onChange={(e) =>
                  setForm((p) => ({ ...p, postcodeSectors: e.target.value }))
                }
                placeholder={addForm.fields.postcodeSectors.placeholder}
                className="rounded-lg bg-card"
              />
              {formError ? <FieldError message={formError} size="sm" /> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addArea}
                  disabled={create.isPending}
                  className={cn(dashboardCtaClass, 'px-4 py-2 text-sm disabled:opacity-60')}
                >
                  {create.isPending ? 'Adding…' : addForm.actions.confirm}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
                >
                  {addForm.actions.cancel}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => {
            const linked = area.linkedRounds.count > 0
            return (
              <li
                key={area.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{area.name}</h3>
                  {canMutate ? (
                    <button
                      type="button"
                      onClick={() => deleteArea(area)}
                      disabled={linked || remove.isPending}
                      title={
                        linked
                          ? 'Cannot delete: linked to one or more rounds'
                          : actions.delete
                      }
                      aria-label={actions.delete}
                      className={cn(
                        '-mt-0.5 -mr-0.5 shrink-0 rounded-md p-1 transition-colors',
                        linked
                          ? 'cursor-not-allowed text-muted/40'
                          : 'text-muted hover:bg-surface hover:text-danger',
                      )}
                    >
                      <DashboardIcon name="trash" className="h-4 w-4" />
                    </button>
                  ) : null}
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
                <p className="mt-3 text-xs text-muted">
                  {settingsContent.serviceArea.linkedRounds}{' '}
                  {linked ? area.linkedRounds.names.join(', ') : 'None'}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}

const categoryTagClass: Record<string, string> = {
  'window-cleaning': 'bg-primary/10 text-primary',
  'exterior-cleaning': 'bg-accent-surface text-accent',
  'gutter-fascia': 'bg-warning-surface text-warning-foreground',
  specialist: 'bg-success/10 text-success',
}

function ServiceCataloguePanel({ canMutate }: { canMutate: boolean }) {
  const query = useServices()
  const create = useCreateService()
  const update = useUpdateService()
  const remove = useDeleteService()
  const { showToast } = useToast()
  const { categories, columns, tags, actions, addService } =
    setupWizardContent.serviceCatalogue

  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<CatalogueService | null>(null)

  const services = useMemo(
    () => settingsServicesToCatalogue(query.data),
    [query.data],
  )

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.id !== 'all')
        .map((category) => ({ value: category.id, label: category.label })),
    [categories],
  )

  const categoryLabels = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.label])),
    [categories],
  )

  if (query.isPending) return <SettingsServicesSkeleton />
  if (query.isError) {
    return (
      <SectionError
        message="Could not load services."
        onRetry={() => query.refetch()}
      />
    )
  }

  async function saveService(service: CatalogueService) {
    if (!canMutate) return
    const isEdit = services.some((item) => item.id === service.id)
    const input = catalogueServiceToInput(service)
    if (isEdit) {
      await update.mutateAsync({ id: service.id, input })
      showToast(settingsContent.toasts.serviceUpdated)
    } else {
      await create.mutateAsync(input)
      showToast(settingsContent.toasts.serviceAdded)
    }
  }

  async function toggleActive(service: CatalogueService) {
    if (!canMutate) return
    await update.mutateAsync({
      id: service.id,
      input: { active: !service.active },
    })
  }

  async function deleteService(id: string) {
    if (!canMutate) return
    try {
      await remove.mutateAsync(id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast('This service no longer exists.')
        query.refetch()
        return
      }
      throw error
    }
  }

  const pending = create.isPending || update.isPending || remove.isPending

  return (
    <>
      <article className={cn(cardClass, 'p-6')}>
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-surface text-accent">
              <DashboardIcon name="briefcase" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {settingsContent.serviceCatalogue.heading}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {settingsContent.serviceCatalogue.subheading}
              </p>
            </div>
          </div>
          <MutationGate canMutate={canMutate}>
            <button
              type="button"
              onClick={() => {
                setEditingService(null)
                setModalOpen(true)
              }}
              disabled={pending}
              className={cn(dashboardCtaClass, 'shrink-0 px-4 py-2 text-sm')}
            >
              <DashboardIcon name="plus" className="h-4 w-4" />
              {addService}
            </button>
          </MutationGate>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1fr_7rem_6rem_8.5rem] gap-4 border-b border-border bg-surface/80 px-5 py-3 text-xs font-medium tracking-wide text-muted uppercase sm:grid">
            <span>{columns.service}</span>
            <span className="text-right">{columns.defaultPrice}</span>
            <span className="text-center">{columns.active}</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {services.map((service) => (
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
                  <MutationGate canMutate={canMutate}>
                    <Toggle
                      checked={service.active}
                      onChange={() => toggleActive(service)}
                      ariaLabel={`${service.name} active`}
                    />
                  </MutationGate>
                </div>
                <div className="flex items-center gap-2">
                  {canMutate ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(service)
                          setModalOpen(true)
                        }}
                        disabled={pending}
                        className="rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent-surface disabled:opacity-60"
                      >
                        {actions.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteService(service.id)}
                        disabled={pending}
                        className="rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/15 disabled:opacity-60"
                      >
                        {actions.delete}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <AddServiceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingService(null)
        }}
        onSave={saveService}
        editingService={editingService}
        categoryOptions={categoryOptions}
      />
    </>
  )
}
