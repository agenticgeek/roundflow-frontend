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
  roundId: string
  propertyName?: string
  phone?: string
  email?: string
  serviceAreaId?: string
  propertyType?: PropertyType
  cleaningFrequency?: CleaningFrequency
  paymentMethod?: PaymentMethod
  serviceId?: string
  accessNotes?: string
  riskNotes?: string
}

export type SetupStep9Bundle = {
  customer: {
    id: string
    name: string
    phone?: string | null
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
