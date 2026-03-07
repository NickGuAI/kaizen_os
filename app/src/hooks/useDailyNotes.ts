// Hook for fetching and mutating daily notes (gratitude + mindful moments)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export interface DailyNote {
  date: string
  gratitudeText: string | null
  mindfulMeditated: boolean
  mindfulSteppedAway: boolean
  mindfulClosedGmail: boolean
}

export type DailyNoteUpdate = Partial<Omit<DailyNote, 'date'>> & { date: string }

export function useDailyNotes(date: string) {
  return useQuery<DailyNote>({
    queryKey: ['daily-notes', date],
    queryFn: async () => {
      const res = await apiFetch(`/api/daily-notes?date=${date}`, {})
      if (!res.ok) throw new Error('Failed to fetch daily notes')
      return res.json()
    },
  })
}

export function useUpdateDailyNote(date: string) {
  const queryClient = useQueryClient()
  const queryKey = ['daily-notes', date]

  return useMutation({
    mutationFn: async (update: DailyNoteUpdate) => {
      const res = await apiFetch('/api/daily-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...update, date }),
      })
      if (!res.ok) throw new Error('Failed to update daily notes')
      return res.json() as Promise<DailyNote>
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DailyNote>(queryKey)
      queryClient.setQueryData<DailyNote>(queryKey, (old) => {
        const defaults: DailyNote = { date, gratitudeText: null, mindfulMeditated: false, mindfulSteppedAway: false, mindfulClosedGmail: false }
        return old ? { ...old, ...update } : { ...defaults, ...update }
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
