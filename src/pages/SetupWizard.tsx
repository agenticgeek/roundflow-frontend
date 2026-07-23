import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SETUP_STEPS, SETUP_STEP_COUNT } from '@/config/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { ROUTES } from '@/config/routes'
import { FirstRoundStep } from '@/features/setup/components/FirstRoundStep'
import {
  businessProfileFromForm,
  businessProfileToForm,
  firstRoundFromForm,
  firstRoundToForm,
  paymentSetupFromForm,
  paymentSetupToForm,
  pendingTechniciansFromForm,
  propertyDraftToStep9Input,
  roundSettingsFromForm,
  roundSettingsToForm,
  serviceAreasFromForm,
  serviceAreasToForm,
  servicesFromForm,
  servicesToForm,
  step9BundlesToRecords,
  step10FromForm,
  step10ToForm,
  step11FromForm,
  step11ToForm,
  techniciansForAssignStep,
  techniciansToForm,
} from '@/features/setup/lib/mappers'
import { stepCompletionFlags } from '@/features/setup/lib/wizard'
import { useWizardStep } from '@/features/setup/hooks/useWizardStep'
import {
  useCompleteSetup,
  useSaveStep1,
  useSaveStep2,
  useSaveStep3,
  useSaveStep4,
  useSaveStep5,
  useSaveStep6,
  useSaveStep7,
  useSaveStep8,
  useSaveStep9,
  useSaveStep10,
  useSaveStep11,
  useSetupStep1,
  useSetupStep2,
  useSetupStep3,
  useSetupStep4,
  useSetupStep6,
  useSetupStep7,
  useSetupStep8,
  useSetupStep9,
  useSetupStep10,
  useSetupStep11,
  useSetupStep12,
  useSetupStatus,
} from '@/features/setup/hooks/useSetup'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError, errorMessage } from '@/lib/errors'
import { deferSetup } from '@/lib/setup-deferred'
import {
  BulkReplaceConfirmModal,
  type BulkReplaceTarget,
} from '@/components/setup-wizard/BulkReplaceConfirmModal'
import { SetupBanner } from '@/components/setup-wizard/SetupBanner'
import { SetupWizardFooter } from '@/components/setup-wizard/SetupWizardFooter'
import { SetupStepPanel } from '@/components/setup-wizard/SetupStepPanel'
import {
  WizardCardsSkeleton,
  WizardFormSkeleton,
  WizardListSkeleton,
} from '@/components/setup-wizard/WizardSkeletons'
import { BusinessProfileStep } from '@/components/setup-wizard/steps/BusinessProfileStep'
import { PaymentSetupStep } from '@/components/setup-wizard/steps/PaymentSetupStep'
import { ServiceCatalogueStep } from '@/components/setup-wizard/steps/ServiceCatalogueStep'
import { RoundSettingsStep } from '@/components/setup-wizard/steps/RoundSettingsStep'
import { SmsTemplatesStep } from '@/components/setup-wizard/steps/SmsTemplatesStep'
import { TechnicianManagementStep } from '@/components/setup-wizard/steps/TechnicianManagementStep'
import { ServiceAreaStep } from '@/components/setup-wizard/steps/ServiceAreaStep'
import { AddPropertyStep } from '@/components/setup-wizard/steps/AddPropertyStep'
import { AssignTechniciansStep } from '@/components/setup-wizard/steps/AssignTechniciansStep'
import { ActivateSystemStep } from '@/components/setup-wizard/steps/ActivateSystemStep'
import { ReviewLaunchStep } from '@/components/setup-wizard/steps/ReviewLaunchStep'
import type {
  ActivateSystemData,
  AssignTechniciansData,
  BusinessProfileData,
  PaymentSetupData,
  PropertyDraft,
  RoundSettingsData,
  ServiceAreaData,
  ServiceCatalogueData,
  TechnicianManagementData,
} from '@/types/setup-wizard'
import type { FirstRoundFormValues } from '@/features/setup/lib/mappers'

const FORM_STEP_NUMBERS = new Set([1, 2, 3, 4, 6, 7, 8, 9, 10, 11])

const ROUND_DAY_OPTIONS = [
  { value: '', label: 'Select day' },
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

type PendingBulkReplace = {
  target: BulkReplaceTarget
  values: unknown
}

function StepError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-6 text-sm">
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

export default function SetupWizard() {
  const navigate = useNavigate()
  const { setupStatus, canMutate } = useAppBootstrap()
  const { step, stepIndex, goNext, goBack, skipStep, isFirstStep, isLastStep } = useWizardStep()
  const currentStep = SETUP_STEPS[stepIndex]
  const completedSteps = stepCompletionFlags(setupStatus, SETUP_STEP_COUNT)

  const step1 = useSetupStep1(step === 1)
  const step2 = useSetupStep2(step === 2)
  const step3 = useSetupStep3(step === 3 || step === 9)
  const step4 = useSetupStep4(step === 4)
  const step6 = useSetupStep6(step === 6 || step === 10)
  const step7 = useSetupStep7(step === 7 || step === 8 || step === 9)
  const step8 = useSetupStep8(step === 8 || step === 9 || step === 11)
  const step9 = useSetupStep9(step === 9)
  const step10 = useSetupStep10(step === 10 || step === 11)
  const step11 = useSetupStep11(step === 11)
  const step12 = useSetupStep12(step === 12)
  const statusQuery = useSetupStatus()

  const saveStep1 = useSaveStep1()
  const saveStep2 = useSaveStep2()
  const saveStep3 = useSaveStep3()
  const saveStep4 = useSaveStep4()
  const saveStep5 = useSaveStep5()
  const saveStep6 = useSaveStep6()
  const saveStep7 = useSaveStep7()
  const saveStep8 = useSaveStep8()
  const saveStep9 = useSaveStep9()
  const saveStep10 = useSaveStep10()
  const saveStep11 = useSaveStep11()
  const completeSetup = useCompleteSetup()

  const [formError, setFormError] = useState<string | null>(null)
  const [pendingBulkReplace, setPendingBulkReplace] = useState<PendingBulkReplace | null>(null)

  const pendingMutation =
    saveStep1.isPending ||
    saveStep2.isPending ||
    saveStep3.isPending ||
    saveStep4.isPending ||
    saveStep5.isPending ||
    saveStep6.isPending ||
    saveStep7.isPending ||
    saveStep8.isPending ||
    saveStep9.isPending ||
    saveStep10.isPending ||
    saveStep11.isPending ||
    completeSetup.isPending

  const serviceAreaOptions = useMemo(
    () =>
      (step7.data ?? []).map((area) => ({
        value: area.id ?? '',
        label: area.name ?? 'Unnamed area',
      })),
    [step7.data],
  )

  const roundOptions = useMemo(
    () =>
      (step8.data ?? [])
        .filter((round): round is typeof round & { id: string; name: string } =>
          Boolean(round.id && round.name),
        )
        .map((round) => ({
          value: round.id,
          label: round.name,
        })),
    [step8.data],
  )

  const serviceOptions = useMemo(
    () =>
      (step3.data ?? [])
        .filter((service): service is typeof service & { id: string; name: string } =>
          Boolean(service.id && service.name),
        )
        .map((service) => ({
          value: service.id,
          label: service.name,
        })),
    [step3.data],
  )

  const assignTechnicians = useMemo(
    () => techniciansForAssignStep(step6.data),
    [step6.data],
  )

  async function persistCurrentStep(
    values?: unknown,
    options?: { bulkReplaceConfirmed?: boolean },
  ) {
    setFormError(null)

    try {
      switch (step) {
        case 1:
          await saveStep1.mutateAsync(
            businessProfileFromForm(values as BusinessProfileData),
          )
          break
        case 2:
          await saveStep2.mutateAsync(paymentSetupFromForm(values as PaymentSetupData))
          break
        case 3:
          if (!options?.bulkReplaceConfirmed) {
            setPendingBulkReplace({ target: 'services', values })
            return false
          }
          await saveStep3.mutateAsync(
            servicesFromForm(values as ServiceCatalogueData),
          )
          break
        case 4:
          await saveStep4.mutateAsync(
            roundSettingsFromForm(values as RoundSettingsData),
          )
          break
        case 5:
          await saveStep5.mutateAsync()
          break
        case 6:
          await saveStep6.mutateAsync(
            pendingTechniciansFromForm(values as TechnicianManagementData),
          )
          break
        case 7:
          if (!options?.bulkReplaceConfirmed) {
            setPendingBulkReplace({ target: 'service-areas', values })
            return false
          }
          await saveStep7.mutateAsync(
            serviceAreasFromForm(values as ServiceAreaData),
          )
          break
        case 8:
          await saveStep8.mutateAsync(
            firstRoundFromForm(values as FirstRoundFormValues),
          )
          break
        case 9:
          // Properties are added additively via onAddProperty — Continue only advances.
          return true
        case 10:
          await saveStep10.mutateAsync(
            step10FromForm(values as AssignTechniciansData),
          )
          break
        case 11:
          await saveStep11.mutateAsync(
            step11FromForm(values as ActivateSystemData),
          )
          break
        default:
          break
      }
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError(error.message)
        return false
      }
      throw error
    }
  }

  async function handleStepSubmit(values?: unknown) {
    if (!canMutate) return
    const saved = await persistCurrentStep(values)
    if (saved) goNext()
  }

  async function handleAddProperty(draft: PropertyDraft) {
    if (!canMutate) return
    try {
      await saveStep9.mutateAsync(propertyDraftToStep9Input(draft))
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  async function handleConfirmBulkReplace() {
    if (!canMutate || !pendingBulkReplace) return
    const { values } = pendingBulkReplace
    const saved = await persistCurrentStep(values, { bulkReplaceConfirmed: true })
    if (saved) {
      setPendingBulkReplace(null)
      goNext()
    }
  }

  async function handleContinue() {
    if (!canMutate) return

    if (step === 5 || step === 9) {
      const saved = await persistCurrentStep()
      if (saved) goNext()
      return
    }

    if (FORM_STEP_NUMBERS.has(step)) {
      const form = document.getElementById('setup-wizard-step-form')
      if (form instanceof HTMLFormElement) form.requestSubmit()
      return
    }

    goNext()
  }

  async function handleComplete() {
    if (!canMutate || !setupStatus?.allRequiredComplete) return
    await completeSetup.mutateAsync()
  }

  function handleSkip() {
    deferSetup()
    navigate(ROUTES.dashboard, { replace: true })
  }

  function renderStep() {
    switch (step) {
      case 1:
        if (step1.isPending) return <WizardFormSkeleton fields={5} />
        if (step1.isError) {
          return (
            <StepError
              message="Could not load business profile."
              onRetry={() => step1.refetch()}
            />
          )
        }
        return (
          <BusinessProfileStep
            initialValues={businessProfileToForm(step1.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 2:
        if (step2.isPending) return <WizardFormSkeleton fields={3} />
        if (step2.isError) {
          return (
            <StepError
              message="Could not load payment settings."
              onRetry={() => step2.refetch()}
            />
          )
        }
        return (
          <PaymentSetupStep
            initialValues={paymentSetupToForm(step2.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 3:
        if (step3.isPending) return <WizardListSkeleton />
        if (step3.isError) {
          return (
            <StepError
              message="Could not load services."
              onRetry={() => step3.refetch()}
            />
          )
        }
        return (
          <ServiceCatalogueStep
            initialValues={servicesToForm(step3.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 4:
        if (step4.isPending) return <WizardFormSkeleton fields={2} />
        if (step4.isError) {
          return (
            <StepError
              message="Could not load round settings."
              onRetry={() => step4.refetch()}
            />
          )
        }
        return (
          <RoundSettingsStep
            initialValues={roundSettingsToForm(step4.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 5:
        return (
          <SmsTemplatesStep
            initialValues={setupWizardContent.smsTemplates.defaults}
            onSubmit={handleStepSubmit}
          />
        )
      case 6:
        if (step6.isPending) return <WizardListSkeleton />
        if (step6.isError) {
          return (
            <StepError
              message="Could not load technicians."
              onRetry={() => step6.refetch()}
            />
          )
        }
        return (
          <TechnicianManagementStep
            initialValues={techniciansToForm(step6.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 7:
        if (step7.isPending) return <WizardCardsSkeleton />
        if (step7.isError) {
          return (
            <StepError
              message="Could not load service areas."
              onRetry={() => step7.refetch()}
            />
          )
        }
        return (
          <ServiceAreaStep
            initialValues={serviceAreasToForm(step7.data)}
            onSubmit={handleStepSubmit}
          />
        )
      case 8: {
        if (step8.isPending || step7.isPending) return <WizardFormSkeleton fields={3} />
        if (step8.isError) {
          return (
            <StepError
              message="Could not load round data."
              onRetry={() => step8.refetch()}
            />
          )
        }
        return (
          <FirstRoundStep
            initialValues={firstRoundToForm(step8.data, step7.data)}
            serviceAreaOptions={serviceAreaOptions}
            onSubmit={handleStepSubmit}
          />
        )
      }
      case 9: {
        if (step9.isPending || step8.isPending || step7.isPending) {
          return <WizardFormSkeleton fields={4} />
        }
        if (step9.isError) {
          return (
            <StepError
              message="Could not load properties."
              onRetry={() => step9.refetch()}
            />
          )
        }
        return (
          <AddPropertyStep
            initialValues={{ properties: step9BundlesToRecords(step9.data) }}
            serviceAreaOptions={serviceAreaOptions}
            roundOptions={roundOptions}
            serviceOptions={serviceOptions}
            adding={saveStep9.isPending}
            onAddProperty={handleAddProperty}
            onSubmit={() => {
              void handleStepSubmit()
            }}
          />
        )
      }
      case 10: {
        if (step10.isPending || step6.isPending) return <WizardListSkeleton />
        if (step10.isError) {
          return (
            <StepError
              message="Could not load round assignments."
              onRetry={() => step10.refetch()}
            />
          )
        }
        return (
          <AssignTechniciansStep
            initialValues={step10ToForm(step10.data)}
            technicians={assignTechnicians}
            roundDays={ROUND_DAY_OPTIONS}
            onSubmit={handleStepSubmit}
          />
        )
      }
      case 11: {
        if (step11.isPending || step8.isPending) return <WizardFormSkeleton fields={3} />
        if (step11.isError) {
          return (
            <StepError
              message="Could not load visit generation status."
              onRetry={() => step11.refetch()}
            />
          )
        }
        return (
          <ActivateSystemStep
            initialValues={step11ToForm(
              step11.data,
              (step8.data ?? [])
                .map((round) => round.id)
                .filter((id): id is string => Boolean(id)),
            )}
            roundOptions={roundOptions}
            alreadyGenerated={Boolean(step11.data?.activated || (step11.data?.visitsGenerated ?? 0) > 0)}
            visitsGenerated={step11.data?.visitsGenerated ?? 0}
            onSubmit={handleStepSubmit}
          />
        )
      }
      case 12: {
        if (step12.isPending) return <WizardFormSkeleton fields={3} />
        if (step12.isError) {
          return (
            <StepError
              message="Could not load launch checklist."
              onRetry={() => step12.refetch()}
            />
          )
        }
        return (
          <ReviewLaunchStep
            checklist={step12.data?.checklist ?? []}
            allComplete={step12.data?.allComplete ?? false}
          />
        )
      }
      default:
        return null
    }
  }

  const onLastStepContinue = isLastStep ? handleComplete : handleContinue

  const continueDisabled =
    isLastStep &&
    !(setupStatus?.allRequiredComplete || step12.data?.allComplete)

  return (
    <div className="min-h-svh bg-background">
      <SetupBanner
        currentIndex={stepIndex}
        completedSteps={completedSteps}
        onSkip={setupStatus?.setupCompleted ? undefined : handleSkip}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="p-6 sm:p-8">
          {formError ? (
            <p className="mb-4 text-sm text-destructive">{formError}</p>
          ) : null}

          <SetupStepPanel stepKey={currentStep.id}>{renderStep()}</SetupStepPanel>

          <SetupWizardFooter
            currentStep={step}
            totalSteps={SETUP_STEP_COUNT}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            onBack={goBack}
            onContinue={onLastStepContinue}
            onSkipStep={skipStep}
            loading={pendingMutation || statusQuery.isFetching}
            continueDisabled={continueDisabled || !canMutate}
            continueLabel={isLastStep ? setupWizardContent.footer.launch : undefined}
          />
        </div>
      </div>

      <BulkReplaceConfirmModal
        open={pendingBulkReplace != null}
        target={pendingBulkReplace?.target ?? null}
        loading={saveStep3.isPending || saveStep7.isPending}
        onClose={() => {
          if (saveStep3.isPending || saveStep7.isPending) return
          setPendingBulkReplace(null)
        }}
        onConfirm={() => {
          void handleConfirmBulkReplace()
        }}
      />
    </div>
  )
}
