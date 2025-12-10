import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  X,
  Loader2,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCcw,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import api from '@/api/axios'

interface Permission {
  id: string
  key: string
  name: string
  description?: string
}

interface Module {
  key: string
  name: string
  permissions: Permission[]
}

interface UserPermissionsModalProps {
  user: {
    id: string
    name: string
    role: string
  }
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

export function UserPermissionsModal({ user, open, onClose, onUpdated }: UserPermissionsModalProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({})
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([])
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({})

  // Carrega dados
  useEffect(() => {
    if (open && user) {
      loadData()
    }
  }, [open, user])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Carrega permissões disponíveis e do usuário em paralelo
      const [permissionsRes, userPermissionsRes] = await Promise.all([
        api.get('/permissions'),
        api.get(`/users/${user.id}/permissions`),
      ])

      setModules(permissionsRes.data)
      setRolePermissions(userPermissionsRes.data.role_permissions)
      setCustomPermissions(userPermissionsRes.data.custom_permissions)
      setEffectivePermissions(userPermissionsRes.data.effective_permissions)
      setPendingChanges({})
      
      // Expande todos os módulos por padrão
      const allModules = new Set(permissionsRes.data.map((m: Module) => m.key))
      setExpandedModules(allModules)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = (moduleKey: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleKey)) {
        newSet.delete(moduleKey)
      } else {
        newSet.add(moduleKey)
      }
      return newSet
    })
  }

  const isPermissionEnabled = (permKey: string): boolean => {
    // Primeiro verifica se há uma mudança pendente
    if (pendingChanges.hasOwnProperty(permKey)) {
      return pendingChanges[permKey]
    }
    // Senão, verifica as permissões efetivas
    return effectivePermissions.includes(permKey)
  }

  const isRoleDefault = (permKey: string): boolean => {
    return rolePermissions.includes(permKey)
  }

  const hasCustomChange = (permKey: string): boolean => {
    return customPermissions.hasOwnProperty(permKey) || pendingChanges.hasOwnProperty(permKey)
  }

  const togglePermission = (permKey: string) => {
    const currentValue = isPermissionEnabled(permKey)
    const isDefault = isRoleDefault(permKey)

    setPendingChanges(prev => {
      const newChanges = { ...prev }
      
      // Se está voltando para o padrão do role, remove da lista de mudanças
      if ((isDefault && !currentValue) || (!isDefault && currentValue)) {
        // Voltando ao padrão
        delete newChanges[permKey]
      } else {
        // Customizando
        newChanges[permKey] = !currentValue
      }
      
      return newChanges
    })
  }

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setSuccess('Nenhuma alteração para salvar')
      setTimeout(() => setSuccess(null), 2000)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const permissions = Object.entries(pendingChanges).map(([key, granted]) => ({
        key,
        granted,
      }))

      const response = await api.put(`/users/${user.id}/permissions`, { permissions })
      
      setEffectivePermissions(response.data.effective_permissions)
      setSuccess('Permissões salvas com sucesso!')
      setPendingChanges({})
      onUpdated?.()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar permissões')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar para as permissões padrão do cargo?')) {
      return
    }

    setResetting(true)
    setError(null)
    try {
      const response = await api.post(`/users/${user.id}/permissions/reset`)
      
      setEffectivePermissions(response.data.effective_permissions)
      setCustomPermissions({})
      setPendingChanges({})
      setSuccess('Permissões resetadas para o padrão!')
      onUpdated?.()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao resetar permissões')
    } finally {
      setResetting(false)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    vendedor: 'Vendedor',
    marketing: 'Marketing',
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Permissões de {user.name}</h3>
                <p className="text-sm text-gray-400">
                  Cargo: <span className="text-purple-400">{roleLabels[user.role] || user.role}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400">Permissão ativa</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                    <span className="text-gray-400">Permissão inativa</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span className="text-gray-400">Padrão do cargo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Unlock className="w-3 h-3 text-amber-400" />
                    <span className="text-gray-400">Customizado</span>
                  </div>
                </div>

                {/* Módulos e Permissões */}
                {modules.map((module) => (
                  <div key={module.key} className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                    <button
                      onClick={() => toggleModule(module.key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-700/20 transition-colors"
                    >
                      <span className="font-semibold text-lg">{module.name}</span>
                      {expandedModules.has(module.key) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedModules.has(module.key) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-700/30"
                        >
                          <div className="p-4 space-y-2">
                            {module.permissions.map((permission) => {
                              const enabled = isPermissionEnabled(permission.key)
                              const isDefault = isRoleDefault(permission.key)
                              const isCustom = hasCustomChange(permission.key)
                              const isPending = pendingChanges.hasOwnProperty(permission.key)

                              return (
                                <div
                                  key={permission.key}
                                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                    isPending 
                                      ? 'bg-amber-500/10 border border-amber-500/30' 
                                      : 'bg-gray-800/50 border border-transparent hover:border-gray-600/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
                                    <div>
                                      <p className="font-medium text-sm">{permission.name}</p>
                                      <p className="text-xs text-gray-500">{permission.key}</p>
                                    </div>
                                    {isDefault && !isCustom && (
                                      <Lock className="w-3 h-3 text-purple-400" title="Padrão do cargo" />
                                    )}
                                    {isCustom && (
                                      <Unlock className="w-3 h-3 text-amber-400" title="Customizado" />
                                    )}
                                  </div>

                                  <button
                                    onClick={() => togglePermission(permission.key)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${
                                      enabled ? 'bg-green-600' : 'bg-gray-600'
                                    }`}
                                  >
                                    <motion.div
                                      layout
                                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm ${
                                        enabled ? 'right-1' : 'left-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-sm text-green-300">{success}</p>
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                disabled={resetting || loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Resetar para Padrão
              </button>

              <div className="flex items-center gap-3">
                {hasPendingChanges && (
                  <span className="text-sm text-amber-400">
                    {Object.keys(pendingChanges).length} alteração(ões) pendente(s)
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasPendingChanges}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

