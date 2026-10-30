import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PHOTO_PAGE_SIZE, photosApi, type PhotoType } from '@/api/photos.api'
import { queryKeys } from '@/lib/query-keys'

// Signed URLs expire after an hour: refetch when the tab regains focus, and treat the data
// as stale after 50 minutes so a long-open gallery never shows dead links.
const PHOTO_QUERY_OPTIONS = {
  refetchOnWindowFocus: 'always',
  staleTime: 50 * 60 * 1000,
  placeholderData: keepPreviousData,
} as const

export function usePropertyPhotos(propertyId: string, { type, page = 1 }: { type?: PhotoType; page?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.photos.property(propertyId, type, page),
    queryFn: ({ signal }) => photosApi.property(propertyId, { type, page, pageSize: PHOTO_PAGE_SIZE }, signal),
    enabled: Boolean(propertyId),
    ...PHOTO_QUERY_OPTIONS,
  })
}

export function useTechnicianPhotos(technicianId: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.photos.technician(technicianId, page),
    queryFn: ({ signal }) => photosApi.technician(technicianId, { page, pageSize: PHOTO_PAGE_SIZE }, signal),
    enabled: Boolean(technicianId),
    ...PHOTO_QUERY_OPTIONS,
  })
}

export function useVisitPhotos(visitId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.photos.visit(visitId ?? ''),
    queryFn: ({ signal }) => photosApi.visit(visitId as string, signal),
    enabled: Boolean(visitId),
    ...PHOTO_QUERY_OPTIONS,
  })
}
