import { useCallback, useMemo, useRef, useState } from 'react'
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
  messageTemplatesFromForm,
  messageTemplatesToForm,
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
import { WizardDirtyContext } from '@/features/setup/lib/wizard-dirty'
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
  useSetupStep5,
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
  SmsTemplatesData,
  ServiceAreaData,
  ServiceCatalogueData,
  TechnicianManagementData,
} from '@/types/setup-wizard'
import type { FirstRoundFormValues } from '@/features/setup/lib/mappers'

const FORM_STEP_NUMBERS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])

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
  /** Step to open once saved — the next step, or wherever Back/stepper was heading. */
  navigateTo: number
}

/**
 * Steps whose form is saved when the user leaves via Back or the stepper. Not 9
 * (properties save individually) or 11 (saving generates visits — never implicit).
 */
const SAVE_ON_LEAVE_STEPS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 10])

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
  const { step, stepIndex, goToStep, goNext, skipStep, isFirstStep, isLastStep } =
    useWizardStep()
  const currentStep = SETUP_STEPS[stepIndex]
  const completedSteps = stepCompletionFlags(setupStatus, SETUP_STEP_COUNT)

  const step1 = useSetupStep1(step === 1)
  const step2 = useSetupStep2(step === 2)
  const step3 = useSetupStep3(step === 3 || step === 9)
  const step4 = useSetupStep4(step === 4 || step === 8)
  const step5 = useSetupStep5(step === 5)
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
  const [stepDirty, setStepDirty] = useState(false)
  /** Set when leaving a step failed to save — offers "discard and leave" instead of trapping the user. */
  const [blockedLeaveTarget, setBlockedLeaveTarget] = useState<number | null>(null)
  const leaveTargetRef = useRef<number | null>(null)
  const submitStartedRef = useRef(false)
  const reportDirty = useCallback((dirty: boolean) => setStepDirty(dirty), [])

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

  const servicePrices = useMemo(
    () =>
      Object.fromEntries(
        (step3.data ?? [])
          .filter((service) => service.id && service.defaultPrice != null)
          .map((service) => [service.id as string, Number.parseFloat(String(service.defaultPrice))])
          .filter(([, price]) => Number.isFinite(price)),
      ) as Record<string, number>,
    [step3.data],
  )

  const assignTechnicians = useMemo(
    () => techniciansForAssignStep(step6.data),
    [step6.data],
  )

  // Built once per server response — steps resync their local lists when these
  // change identity, so rebuilding them every render wiped unsaved edits.
  const step1Initial = useMemo(() => businessProfileToForm(step1.data), [step1.data])
  const step2Initial = useMemo(() => paymentSetupToForm(step2.data), [step2.data])
  const step3Initial = useMemo(() => servicesToForm(step3.data), [step3.data])
  const step4Initial = useMemo(() => roundSettingsToForm(step4.data), [step4.data])
  const step5Initial = useMemo(() => messageTemplatesToForm(step5.data), [step5.data])
  const step6Initial = useMemo(() => techniciansToForm(step6.data), [step6.data])
  const step7Initial = useMemo(() => serviceAreasToForm(step7.data), [step7.data])
  const step8Initial = useMemo(
    () => firstRoundToForm(step8.data, step7.data, step4.data?.defaultCycleLength),
    [step8.data, step7.data, step4.data?.defaultCycleLength],
  )
  const step9Initial = useMemo(
    () => ({ properties: step9BundlesToRecords(step9.data) }),
    [step9.data],
  )
  const step10Initial = useMemo(() => step10ToForm(step10.data), [step10.data])
  const step11Initial = useMemo(
    () =>
      step11ToForm(
        step11.data,
        (step8.data ?? []).map((round) => round.id).filter((id): id is string => Boolean(id)),
      ),
    [step11.data, step8.data],
  )

  /** Service/area ids already saved server-side that `values` no longer contains. */
  function removedSavedNames(target: BulkReplaceTarget, values: unknown): string[] {
    if (target === 'services') {
      const kept = new Set((values as ServiceCatalogueData).services.map((service) => service.id))
      return (step3.data ?? [])
        .filter((service) => service.id && !kept.has(service.id))
        .map((service) => service.name ?? 'Unnamed service')
    }
    const kept = new Set((values as ServiceAreaData).areas.map((area) => area.id))
    return (step7.data ?? [])
      .filter((area) => area.id && !kept.has(area.id))
      .map((area) => area.name ?? 'Unnamed area')
  }

  async function persistCurrentStep(
    values?: unknown,
    options?: { bulkReplaceConfirmed?: boolean; navigateTo?: number },
  ): Promise<'saved' | 'needs-confirm' | 'failed'> {
    setFormError(null)
    const navigateTo = options?.navigateTo ?? step + 1

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
          // Only warn when saving would actually delete something already saved.
          if (!options?.bulkReplaceConfirmed && removedSavedNames('services', values).length > 0) {
            setPendingBulkReplace({ target: 'services', values, navigateTo })
            return 'needs-confirm'
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
          await saveStep5.mutateAsync(
            messageTemplatesFromForm(values as SmsTemplatesData),
          )
          break
        case 6:
          await saveStep6.mutateAsync(
            pendingTechniciansFromForm(values as TechnicianManagementData),
          )
          break
        case 7:
          if (!options?.bulkReplaceConfirmed && removedSavedNames('service-areas', values).length > 0) {
            setPendingBulkReplace({ target: 'service-areas', values, navigateTo })
            return 'needs-confirm'
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
          return 'saved'
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
      return 'saved'
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        setFormError(error.message)
        // A rejected bulk-replace (e.g. "still referenced") leaves the confirm
        // modal stuck open over a local list that already dropped the item —
        // close it and refetch so the item reappears instead of vanishing.
        setPendingBulkReplace(null)
        if (step === 3) void step3.refetch()
        if (step === 7) void step7.refetch()
        return 'failed'
      }
      throw error
    }
  }

  async function handleStepSubmit(values?: unknown) {
    // Read synchronously — requestSubmit() runs this before leaveTargetRef is cleared.
    submitStartedRef.current = true
    const leaveTarget = leaveTargetRef.current
    if (!canMutate) return
    const navigateTo = leaveTarget ?? step + 1
    const outcome = await persistCurrentStep(values, { navigateTo })
    if (outcome === 'saved') {
      setBlockedLeaveTarget(null)
      goToStep(navigateTo)
    } else if (outcome === 'failed' && leaveTarget != null) {
      setBlockedLeaveTarget(leaveTarget)
    }
  }

  /** Back / stepper navigation — saves unsaved edits first so they aren't lost. */
  function navigateToStep(target: number) {
    if (target === step) return
    setFormError(null)
    setBlockedLeaveTarget(null)

    const form = document.getElementById('setup-wizard-step-form')
    if (!stepDirty || !canMutate || !SAVE_ON_LEAVE_STEPS.has(step) || !(form instanceof HTMLFormElement)) {
      goToStep(target)
      return
    }

    leaveTargetRef.current = target
    submitStartedRef.current = false
    form.requestSubmit()
    leaveTargetRef.current = null
    // The step's own validation stopped the submit — its errors are now showing.
    if (!submitStartedRef.current) setBlockedLeaveTarget(target)
  }

  function discardAndLeave() {
    if (blockedLeaveTarget == null) return
    const target = blockedLeaveTarget
    setBlockedLeaveTarget(null)
    setFormError(null)
    goToStep(target)
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
    const outcome = await persistCurrentStep(values, {
      bulkReplaceConfirmed: true,
      navigateTo: pendingBulkReplace.navigateTo,
    })
    if (outcome === 'saved') {
      setPendingBulkReplace(null)
      setBlockedLeaveTarget(null)
      goToStep(pendingBulkReplace.navigateTo)
    }
  }

  async function handleContinue() {
    if (!canMutate) return
    setBlockedLeaveTarget(null)

    if (step === 9) {
      const outcome = await persistCurrentStep()
      if (outcome === 'saved') goNext()
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
            initialValues={step1Initial}
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
            initialValues={step2Initial}
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
            initialValues={step3Initial}
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
            initialValues={step4Initial}
            onSubmit={handleStepSubmit}
          />
        )
      case 5:
        if (step5.isPending) return <WizardFormSkeleton fields={3} />
        if (step5.isError) {
          return (
            <StepError
              message="Could not load message templates."
              onRetry={() => step5.refetch()}
            />
          )
        }
        return (
          <SmsTemplatesStep
            initialValues={step5Initial}
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
            initialValues={step6Initial}
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
            initialValues={step7Initial}
            onSubmit={handleStepSubmit}
          />
        )
      case 8: {
        if (step8.isPending || step7.isPending || step4.isPending) {
          return <WizardFormSkeleton fields={3} />
        }
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
            initialValues={step8Initial}
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
            initialValues={step9Initial}
            serviceAreaOptions={serviceAreaOptions}
            roundOptions={roundOptions}
            serviceOptions={serviceOptions}
            servicePrices={servicePrices}
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
            initialValues={step10Initial}
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
            initialValues={step11Initial}
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
        onStepClick={(index) => navigateToStep(index + 1)}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="p-6 sm:p-8">
          {formError ? (
            <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          {blockedLeaveTarget != null ? (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
            >
              <p>{setupWizardContent.unsavedChanges.message}</p>
              <button
                type="button"
                onClick={discardAndLeave}
                className="font-semibold text-foreground underline underline-offset-2"
              >
                {setupWizardContent.unsavedChanges.discard}
              </button>
            </div>
          ) : null}

          <WizardDirtyContext.Provider value={reportDirty}>
            <SetupStepPanel stepKey={currentStep.id}>{renderStep()}</SetupStepPanel>
          </WizardDirtyContext.Provider>

          <SetupWizardFooter
            currentStep={step}
            totalSteps={SETUP_STEP_COUNT}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            onBack={() => navigateToStep(step - 1)}
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
        removedNames={
          pendingBulkReplace
            ? removedSavedNames(pendingBulkReplace.target, pendingBulkReplace.values)
            : []
        }
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
