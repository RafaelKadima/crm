import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, dashboardApi } from '@/api/endpoints'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (response) => {
      const { access_token, user, tenant } = response.data

      // Garante isolamento entre sessões: se o logout anterior não passou pelo
      // clear (ex.: token expirou e redirecionou direto pro login), o cache
      // pode ter dados do tenant antigo. Clear antes de autenticar.
      queryClient.clear()

      setAuth(access_token, user as User, tenant)
      queryClient.invalidateQueries({ queryKey: ['me'] })

      // Prefetch dashboard data para carregar instantaneamente
      queryClient.prefetchQuery({
        queryKey: ['dashboard'],
        queryFn: () => dashboardApi.getData(),
        staleTime: 1000 * 60 * 2, // 2 minutes
      })

      navigate('/')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
      navigate('/login')
    },
    onError: () => {
      // Even if API fails, logout locally
      logout()
      queryClient.clear()
      navigate('/login')
    },
  })
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await authApi.me()
      return response.data.user
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useAuth() {
  const { user, isAuthenticated, tenant } = useAuthStore()
  return { user, isAuthenticated, tenant }
}

