import { useMutation } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'
import type { PropertyCreateInput } from '@/api/types'

export function useCreateProperty() {
  return useMutation({
    mutationFn: (input: PropertyCreateInput) => propertiesApi.createProperty(input),
  })
}
