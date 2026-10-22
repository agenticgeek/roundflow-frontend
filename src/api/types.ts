import type { components } from '@/api/types.gen'

export type Role = components['schemas']['UserRole']
export type Profile = components['schemas']['Profile']
export type SetupStatus = components['schemas']['SetupStatus']
export type SetupStepStatus = components['schemas']['StepStatus']
export type BusinessSettings = components['schemas']['BusinessSettings']
export type Service = components['schemas']['Service']
export type ServiceInput = components['schemas']['ServiceInput']
export type ServiceArea = components['schemas']['ServiceAreaWithRounds']
export type ServiceAreaInput = components['schemas']['ServiceAreaInput']
export type Technician = components['schemas']['TechnicianWithDisplayName']
export type TechnicianInput = components['schemas']['TechnicianInput']
export type Round = components['schemas']['Round']
export type RoundInput = components['schemas']['FirstRoundInput']
export type DeferredStatus = components['schemas']['DeferredStub']
export type PaymentConnectResponse = components['schemas']['ProviderConnectResponse']
export type PaymentMethod = components['schemas']['PaymentMethod']
export type CleaningFrequency = components['schemas']['CleaningFrequency']
export type Property = components['schemas']['Property']
// CONTRACT-DIFF: the generated schema only has a single `serviceId`, but the backend
// accepts multiple services per property (OpenAPI not yet regenerated). `serviceId`
// is still sent as the primary for back-compat.
export type PropertyCreateInput = components['schemas']['PropertyCreateInput'] & {
  serviceIds?: string[]
}
export type PropertyCreateResult = {
  customerId?: string
  propertyId?: string
  servicePlanId?: string
  assigned?: boolean
}
export type PropertyUpdateInput = components['schemas']['PropertyUpdateInput'] & {
  // CONTRACT-DIFF: handoff §3.3 — mutually exclusive with roundId.
  cleaningFrequency?: CleaningFrequency | null
}
export type CustomerUpdateInput = components['schemas']['CustomerUpdateInput']
type GeneratedCustomerDetail = components['schemas']['CustomerDetail']
type GeneratedCustomerDetailTabs = NonNullable<GeneratedCustomerDetail['tabs']>
// CONTRACT-DIFF: multi-plan handoff — GET /customers/:id now returns `servicePlans[]`
// (and `tabs.servicePlans[]`) instead of a single `servicePlan`. The legacy single-plan
// fields stay optional so an environment still on the old backend keeps working.
export type CustomerDetail = Omit<GeneratedCustomerDetail, 'servicePlan' | 'tabs'> & {
  servicePlans?: ServicePlanView[]
  /** @deprecated legacy single plan — read via `customerServicePlans()` instead. */
  servicePlan?: ServicePlanView | null
  tabs?: Omit<GeneratedCustomerDetailTabs, 'servicePlan'> & {
    servicePlans?: ServicePlanView[]
    /** @deprecated legacy single plan. */
    servicePlan?: ServicePlanView | null
  }
}
export type CustomerListRowPaymentStatus =
  | 'paid'
  | 'hold'
  | 'pending'
  | 'overdue'
  | 'failed'
  | 'none'
export type CustomerListRow = Omit<
  components['schemas']['CustomerListRow'],
  'paymentStatus'
> & {
  // CONTRACT-DIFF: handoff allows "none" when there is no payment history.
  paymentStatus?: CustomerListRowPaymentStatus
}
export type CustomerListResult = Omit<
  components['schemas']['CustomerListResult'],
  'customers'
> & {
  customers?: CustomerListRow[]
  // CONTRACT-DIFF: handoff §2.1 pagination — may lag OpenAPI.
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
export type PauseServiceInput = components['schemas']['PauseServiceInput']
export type NoteCreateInput = components['schemas']['NoteCreateInput']
export type PropertyNote = components['schemas']['PropertyNote']
// CONTRACT-DIFF: each plan now carries its own cleaningFrequency (multi-plan handoff).
export type ServicePlanView = components['schemas']['ServicePlanView'] & {
  cleaningFrequency?: CleaningFrequency | null
  /** Which plan the backend treats as primary (audit follow-up 2026-10-22). */
  isPrimary?: boolean
}
export type NoteType = components['schemas']['NoteType']
export type DayOfWeek = components['schemas']['DayOfWeek']
export type LifecycleStatus = components['schemas']['LifecycleStatus']

// CONTRACT-DIFF: POST /customers create body not in generated OpenAPI.
export type CustomerCreateInput = {
  name: string
  phone?: string | null
  email?: string | null
  paymentMethod?: PaymentMethod | null
}

export type CustomerListParams = {
  search?: string
  roundId?: string
  status?: LifecycleStatus | 'HOLD'
  page?: number
  pageSize?: number
}

export type TechnicianAppStatus = NonNullable<Technician['appStatus']>

// CONTRACT-DIFF: steps 9–12 are live on the backend but not yet in generated OpenAPI.

export type PropertyType =
  | 'HOUSE'
  | 'FLAT_APARTMENT'
  | 'COMMERCIAL'
  | 'OFFICE'
  | 'CONSERVATORY'

export type SetupStep9Input = {
  customerName: string
  fullAddress: string
  postcode: string
  price: number
  // CONTRACT-DIFF: omitted for "Leave unassigned for now" — the API still lists it as required.
  roundId?: string
  propertyName?: string
  phone?: string
  landline?: string
  email?: string
  serviceAreaId?: string
  propertyType?: PropertyType
  cleaningFrequency?: CleaningFrequency
  paymentMethod?: PaymentMethod
  serviceId?: string
  // CONTRACT-DIFF: multiple services per property (OpenAPI not yet regenerated).
  serviceIds?: string[]
  accessNotes?: string
  riskNotes?: string
}

// CONTRACT-DIFF: POST /setup/step/9/bulk (bulk-import handoff). One row per property;
// serviceAreaId is required here (optional on the single-property endpoint). Landline and
// `serviceIds` (plural) are accepted since the audit follow-up (2026-10-22).
export type SetupStep9BulkItem = {
  customerName: string
  fullAddress: string
  postcode: string
  serviceAreaId: string
  roundId: string
  price: number
  propertyName?: string
  phone?: string
  landline?: string
  email?: string
  propertyType?: PropertyType
  cleaningFrequency?: CleaningFrequency
  paymentMethod?: PaymentMethod
  serviceId?: string
  serviceIds?: string[]
  accessNotes?: string
  riskNotes?: string | null
}

export type SetupStep9BulkInput = {
  properties: SetupStep9BulkItem[]
  /** Replaying the same key returns the original result instead of importing again. */
  idempotencyKey?: string
}

/** `row` is the 0-based index in the submitted `properties` array. */
export type SetupStep9BulkRowError = { row: number; field: string; message: string }

/**
 * Audit follow-up 2026-10-22: partial success. 201 when anything was created (or on an
 * idempotent replay); 400 only when every row failed — the 400 body carries `errors` too.
 */
export type SetupStep9BulkResult = {
  created: number
  failed?: number
  results: {
    customer: { id: string }
    property: { id: string }
    servicePlan: { id: string }
  }[]
  errors?: SetupStep9BulkRowError[]
  idempotent?: true
}

export type SetupStep9Bundle = {
  customer: {
    id: string
    name: string
    phone?: string | null
    landline?: string | null
    email?: string | null
  }
  property: {
    id: string
    propertyName?: string | null
    addressLine: string
    postcode: string
    propertyType?: string | null
    serviceAreaId?: string | null
    accessNotes?: string | null
    riskNotes?: string | null
    roundId?: string | null
  }
  servicePlan: {
    id: string
    price: string
    cleaningFrequency?: CleaningFrequency | null
    paymentMethod?: PaymentMethod | null
    serviceId?: string | null
  }
}

export type SetupStep10AssignmentInput = {
  roundId: string
  technicianIds: string[]
}

export type SetupStep10Input = {
  assignments: SetupStep10AssignmentInput[]
}

export type SetupStep10Assignment = {
  roundId: string
  roundName: string
  defaultDay?: string | null
  serviceAreaName?: string | null
  propertyCount: number
  technicianIds: string[]
  technicians: { id: string; name: string }[]
}

export type SetupStep10Result = {
  totalRounds: number
  technicianCount: number
  unassignedCount: number
  assignments: SetupStep10Assignment[]
  workload: { technicianId: string; name: string; roundCount: number }[]
}

export type SetupStep11Input = {
  startDate: string
  cycleWeeks: number
  generateAll?: boolean
  roundIds?: string[]
}

export type SetupStep11Status = {
  activated: boolean
  visitsGenerated: number
}

export type SetupStep11Result = {
  visitsGenerated: number
}

export type SetupStep12ChecklistItem = {
  label: string
  complete: boolean
}

export type SetupStep12Result = {
  checklist: SetupStep12ChecklistItem[]
  allComplete: boolean
}

export function deriveTechnicianAppStatus(
  technician: Pick<components['schemas']['Technician'], 'profileId' | 'active'>,
): TechnicianAppStatus {
  if (technician.profileId == null) return 'PENDING_INVITE'
  return technician.active === false ? 'INACTIVE' : 'ACTIVE'
}
