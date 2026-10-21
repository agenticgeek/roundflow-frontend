import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SETUP_STEPS, SETUP_STEP_COUNT, setupStepPosition } from '@/config/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { ROUTES } from '@/config/routes'
import {
  businessProfileFromForm,
  businessProfileToForm,
  defaultRoundFrequency,
  wizardPaymentFromForm,
  wizardPaymentToForm,
  wizardMessagesFromForm,
  wizardMessagesToForm,
  propertyDraftToStep9BulkItem,
  propertyDraftToStep9Input,
  roundSettingsFromForm,
  roundSettingsToForm,
  serviceAreasFromForm,
  serviceAreasToForm,
  servicesFromForm,
  servicesToForm,
  step9BundlesToRecords,
} from '@/features/setup/lib/mappers'
import { stepCompletionFlags } from '@/features/setup/lib/wizard'
import { WizardDirtyContext } from '@/features/setup/lib/wizard-dirty'
import { useWizardStep } from '@/features/setup/hooks/useWizardStep'
import {
  useCompleteSetup,
  useCreateSetupRound,
  useCreateSetupTechnician,
  useSendSetupTechnicianInvite,
  useUpdateSetupTechnician,
  useUpdateSetupRound,
  useSaveStep1,
  useSaveStep2,
  useSaveStep3,
  useSaveStep4,
  useSaveStep5,
  useSaveStep7,
  useSaveStep9,
  useSaveStep9Bulk,
  useSaveStep11,
  useSetupStep1,
  useSetupStep2,
  useSetupStep3,
  useSetupStep4,
  useSetupStep5,
  useSetupStep7,
  useSetupStep8,
  useSetupStep9,
  useSetupStep11,
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
import { RoundsStep } from '@/components/setup-wizard/steps/RoundsStep'
import { MessageTemplatesStep } from '@/components/setup-wizard/steps/MessageTemplatesStep'
import { TechniciansStep } from '@/components/setup-wizard/steps/TechniciansStep'
import { ServiceAreaStep } from '@/components/setup-wizard/steps/ServiceAreaStep'
import { AddPropertyStep } from '@/components/setup-wizard/steps/AddPropertyStep'
import {
  ActivateStep,
  type GoLiveInput,
  type GoLiveSummary,
} from '@/components/setup-wizard/steps/ActivateStep'
import type { SetupLiveState } from '@/pages/SetupLive'
import type {
  BusinessProfileData,
  WizardPaymentData,
  PropertyDraft,
  RoundSettingsData,
  WizardMessagesData,
  ServiceAreaData,
  ServiceCatalogueData,
} from '@/types/setup-wizard'
import type { RoundCreateInput } from '@/api/rounds.api'
import type { TechnicianCreateInput } from '@/api/technicians.api'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'

const FORM_STEP_NUMBERS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])

type PendingBulkReplace = {
  target: BulkReplaceTarget
  values: unknown
  /** Step to open once saved — the next step, or wherever Back/stepper was heading. */
  navigateTo: number
}

/**
 * Steps whose form is saved when the user leaves via Back or the stepper. Not 6/8/9
 * (technicians, rounds and properties save individually) or 11 (saving generates visits — never implicit).
 */
const SAVE_ON_LEAVE_STEPS = new Set([1, 2, 3, 4, 5, 7])

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
  const {
    step,
    stepIndex,
    nextStep,
    previousStep,
    goToStep,
    goNext,
    skipStep,
    isFirstStep,
    isLastStep,
  } = useWizardStep()
  const currentStep = SETUP_STEPS[stepIndex]
  const completedSteps = stepCompletionFlags(setupStatus, SETUP_STEP_COUNT)

  const step1 = useSetupStep1(step === 1 || step === 2 || step === 5 || step === 8 || step === 11)
  const step2 = useSetupStep2(step === 2 || step === 9 || step === 11)
  const step3 = useSetupStep3(step === 3 || step === 9)
  const step4 = useSetupStep4(step === 4 || step === 8)
  const step5 = useSetupStep5(step === 5)
  const step7 = useSetupStep7(step === 6 || step === 7 || step === 8 || step === 9 || step === 11)
  // Richer than step 6's list — includes email, areas and app status.
  const technicianList = useTechniciansList(step === 6 || step === 11)
  const step8 = useSetupStep8(step === 8 || step === 9 || step === 11)
  const step9 = useSetupStep9(step === 9 || step === 11)
  const step11 = useSetupStep11(step === 11)
  const statusQuery = useSetupStatus()

  const saveStep1 = useSaveStep1()
  const saveStep2 = useSaveStep2()
  const saveStep3 = useSaveStep3()
  const saveStep4 = useSaveStep4()
  const saveStep5 = useSaveStep5()
  const createTechnician = useCreateSetupTechnician()
  const updateTechnician = useUpdateSetupTechnician()
  const sendTechnicianInvite = useSendSetupTechnicianInvite()
  const saveStep7 = useSaveStep7()
  const createRound = useCreateSetupRound()
  const updateRound = useUpdateSetupRound()
  const saveStep9 = useSaveStep9()
  const saveStep9Bulk = useSaveStep9Bulk()
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
    createTechnician.isPending ||
    updateTechnician.isPending ||
    saveStep7.isPending ||
    createRound.isPending ||
    updateRound.isPending ||
    saveStep9.isPending ||
    saveStep9Bulk.isPending ||
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

  // Built once per server response — steps resync their local lists when these
  // change identity, so rebuilding them every render wiped unsaved edits.
  const step1Initial = useMemo(() => businessProfileToForm(step1.data), [step1.data])
  const step2Initial = useMemo(() => wizardPaymentToForm(step2.data), [step2.data])
  const step3Initial = useMemo(() => servicesToForm(step3.data), [step3.data])
  const step4Initial = useMemo(() => roundSettingsToForm(step4.data), [step4.data])
  const step5Initial = useMemo(() => wizardMessagesToForm(step5.data), [step5.data])
  const step7Initial = useMemo(() => serviceAreasToForm(step7.data), [step7.data])
  const step9Initial = useMemo(
    () => ({ properties: step9BundlesToRecords(step9.data) }),
    [step9.data],
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
    const navigateTo = options?.navigateTo ?? nextStep

    try {
      switch (step) {
        case 1:
          await saveStep1.mutateAsync(
            businessProfileFromForm(values as BusinessProfileData),
          )
          break
        case 2:
          await saveStep2.mutateAsync(
            wizardPaymentFromForm(values as WizardPaymentData, Boolean(step1Initial.vatRegistered)),
          )
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
            wizardMessagesFromForm(values as WizardMessagesData),
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
        case 6:
        case 8:
        case 9:
          // Technicians (6), rounds (8) and properties (9) save one at a time as they're added —
          // Continue only advances.
          return 'saved'
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
    const navigateTo = leaveTarget ?? nextStep
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

  /** Technicians save one at a time through /technicians — errors become plain messages. */
  async function handleCreateTechnician(input: TechnicianCreateInput): Promise<string | undefined> {
    if (!canMutate) return undefined
    try {
      const technician = await createTechnician.mutateAsync(input)
      return technician.id
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  async function handleUpdateTechnician(id: string, input: TechnicianCreateInput) {
    if (!canMutate) return
    try {
      await updateTechnician.mutateAsync({ id, input })
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  async function handleSendTechnicianInvite({ id, email }: { id: string; email: string }) {
    if (!canMutate) return
    try {
      await sendTechnicianInvite.mutateAsync({ email, role: 'TECHNICIAN', technicianId: id })
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  /** Rounds save one at a time — errors are rethrown as plain messages for the step's form. */
  async function handleCreateRound(input: RoundCreateInput): Promise<string | undefined> {
    if (!canMutate) return undefined
    try {
      const round = await createRound.mutateAsync({ input, isFirst: (step8.data ?? []).length === 0 })
      return round.id
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  async function handleUpdateRound(id: string, input: RoundCreateInput) {
    if (!canMutate) return
    try {
      await updateRound.mutateAsync({ id, input })
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  async function handleAddProperty(draft: PropertyDraft) {
    if (!canMutate) return
    try {
      await saveStep9.mutateAsync(propertyDraftToStep9Input(draft))
    } catch (error) {
      throw new Error(errorMessage(error))
    }
  }

  /**
   * CSV import: every row in one POST /setup/step/9/bulk. The ApiError is rethrown untouched
   * so the import panel can read its status (400 = per-row validation, nothing saved;
   * 5xx = a later batch failed after earlier batches were saved).
   */
  async function handleAddProperties(drafts: PropertyDraft[]): Promise<{ created: number }> {
    if (!canMutate) return { created: 0 }
    const result = await saveStep9Bulk.mutateAsync({
      properties: drafts.map(propertyDraftToStep9BulkItem),
    })
    return { created: result.created }
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

  /**
   * Activate: generate the first visits (skipped when an earlier run already did), finish
   * setup, then open "You're live" — outside the wizard, which completed setups can't enter.
   */
  async function handleGoLive(input: GoLiveInput, summary: GoLiveSummary) {
    if (!canMutate) return
    const alreadyGenerated = (step11.data?.visitsGenerated ?? 0) > 0
    try {
      let visits = summary.visits
      if (!alreadyGenerated) {
        const result = await saveStep11.mutateAsync({
          startDate: input.startDate,
          cycleWeeks: Math.max(1, Math.round((step4.data?.defaultCycleLength ?? 28) / 7)),
          generateAll: input.generateAll,
          ...(input.generateAll ? {} : { roundIds: input.roundIds }),
        })
        visits = result.visitsGenerated
      }
      await completeSetup.mutateAsync()

      const rounds = step8.data ?? []
      const areas = step7.data ?? []
      const properties = step9Initial.properties
      const state: SetupLiveState = {
        businessName: step1.data?.businessName ?? '',
        areas: areas.length,
        rounds: summary.rounds,
        properties: properties.length,
        technicians: technicianList.data?.length ?? 0,
        visits,
        startDate: input.startDate,
        areasWithoutRounds: areas
          .filter((area) => !rounds.some((round) => round.serviceAreaId === area.id))
          .map((area) => area.name ?? ''),
        unplacedProperties: properties.filter((property) => !property.round).length,
        stripeConnected: step2Initial.stripeConnected,
      }
      navigate(ROUTES.setupLive, { replace: true, state })
    } catch (error) {
      throw new Error(errorMessage(error))
    }
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
        if (step2.isPending || step1.isPending) return <WizardFormSkeleton fields={3} />
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
            businessName={step1Initial.businessName}
            vat={{ registered: Boolean(step1Initial.vatRegistered), rate: step1Initial.vatRate }}
            businessStepNumber={setupStepPosition(1) + 1}
            onChangeVat={() => navigateToStep(1)}
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
          <MessageTemplatesStep
            initialValues={step5Initial}
            businessName={step1.data?.businessName ?? ''}
            onSaveTemplates={async (values) => {
              if (!canMutate) return
              try {
                await saveStep5.mutateAsync(wizardMessagesFromForm(values))
              } catch (error) {
                throw new Error(errorMessage(error))
              }
            }}
            onSubmit={handleStepSubmit}
          />
        )
      case 6:
        if (technicianList.isPending || step7.isPending) return <WizardListSkeleton />
        if (technicianList.isError) {
          return (
            <StepError
              message="Could not load technicians."
              onRetry={() => technicianList.refetch()}
            />
          )
        }
        return (
          <TechniciansStep
            technicians={technicianList.data ?? []}
            areas={step7.data ?? []}
            saving={createTechnician.isPending || updateTechnician.isPending}
            onCreateTechnician={handleCreateTechnician}
            onUpdateTechnician={handleUpdateTechnician}
            onSendInvite={handleSendTechnicianInvite}
            onSubmit={() => {
              void handleStepSubmit()
            }}
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
        if (step8.isPending || step7.isPending || step4.isPending || step1.isPending) {
          return <WizardFormSkeleton fields={4} />
        }
        if (step8.isError || step7.isError) {
          return (
            <StepError
              message="Could not load round data."
              onRetry={() => {
                void step8.refetch()
                void step7.refetch()
              }}
            />
          )
        }
        return (
          <RoundsStep
            areas={step7.data ?? []}
            rounds={step8.data ?? []}
            workingDays={step1.data?.defaultWorkingDays ?? []}
            defaultFrequency={defaultRoundFrequency(step4.data?.defaultCycleLength)}
            saving={createRound.isPending || updateRound.isPending}
            onCreateRound={handleCreateRound}
            onUpdateRound={handleUpdateRound}
            onSubmit={() => {
              void handleStepSubmit()
            }}
          />
        )
      }
      case 9: {
        if (step9.isPending || step8.isPending || step7.isPending || step2.isPending) {
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
            areas={step7.data ?? []}
            rounds={step8.data ?? []}
            roundsStepNumber={setupStepPosition(8) + 1}
            defaultPaymentMethod={step2Initial.defaultPaymentMethod}
            connectedProviders={{
              gocardless: step2Initial.goCardlessConnected,
              stripe: step2Initial.stripeConnected,
            }}
            serviceAreaOptions={serviceAreaOptions}
            roundOptions={roundOptions}
            serviceOptions={serviceOptions}
            servicePrices={servicePrices}
            adding={saveStep9.isPending}
            onAddProperty={handleAddProperty}
            onAddProperties={handleAddProperties}
            onSubmit={() => {
              void handleStepSubmit()
            }}
          />
        )
      }
      case 11: {
        if (step11.isPending || step8.isPending || step7.isPending || step9.isPending) {
          return <WizardFormSkeleton fields={3} />
        }
        if (step11.isError || step8.isError) {
          return (
            <StepError
              message="Could not load visit generation status."
              onRetry={() => {
                void step11.refetch()
                void step8.refetch()
              }}
            />
          )
        }
        return (
          <ActivateStep
            rounds={step8.data ?? []}
            areas={step7.data ?? []}
            properties={step9Initial.properties}
            visitsGenerated={step11.data?.visitsGenerated ?? 0}
            working={saveStep11.isPending || completeSetup.isPending}
            onGoLive={handleGoLive}
            onFixRounds={() => navigateToStep(8)}
          />
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SetupBanner
        currentIndex={stepIndex}
        completedSteps={completedSteps}
        onSkip={setupStatus?.setupCompleted ? undefined : handleSkip}
        onStepClick={(index) => navigateToStep(SETUP_STEPS[index].step)}
      />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div>
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
        </div>
      </div>

      <SetupWizardFooter
        currentStep={stepIndex + 1}
        totalSteps={SETUP_STEP_COUNT}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        onBack={() => navigateToStep(previousStep)}
        onContinue={handleContinue}
        onSkipStep={skipStep}
        loading={pendingMutation || statusQuery.isFetching}
        continueDisabled={!canMutate}
        // Activate has its own "Generate visits & go live" button.
        hideContinue={isLastStep}
      />

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
