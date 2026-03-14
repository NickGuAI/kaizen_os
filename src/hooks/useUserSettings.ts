import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, UserSettings } from '../lib/api'

export function useUserSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['userSettings'],
    queryFn: () => api.getUserSettings(),
    enabled: options?.enabled ?? true,
  })
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<UserSettings>) => api.updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] })
    },
  })
}
