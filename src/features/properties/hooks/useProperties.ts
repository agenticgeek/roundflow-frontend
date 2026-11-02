import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type PropertyServicesInput } from '@/api/properties.api'
import type {
  NoteCreateInput,
  PauseServiceInput,
  PropertyCreateInput,
  PropertyUpdateInput,
} from '@/api/types'
import {
  invalidateCustomers,
  invalidateRounds,
  invalidateServiceChange,
  queryKeys,
} from '@/lib/query-keys'

export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PropertyCreateInput) => propertiesApi.createProperty(input),
    onSuccess: (_data, input) => {
      void invalidateCustomers(queryClient)
      if (input.roundId) {
        void invalidateRounds(queryClient)
      }
    },
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PropertyUpdateInput }) =>
      propertiesApi.updateProperty(id, input),
    onSuccess: (_data, { input }) => {
      // A round / frequency move changes the header, Today's Work and the planner (GAP-018).
      if (input.roundId !== undefined || input.cleaningFrequency !== undefined) {
        return invalidateServiceChange(queryClient)
      }
      return invalidateCustomers(queryClient)
    },
  })
}

export function usePauseProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PauseServiceInput }) =>
      propertiesApi.pause(id, input),
    // Pause cancels visits: the header, Today's Work and the planner all change (GAP-020).
    onSuccess: () => invalidateServiceChange(queryClient),
  })
}

export function useResumeProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => propertiesApi.resume(id),
    onSuccess: () => invalidateServiceChange(queryClient),
  })
}

/** PUT /properties/:id/services — changes plans, visits and prices, so everything service-related refetches. */
export function useSetPropertyServices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PropertyServicesInput }) =>
      propertiesApi.setServices(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['properties', 'services-history', id] })
      return invalidateServiceChange(queryClient)
    },
  })
}

export function usePropertyServicesHistory(propertyId: string, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.properties.servicesHistory(propertyId, page),
    queryFn: ({ signal }) => propertiesApi.servicesHistory(propertyId, page, signal),
    enabled: enabled && Boolean(propertyId),
  })
}

export function useProperty(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.properties.detail(propertyId),
    queryFn: ({ signal }) => propertiesApi.get(propertyId, signal),
    enabled: enabled && Boolean(propertyId),
  })
}

export function usePropertyNotes(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.properties.notes(propertyId),
    queryFn: ({ signal }) => propertiesApi.listNotes(propertyId, signal),
    enabled: enabled && Boolean(propertyId),
  })
}

export function useAddPropertyNote(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteCreateInput) => propertiesApi.addNote(propertyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.properties.notes(propertyId),
      })
      void invalidateCustomers(queryClient)
    },
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => propertiesApi.remove(id),
    onSuccess: () => {
      void invalidateCustomers(queryClient)
      void invalidateRounds(queryClient)
    },
  })
}
