import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'
import type {
  NoteCreateInput,
  PauseServiceInput,
  PropertyCreateInput,
  PropertyUpdateInput,
} from '@/api/types'
import {
  invalidateCustomers,
  invalidateRounds,
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
      void invalidateCustomers(queryClient)
      if (input.roundId !== undefined || input.cleaningFrequency !== undefined) {
        void invalidateRounds(queryClient)
      }
    },
  })
}

export function usePauseProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PauseServiceInput }) =>
      propertiesApi.pause(id, input),
    onSuccess: () => invalidateCustomers(queryClient),
  })
}

export function useResumeProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => propertiesApi.resume(id),
    onSuccess: () => invalidateCustomers(queryClient),
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
