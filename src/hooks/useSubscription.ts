import { useQuery, useMutation } from '@tanstack/react-query'
import { api, SubscriptionData } from '../lib/api'

export type { SubscriptionData }

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  })
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: () => api.createCheckoutSession(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => api.createPortalSession(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })
}
