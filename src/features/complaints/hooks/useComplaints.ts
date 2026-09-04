import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintsApi } from '@/api/complaints.api'
import type { ComplaintCreateInput, ComplaintListParams } from '@/api/complaints.api'
import { invalidateComplaints, queryKeys } from '@/lib/query-keys'

export function useComplaints(params: ComplaintListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.complaints.list({
      status: params.status,
      search: params.search,
      assignedTo: params.assignedTo,
      technicianId: params.technicianId,
    }),
    queryFn: ({ signal }) => complaintsApi.list(params, signal),
    enabled,
  })
}

export function useComplaint(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.complaints.detail(id),
    queryFn: ({ signal }) => complaintsApi.get(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ComplaintCreateInput) => complaintsApi.create(input),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useMarkComplaintInReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => complaintsApi.markInReview(id),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useScheduleComplaintRevisit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, revisitDate }: { id: string; revisitDate: string }) =>
      complaintsApi.scheduleRevisit(id, revisitDate),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useResolveComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => complaintsApi.resolve(id),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useReopenComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => complaintsApi.reopen(id),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useAssignComplaintTechnician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, technicianId }: { id: string; technicianId: string }) =>
      complaintsApi.assignTechnician(id, technicianId),
    onSuccess: () => invalidateComplaints(queryClient),
  })
}

export function useComplaintMessages(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.complaints.messages(id),
    queryFn: ({ signal }) => complaintsApi.listMessages(id, signal),
    enabled: enabled && Boolean(id),
  })
}

export function useAddComplaintMessage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => complaintsApi.addMessage(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.messages(id) })
    },
  })
}
