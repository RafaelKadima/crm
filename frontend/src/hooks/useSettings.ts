import { useCallback, useEffect, useMemo, useState } from 'react'
import { isEqual } from '@/lib/utils'

/**
 * Hook genérico pra gerenciar forms de Settings com:
 *   - load inicial via callback
 *   - track de "isDirty" (baseado em deep equal vs valor original)
 *   - save com loading state + reset pra original
 *   - changesCount pra mostrar no FloatingSaveButton
 *
 * Não acopla a fonte (ConfigPage decide se vai pra /settings, /tenants
 * ou múltiplos endpoints via Promise.all dentro do `onSave`).
 *
 * @example
 *   const { values, set, isDirty, isSaving, save, reset, changesCount } =
 *     useSettings<ProfileForm>({
 *       load: async () => api.get('/auth/me').then((r) => r.data.user),
 *       save: async (next) => {
 *         await Promise.all([
 *           api.put('/users/me', { name: next.name, email: next.email }),
 *           api.put('/notifications', next.notifications),
 *         ])
 *       },
 *     })
 */
interface UseSettingsArgs<T extends Record<string, any>> {
  load: () => Promise<T>
  save: (next: T) => Promise<void>
  /** Re-fetch quando algum dependency muda */
  deps?: any[]
}

export function useSettings<T extends Record<string, any>>({
  load,
  save,
  deps = [],
}: UseSettingsArgs<T>) {
  const [values, setValues] = useState<T | null>(null)
  const [original, setOriginal] = useState<T | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await load()
      setValues(data)
      setOriginal(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const set = useCallback((patch: Partial<T> | ((prev: T) => T)) => {
    setValues((prev) => {
      if (!prev) return prev
      return typeof patch === 'function' ? (patch as any)(prev) : { ...prev, ...patch }
    })
  }, [])

  const reset = useCallback(() => {
    if (original) setValues(original)
  }, [original])

  const handleSave = useCallback(async () => {
    if (!values) return
    setSaving(true)
    setError(null)
    try {
      await save(values)
      setOriginal(values)
    } catch (e) {
      setError(e)
      throw e
    } finally {
      setSaving(false)
    }
  }, [values, save])

  const { isDirty, changesCount } = useMemo(() => {
    if (!values || !original) return { isDirty: false, changesCount: 0 }
    let count = 0
    for (const key of Object.keys(values) as (keyof T)[]) {
      if (!isEqual(values[key], original[key])) count++
    }
    return { isDirty: count > 0, changesCount: count }
  }, [values, original])

  return {
    values,
    set,
    isLoading,
    isSaving,
    isDirty,
    changesCount,
    error,
    save: handleSave,
    reset,
    refetch: fetchData,
  }
}
