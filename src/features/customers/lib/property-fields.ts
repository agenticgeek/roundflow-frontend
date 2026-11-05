import { recordModalsContent } from '@/content/record-modals'
import { isValidUkPostcode } from '@/lib/postcode'

export interface PropertyFieldsValue {
  address: string
  postcode: string
  serviceAreaId: string
  price: string
  roundId: string
}

export const emptyPropertyFields: PropertyFieldsValue = { address: '', postcode: '', serviceAreaId: '', price: '', roundId: '' }

/** First error in the property fields, or null. */
export function validatePropertyFields(value: PropertyFieldsValue, noAreas: boolean): string | null {
  const copy = recordModalsContent.addProperty
  const amount = Number(value.price.replace(/[£,\s]/g, ''))
  if (noAreas) return copy.noServiceAreas
  if (!value.address.trim()) return copy.validation.addressRequired
  if (!value.postcode.trim()) return copy.validation.postcodeRequired
  if (!isValidUkPostcode(value.postcode)) return copy.validation.postcodeInvalid
  if (!value.serviceAreaId) return copy.validation.areaRequired
  if (!Number.isFinite(amount) || amount <= 0) return copy.validation.priceInvalid
  return null
}

/** The API body for a property from the fields (no customer details). */
export function propertyFieldsToInput(value: PropertyFieldsValue) {
  return {
    addressLine: value.address.trim(),
    postcode: value.postcode.trim(),
    serviceAreaId: value.serviceAreaId,
    price: Number(value.price.replace(/[£,\s]/g, '')),
    roundId: value.roundId || null,
  }
}

