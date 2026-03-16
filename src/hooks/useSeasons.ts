import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, CreateSeasonInput } from '../lib/api'
import type { SeasonVeto } from '../lib/api'

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => api.getSeasons(),
  })
}

export function useActiveSeason() {
  return useQuery({
    queryKey: ['activeSeason'],
    queryFn: () => api.getActiveSeason(),
  })
}

export function useActiveSeasonVetoes() {
  return useQuery<SeasonVeto[]>({
    queryKey: ['activeSeasonVetoes'],
    queryFn: () => api.getActiveSeasonVetoes(),
  })
}

export function useSeason(id: string) {
  return useQuery({
    queryKey: ['season', id],
    queryFn: () => api.getSeason(id),
    enabled: !!id,
  })
}

export function useCreateSeason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSeasonInput) => api.createSeason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })
}

export function useActivateSeason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.activateSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
      queryClient.invalidateQueries({ queryKey: ['season'] })
    },
  })
}

export function useDeactivateSeason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deactivateSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
      queryClient.invalidateQueries({ queryKey: ['season'] })
    },
  })
}

export function useUpdateSeason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSeasonInput> }) =>
      api.updateSeason(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['season', id] })
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
    },
  })
}

export function useSeasonGradings(seasonId: string) {
  return useQuery({
    queryKey: ['seasonGradings', seasonId],
    queryFn: () => api.getSeasonGradings(seasonId),
    enabled: !!seasonId,
  })
}
