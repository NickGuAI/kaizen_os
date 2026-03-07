import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, CreateCardInput, UpdateCardInput } from '../lib/api'

// Theme queries
export function useThemes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['themes'],
    queryFn: () => api.getThemes(),
    enabled: options?.enabled ?? true,
  })
}

// Card queries
export function useCard(id: string) {
  return useQuery({
    queryKey: ['card', id],
    queryFn: () => api.getCard(id),
    enabled: !!id,
  })
}

export function useCardChildren(id: string, type?: string, status?: string) {
  return useQuery({
    queryKey: ['cardChildren', id, type, status],
    queryFn: () => api.getCardChildren(id, type, status),
    enabled: !!id,
  })
}

export function useCardHierarchy(id: string) {
  return useQuery({
    queryKey: ['cardHierarchy', id],
    queryFn: () => api.getCardHierarchy(id),
    enabled: !!id,
  })
}

export function useCardsByType(type: string) {
  return useQuery({
    queryKey: ['cards', type],
    queryFn: () => api.getCardsByType(type),
    enabled: !!type,
  })
}

export function useReviewOptions() {
  return useQuery({
    queryKey: ['reviewOptions'],
    queryFn: () => api.getReviewOptions(),
  })
}

// Global Vetoes (Don't-Do List)
export function useGlobalVetoes() {
  return useQuery({
    queryKey: ['globalVetoes'],
    queryFn: () => api.getGlobalVetoes(),
  })
}

// Backlog
export function useBacklog(themeId: string) {
  return useQuery({
    queryKey: ['backlog', themeId],
    queryFn: () => api.getBacklog(themeId),
    enabled: !!themeId,
  })
}

// Ops Review (weekly review step 2)
export function useOpsReview(weekStart: string) {
  return useQuery({
    queryKey: ['opsReview', weekStart],
    queryFn: () => api.getOpsReview(weekStart),
    enabled: !!weekStart,
  })
}

// Backlog Review (weekly review step 3)
export function useBacklogReview() {
  return useQuery({
    queryKey: ['backlogReview'],
    queryFn: () => api.getBacklogReview(),
  })
}

// Active Actions
export function useActiveActions() {
  return useQuery({
    queryKey: ['activeActions'],
    queryFn: () => api.getActiveActions(),
  })
}

// Theme Hours (Property 6: Time Aggregation)
export function useAllThemeHours(seasonId?: string) {
  return useQuery({
    queryKey: ['themeHours', seasonId],
    queryFn: () => api.getAllThemeHours(seasonId),
  })
}

export function useThemeHours(themeId: string, seasonId?: string) {
  return useQuery({
    queryKey: ['themeHours', themeId, seasonId],
    queryFn: () => api.getThemeHours(themeId, seasonId),
    enabled: !!themeId,
  })
}

// All Theme Conditions
export function useAllConditions() {
  return useQuery({
    queryKey: ['conditions'],
    queryFn: () => api.getAllConditions(),
  })
}

// Card mutations
export function useCreateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCardInput) => api.createCard(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['activeActions'] })
      queryClient.invalidateQueries({ queryKey: ['globalVetoes'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: ['cardChildren', variables.parentId] })
        queryClient.invalidateQueries({ queryKey: ['backlog', variables.parentId] })
      }
    },
  })
}

export function useUpdateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCardInput }) =>
      api.updateCard(id, data),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['card', id] })
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['activeActions'] })
      queryClient.invalidateQueries({ queryKey: ['opsReview'] })
      queryClient.invalidateQueries({ queryKey: ['backlogReview'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
      if (result.parentId) {
        queryClient.invalidateQueries({ queryKey: ['cardChildren', result.parentId] })
        queryClient.invalidateQueries({ queryKey: ['backlog', result.parentId] })
      }
    },
  })
}

export function useDeleteCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, cascade = false }: { id: string; cascade?: boolean }) => 
      api.deleteCard(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      queryClient.invalidateQueries({ queryKey: ['activeActions'] })
      queryClient.invalidateQueries({ queryKey: ['globalVetoes'] })
      queryClient.invalidateQueries({ queryKey: ['activeSeasonVetoes'] })
      queryClient.invalidateQueries({ queryKey: ['cardChildren'] })
      // Note: We can't invalidate specific wipStatus/backlog without knowing parentId
      // The component should handle this by passing parentId to the mutation
    },
  })
}

export function useCardChildCount(id: string) {
  return useQuery({
    queryKey: ['cardChildCount', id],
    queryFn: () => api.getCardChildCount(id),
    enabled: !!id,
  })
}
