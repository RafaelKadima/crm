import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('should start unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.tenant).toBeNull()
  })

  it('should set auth correctly', () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      is_active: true,
      tenant_id: 't1',
    }
    const tenant = { id: 't1', name: 'Test Tenant', slug: 'test', plan: 'professional' }

    useAuthStore.getState().setAuth('test-token', user as any, tenant as any)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe('test-token')
    expect(state.user?.email).toBe('test@example.com')
    expect(state.tenant?.name).toBe('Test Tenant')
  })

  it('should clear state on logout', () => {
    useAuthStore.getState().setAuth('token', { id: '1' } as any)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
  })

  it('should update user partially', () => {
    useAuthStore.getState().setAuth('token', {
      id: '1',
      name: 'Old Name',
      email: 'test@example.com',
    } as any)

    useAuthStore.getState().updateUser({ name: 'New Name' })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('New Name')
    expect(state.user?.email).toBe('test@example.com')
  })
})
