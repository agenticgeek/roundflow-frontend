import { useNavigate } from 'react-router-dom'
import { SETUP_STEPS } from '@/config/setup-wizard'
import { ROUTES } from '@/config/routes'
import { setupWizardContent } from '@/content/setup-wizard'
import { useSetupWizard } from '@/hooks/use-setup-wizard'
import { markSetupComplete, markSetupSkipped } from '@/lib/setup-storage'
import type { BusinessProfileData, PaymentSetupData, RoundSettingsData, ServiceCatalogueData, ServiceAreaData, SmsTemplatesData, TechnicianManagementData, AssignRoundData, AssignTechniciansData, AddPropertyData, ActivateSystemData, SetupStepId } from '@/types/setup-wizard'
import { buildRoundSelectOptions, buildServiceAreaSelectOptions, buildWizardRounds } from '@/lib/setup-wizard-options'
import { SetupBanner } from '@/components/setup-wizard/SetupBanner'
import { SetupWizardFooter } from '@/components/setup-wizard/SetupWizardFooter'
import { SetupStepPanel } from '@/components/setup-wizard/SetupStepPanel'
import { PlaceholderStep } from '@/components/setup-wizard/PlaceholderStep'
import { BusinessProfileStep } from '@/components/setup-wizard/steps/BusinessProfileStep'
import { PaymentSetupStep } from '@/components/setup-wizard/steps/PaymentSetupStep'
import { ServiceCatalogueStep } from '@/components/setup-wizard/steps/ServiceCatalogueStep'
import { RoundSettingsStep } from '@/components/setup-wizard/steps/RoundSettingsStep'
import { SmsTemplatesStep } from '@/components/setup-wizard/steps/SmsTemplatesStep'
import { TechnicianManagementStep } from '@/components/setup-wizard/steps/TechnicianManagementStep'
import { ServiceAreaStep } from '@/components/setup-wizard/steps/ServiceAreaStep'
import { AssignRoundStep } from '@/components/setup-wizard/steps/AssignRoundStep'
import { AssignTechniciansStep } from '@/components/setup-wizard/steps/AssignTechniciansStep'
import { AddPropertyStep } from '@/components/setup-wizard/steps/AddPropertyStep'
import { ActivateSystemStep } from '@/components/setup-wizard/steps/ActivateSystemStep'
import { ReviewLaunchStep } from '@/components/setup-wizard/steps/ReviewLaunchStep'

/** Steps that submit via `#setup-wizard-step-form` when Continue is pressed. */
const FORM_STEP_IDS = new Set<SetupStepId>([
  'business-profile',
  'payment-setup',
  'service-catalogue',
  'round-settings',
  'sms-templates',
  'technician-management',
  'service-area',
  'assign-round',
  'assign-technicians',
  'add-properties',
  'activate-system',
])

export default function SetupWizard() {
  const navigate = useNavigate()
  const { stepIndex, data, isFirstStep, isLastStep, next, back, saveStep } = useSetupWizard()
  const currentStep = SETUP_STEPS[stepIndex]
  const { businessProfile, paymentSetup, serviceCatalogue, roundSettings, smsTemplates, technicianManagement, serviceArea, assignRound, assignTechnicians, addProperty, activateSystem } =
    setupWizardContent

  const serviceAreaOptions = buildServiceAreaSelectOptions(
    data['service-area']?.areas ?? serviceArea.defaults.areas,
  )
  const roundOptions = buildRoundSelectOptions(
    data['assign-round']?.assignments ?? assignRound.defaults.assignments,
    assignRound.roundDays,
  )
  const technicians = data['technician-management']?.technicians ?? technicianManagement.defaults.technicians
  const assignTechniciansInitialValues: AssignTechniciansData = {
    rounds: buildWizardRounds(
      data['assign-round']?.assignments ?? assignRound.defaults.assignments,
      assignRound.roundDays,
      data['assign-technicians']?.rounds ?? assignTechnicians.defaults.rounds,
    ),
  }

  function handleBusinessProfileSubmit(values: BusinessProfileData) {
    saveStep('business-profile', values)
    next()
  }

  function handlePaymentSetupSubmit(values: PaymentSetupData) {
    saveStep('payment-setup', values)
    next()
  }

  function handleServiceCatalogueSubmit(values: ServiceCatalogueData) {
    saveStep('service-catalogue', values)
    next()
  }

  function handleRoundSettingsSubmit(values: RoundSettingsData) {
    saveStep('round-settings', values)
    next()
  }

  function handleSmsTemplatesSubmit(values: SmsTemplatesData) {
    saveStep('sms-templates', values)
    next()
  }

  function handleTechnicianManagementSubmit(values: TechnicianManagementData) {
    saveStep('technician-management', values)
    next()
  }

  function handleServiceAreaSubmit(values: ServiceAreaData) {
    saveStep('service-area', values)
    next()
  }

  function handleAssignRoundSubmit(values: AssignRoundData) {
    saveStep('assign-round', values)
    next()
  }

  function handleAssignTechniciansSubmit(values: AssignTechniciansData) {
    saveStep('assign-technicians', values)
    next()
  }

  function handleAddPropertySubmit(values: AddPropertyData) {
    saveStep('add-properties', values)
    next()
  }

  function handleActivateSystemSubmit(values: ActivateSystemData) {
    saveStep('activate-system', values)
    next()
  }

  function handleContinue() {
    if (FORM_STEP_IDS.has(currentStep.id)) {
      const form = document.getElementById('setup-wizard-step-form')
      if (form instanceof HTMLFormElement) form.requestSubmit()
      return
    }

    if (isLastStep) {
      markSetupComplete()
      navigate(ROUTES.dashboard, { replace: true })
      return
    }

    next()
  }

  function handleSkip() {
    markSetupSkipped()
    navigate(ROUTES.dashboard, { replace: true })
  }

  function renderStep() {
    switch (currentStep.id) {
      case 'business-profile':
        return (
          <BusinessProfileStep
            initialValues={data['business-profile'] ?? businessProfile.defaults}
            onSubmit={handleBusinessProfileSubmit}
          />
        )
      case 'payment-setup':
        return (
          <PaymentSetupStep
            initialValues={data['payment-setup'] ?? paymentSetup.defaults}
            onSubmit={handlePaymentSetupSubmit}
          />
        )
      case 'service-catalogue':
        return (
          <ServiceCatalogueStep
            initialValues={data['service-catalogue'] ?? serviceCatalogue.defaults}
            onSubmit={handleServiceCatalogueSubmit}
          />
        )
      case 'round-settings':
        return (
          <RoundSettingsStep
            initialValues={data['round-settings'] ?? roundSettings.defaults}
            onSubmit={handleRoundSettingsSubmit}
          />
        )
      case 'sms-templates':
        return (
          <SmsTemplatesStep
            initialValues={data['sms-templates'] ?? smsTemplates.defaults}
            onSubmit={handleSmsTemplatesSubmit}
          />
        )
      case 'technician-management':
        return (
          <TechnicianManagementStep
            initialValues={data['technician-management'] ?? technicianManagement.defaults}
            onSubmit={handleTechnicianManagementSubmit}
          />
        )
      case 'service-area':
        return (
          <ServiceAreaStep
            initialValues={data['service-area'] ?? serviceArea.defaults}
            onSubmit={handleServiceAreaSubmit}
          />
        )
      case 'assign-round':
        return (
          <AssignRoundStep
            initialValues={data['assign-round'] ?? assignRound.defaults}
            onSubmit={handleAssignRoundSubmit}
          />
        )
      case 'assign-technicians':
        return (
          <AssignTechniciansStep
            initialValues={assignTechniciansInitialValues}
            technicians={technicians}
            roundDays={assignRound.roundDays}
            onSubmit={handleAssignTechniciansSubmit}
          />
        )
      case 'add-properties':
        return (
          <AddPropertyStep
            initialValues={data['add-properties'] ?? addProperty.defaults}
            serviceAreaOptions={serviceAreaOptions}
            roundOptions={roundOptions}
            onSubmit={handleAddPropertySubmit}
          />
        )
      case 'activate-system':
        return (
          <ActivateSystemStep
            initialValues={data['activate-system'] ?? activateSystem.defaults}
            onSubmit={handleActivateSystemSubmit}
          />
        )
      case 'review-launch':
        return <ReviewLaunchStep wizardData={data} />
      default:
        return <PlaceholderStep />
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SetupBanner currentIndex={stepIndex} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="p-6 sm:p-8">
          <SetupStepPanel stepKey={currentStep.id}>{renderStep()}</SetupStepPanel>

          <SetupWizardFooter
            currentStep={stepIndex + 1}
            totalSteps={SETUP_STEPS.length}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            onBack={back}
            onContinue={handleContinue}
            onSkip={handleSkip}
          />
        </div>
      </div>
    </div>
  )
}
