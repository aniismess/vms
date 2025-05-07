import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVolunteers, getVolunteerById, updateVolunteerInDb, deleteVolunteerFromDb, cancelVolunteerInDb, type VolunteerData } from './supabase-service'

export const QUERY_KEYS = {
  VOLUNTEERS: "volunteers",
  VOLUNTEER: "volunteer",
} as const


export function useVolunteers() {
  return useQuery({
    queryKey: [QUERY_KEYS.VOLUNTEERS],
    queryFn: getVolunteers,
    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000, 
  })
}

export function useVolunteer(saiConnectId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.VOLUNTEER, saiConnectId],
    queryFn: () => getVolunteerById(saiConnectId),
    enabled: !!saiConnectId,
    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000, 
  })
}


export function useUpdateVolunteer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VolunteerData }) => updateVolunteerInDb(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEERS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEER, id] })
    },
  })
}

export function useDeleteVolunteer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteVolunteerFromDb,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEERS] })
    },
  })
}

export function useCancelVolunteer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelVolunteerInDb,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEERS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VOLUNTEER, id] })
    },
  })
} 