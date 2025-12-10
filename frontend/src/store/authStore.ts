import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Tenant } from '@/types'

interface AuthState {
  token: string | null
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User, tenant?: Tenant) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      isAuthenticated: false,

      setAuth: (token, user, tenant) => set({
        token,
        user,
        tenant,
        isAuthenticated: true,
      }),

      logout: () => set({
        token: null,
        user: null,
        tenant: null,
        isAuthenticated: false,
      }),

      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

