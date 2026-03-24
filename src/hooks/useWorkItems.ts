import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'
import type { WorkItemWithOverlays } from '../components/daily/DailyDashboard'

const PARKING_KEY = ['workitems', 'parking']

// Query for parking lot items (no plannedForDate)
export function useParkingLot() {
  return useQuery<WorkItemWithOverlays[]>({
    queryKey: PARKING_KEY,
    queryFn: async () => {
      const res = await apiFetch('/api/workitems/parking', {})
      if (!res.ok) throw new Error('Failed to fetch parking lot')
      return res.json()
    },
  })
}

// Mutation: create a parking lot item (no due date)
export function useCreateParkingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      const res = await apiFetch('/api/workitems/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }), // no dueAt = parking lot
      })
      if (!res.ok) throw new Error('Failed to create parking lot item')
      return res.json()
    },
    onMutate: async ({ title }) => {
      await queryClient.cancelQueries({ queryKey: PARKING_KEY })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(PARKING_KEY)
      const optimisticKey = `temp_${Date.now()}`

      const optimisticItem: WorkItemWithOverlays = {
        kind: 'task',
        source: 'google_tasks',
        key: optimisticKey,
        title,
        status: 'open',
      }

      queryClient.setQueryData<WorkItemWithOverlays[]>(PARKING_KEY, (old) =>
        old ? [...old, optimisticItem] : [optimisticItem]
      )

      return { previous, optimisticKey }
    },
    onSuccess: (createdItem, vars, ctx) => {
      queryClient.setQueryData<WorkItemWithOverlays[]>(PARKING_KEY, (old) => {
        const current = old ?? []
        const withoutOrphanTemp =
          ctx?.optimisticKey
            ? current
            : current.filter(
                (item) => !(item.key.startsWith('temp_') && item.title === vars.title),
              )

        if (withoutOrphanTemp.length === 0) return [createdItem]

        if (!ctx?.optimisticKey) {
          return withoutOrphanTemp.some((item) => item.key === createdItem.key)
            ? withoutOrphanTemp
            : [...withoutOrphanTemp, createdItem]
        }

        const hasOptimistic = withoutOrphanTemp.some(item => item.key === ctx.optimisticKey)
        if (!hasOptimistic) {
          return withoutOrphanTemp.some(item => item.key === createdItem.key)
            ? withoutOrphanTemp
            : [...withoutOrphanTemp, createdItem]
        }

        return withoutOrphanTemp.map(item =>
          item.key === ctx.optimisticKey ? { ...createdItem } : item
        )
      })
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PARKING_KEY, ctx.previous)
      queryClient.invalidateQueries({ queryKey: PARKING_KEY })
    },
    onSettled: () => {
      // Delay slightly so eventual-consistency writes can settle before refetch.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: PARKING_KEY })
      }, 1000)
    },
  })
}

// Mutation: pull item from parking lot to a specific date
export function usePullToDate(date: string) {
  const queryClient = useQueryClient()
  const dayKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({ workItemKey }: { workItemKey: string }) => {
      const res = await apiFetch('/api/workitems/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemKey, newDate: date }),
      })
      if (!res.ok) throw new Error('Failed to pull item to date')
      return res.json()
    },
    onMutate: async ({ workItemKey }) => {
      await queryClient.cancelQueries({ queryKey: PARKING_KEY })
      await queryClient.cancelQueries({ queryKey: dayKey })
      const previousParking = queryClient.getQueryData<WorkItemWithOverlays[]>(PARKING_KEY)
      const previousDay = queryClient.getQueryData<WorkItemWithOverlays[]>(dayKey)
      const movedItem = previousParking?.find(item => item.key === workItemKey)

      queryClient.setQueryData<WorkItemWithOverlays[]>(PARKING_KEY, (old) =>
        old?.filter(item => item.key !== workItemKey)
      )

      if (movedItem) {
        queryClient.setQueryData<WorkItemWithOverlays[]>(dayKey, (old) => {
          if (old?.some(item => item.key === workItemKey)) {
            return old
          }

          const nextItem: WorkItemWithOverlays = {
            ...movedItem,
            dueAt: `${date}T00:00:00.000Z`,
          }

          return old ? [...old, nextItem] : [nextItem]
        })
      }

      return { previousParking, previousDay }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousParking) queryClient.setQueryData(PARKING_KEY, ctx.previousParking)
      if (ctx?.previousDay) queryClient.setQueryData(dayKey, ctx.previousDay)
      queryClient.invalidateQueries({ queryKey: PARKING_KEY })
      queryClient.invalidateQueries({ queryKey: dayKey })
    },
    onSettled: () => {
      // Delay slightly so eventual-consistency writes can settle before refetch.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: PARKING_KEY })
        queryClient.invalidateQueries({ queryKey: dayKey })
      }, 1000)
    },
  })
}

// Mutation: park an item from a day list back into the parking lot
export function useParkWorkItem(date: string) {
  const queryClient = useQueryClient()
  const dayKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({ workItemKey }: { workItemKey: string }) => {
      const res = await apiFetch('/api/workitems/park', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemKey }),
      })
      if (!res.ok) throw new Error('Failed to park item')
      return res.json()
    },
    onMutate: async ({ workItemKey }) => {
      await queryClient.cancelQueries({ queryKey: dayKey })
      await queryClient.cancelQueries({ queryKey: PARKING_KEY })

      const previousDay = queryClient.getQueryData<WorkItemWithOverlays[]>(dayKey)
      const previousParking = queryClient.getQueryData<WorkItemWithOverlays[]>(PARKING_KEY)
      const parkedItem = previousDay?.find((item) => item.key === workItemKey)

      queryClient.setQueryData<WorkItemWithOverlays[]>(dayKey, (old) =>
        old?.filter((item) => item.key !== workItemKey)
      )

      if (parkedItem) {
        queryClient.setQueryData<WorkItemWithOverlays[]>(PARKING_KEY, (old) => {
          if (old?.some((item) => item.key === workItemKey)) {
            return old
          }

          const nextItem: WorkItemWithOverlays = {
            ...parkedItem,
            dueAt: undefined,
          }

          return old ? [...old, nextItem] : [nextItem]
        })
      }

      return { previousDay, previousParking }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousDay) queryClient.setQueryData(dayKey, ctx.previousDay)
      if (ctx?.previousParking) queryClient.setQueryData(PARKING_KEY, ctx.previousParking)
      queryClient.invalidateQueries({ queryKey: dayKey })
      queryClient.invalidateQueries({ queryKey: PARKING_KEY })
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dayKey })
        queryClient.invalidateQueries({ queryKey: PARKING_KEY })
      }, 1000)
    },
  })
}

// Mutation: complete a parking lot item (no date context)
export function useCompleteParkingItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ workItemKey }: { workItemKey: string }) => {
      const res = await apiFetch('/api/workitems/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemKey }),
      })
      if (!res.ok) throw new Error('Failed to complete parking lot item')
      return res.json()
    },
    onMutate: async ({ workItemKey }) => {
      await queryClient.cancelQueries({ queryKey: PARKING_KEY })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(PARKING_KEY)
      queryClient.setQueryData<WorkItemWithOverlays[]>(PARKING_KEY, (old) =>
        old?.map(item =>
          item.key === workItemKey
            ? { ...item, status: 'done' as const, completedAt: new Date().toISOString() }
            : item
        )
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(PARKING_KEY, ctx.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PARKING_KEY })
    },
  })
}

// Optimistic mutation for completing a work item
export function useCompleteWorkItem(date: string) {
  const queryClient = useQueryClient()
  const queryKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({ workItemKey, completedInEventKey }: { workItemKey: string; completedInEventKey?: string }) => {
      const res = await apiFetch('/api/workitems/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemKey, completedInEventKey }),
      })
      if (!res.ok) throw new Error('Failed to complete workitem')
      return res.json()
    },
    onMutate: async ({ workItemKey }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(queryKey)

      queryClient.setQueryData<WorkItemWithOverlays[]>(queryKey, (old) =>
        old?.map((item) =>
          item.key === workItemKey
            ? { ...item, status: 'done' as const, completedAt: new Date().toISOString() }
            : item
        )
      )

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Optimistic mutation for linking a work item to a card
export function useLinkWorkItem(date: string) {
  const queryClient = useQueryClient()
  const queryKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({ workItemKey, cardId }: { workItemKey: string; cardId: string | null }) => {
      const res = await apiFetch('/api/workitems/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workItemKey, cardId }),
      })
      if (!res.ok) throw new Error('Failed to link workitem')
      return res.json()
    },
    onMutate: async ({ workItemKey, cardId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(queryKey)

      queryClient.setQueryData<WorkItemWithOverlays[]>(queryKey, (old) =>
        old?.map((item) =>
          item.key === workItemKey
            ? { ...item, linkedCardId: cardId ?? undefined }
            : item
        )
      )

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Optimistic mutation for setting daily focus (top 3)
export function useSetDailyFocus(date: string) {
  const queryClient = useQueryClient()
  const focusKey = ['workitems', 'focus', date]

  return useMutation({
    mutationFn: async ({ topKeys }: { topKeys: string[] }) => {
      const res = await apiFetch('/api/workitems/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, topKeys: topKeys.slice(0, 3) }),
      })
      if (!res.ok) throw new Error('Failed to set focus')
      return res.json()
    },
    onMutate: async ({ topKeys }) => {
      await queryClient.cancelQueries({ queryKey: focusKey })
      const previous = queryClient.getQueryData<{ date: string; topKeys: string[] }>(focusKey)

      queryClient.setQueryData(focusKey, { date, topKeys: topKeys.slice(0, 3) })

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(focusKey, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: focusKey })
    },
  })
}

// Optimistic mutation for reordering playlist items
export function useReorderPlaylist(date: string) {
  const queryClient = useQueryClient()
  const queryKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({ orderedKeys }: { orderedKeys: string[] }) => {
      const res = await apiFetch('/api/workitems/playlist/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, orderedKeys }),
      })
      if (!res.ok) throw new Error('Failed to reorder playlist')
      return res.json()
    },
    onMutate: async ({ orderedKeys }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(queryKey)

      // Optimistically reorder items and assign new ranks
      queryClient.setQueryData<WorkItemWithOverlays[]>(queryKey, (old) => {
        if (!old) return old
        const keyToItem = new Map(old.map(item => [item.key, item]))
        const reordered: WorkItemWithOverlays[] = []
        // Place reordered items first with new ranks
        orderedKeys.forEach((key, index) => {
          const item = keyToItem.get(key)
          if (item) {
            reordered.push({ ...item, playlistRank: index + 1 })
            keyToItem.delete(key)
          }
        })
        // Append any remaining items (e.g. top3 items not in playlist)
        for (const item of keyToItem.values()) {
          reordered.push(item)
        }
        return reordered
      })

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Optimistic mutation for creating a work item
export function useCreateWorkItem(date: string) {
  const queryClient = useQueryClient()
  const queryKey = ['workitems', 'day', date]

  return useMutation({
    mutationFn: async ({
      title,
      dueAt,
      capturedInEventKey,
      cardId,
    }: {
      title: string
      dueAt: string
      capturedInEventKey?: string
      cardId?: string
    }) => {
      const res = await apiFetch('/api/workitems/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, dueAt, capturedInEventKey, cardId }),
      })
      if (!res.ok) throw new Error('Failed to create task')
      return res.json()
    },
    onMutate: async ({ title, cardId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<WorkItemWithOverlays[]>(queryKey)

      // Create optimistic work item with temporary key
      const optimisticItem: WorkItemWithOverlays = {
        kind: 'task',
        source: 'google_tasks',
        key: `temp_${Date.now()}`,
        title,
        status: 'open',
        dueAt: `${date}T00:00:00.000Z`,
        linkedCardId: cardId,
      }

      queryClient.setQueryData<WorkItemWithOverlays[]>(queryKey, (old) =>
        old ? [...old, optimisticItem] : [optimisticItem]
      )

      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
