import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  ChevronLeft,
  User,
  Users,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Plus,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useTenant, useUpdateTenant, useUpdateTenantFeatures, usePlans, useFeatures, useModuleFunctions, useCreateSuperAdminUser } from '@/hooks/useSuperAdmin'
import { ChevronDown } from 'lucide-react'

export function TenantDetailsPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { data: tenantData, isLoading, refetch } = useTenant(tenantId || '')
  const updateTenant = useUpdateTenant()
  const updateFeatures = useUpdateTenantFeatures()
  const { data: plans } = usePlans()
  const { data: availableFeatures } = useFeatures()
  const { data: moduleFunctions } = useModuleFunctions()

  const createUser = useCreateSuperAdminUser()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'features' | 'users'>('info')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'basic',
    whatsapp_number: '',
    ia_enabled: false,
    is_active: true,
  })

  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    phone: '',
  })

  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({})
  const [selectedFunctions, setSelectedFunctions] = useState<Record<string, string[]>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Carregar dados do tenant
  useEffect(() => {
    if (tenantData?.tenant) {
      const tenant = tenantData.tenant
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        plan: tenant.plan || 'basic',
        whatsapp_number: tenant.whatsapp_number || '',
        ia_enabled: tenant.ia_enabled || false,
        is_active: tenant.is_active ?? true,
      })

      // Carregar features ativas e suas sub-funções
      if (tenantData.features) {
        const featuresState: Record<string, boolean> = {}
        const functionsState: Record<string, string[]> = {}

        Object.entries(tenantData.features).forEach(([key, feature]: [string, any]) => {
          featuresState[key] = feature.is_enabled
          // Carregar sub-funções habilitadas
          functionsState[key] = feature.enabled_functions || []
        })

        setSelectedFeatures(featuresState)
        setSelectedFunctions(functionsState)
      }
    }
  }, [tenantData])

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      await updateTenant.mutateAsync({
        tenantId: tenantId!,
        data: formData,
      })
      setSuccess(true)
      refetch()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao atualizar empresa'
      setError(message)
    }
  }

  const handleSaveFeatures = async () => {
    setError(null)
    setSuccess(false)

    try {
      const features = Object.entries(selectedFeatures).map(([key, enabled]) => {
        const functions = selectedFunctions[key] || []
        const allFunctions = Object.keys(moduleFunctions?.[key] || {})
        const allSelected = functions.length === allFunctions.length && allFunctions.length > 0

        return {
          key,
          enabled,
          all_functions: allSelected || functions.length === 0, // Se não selecionou nada, libera tudo
          enabled_functions: allSelected ? undefined : functions,
        }
      })

      await updateFeatures.mutateAsync({
        tenantId: tenantId!,
        features,
      })
      setSuccess(true)
      refetch()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao atualizar features'
      setError(message)
    }
  }

  const toggleFeature = (key: string) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [key]: !prev[key],
    }))

    // Se desabilitou, limpa as sub-funções
    if (selectedFeatures[key]) {
      setSelectedFunctions(prev => ({
        ...prev,
        [key]: [],
      }))
    }
  }

  const toggleFunction = (moduleKey: string, functionKey: string) => {
    setSelectedFunctions(prev => {
      const current = prev[moduleKey] || []
      const isSelected = current.includes(functionKey)

      return {
        ...prev,
        [moduleKey]: isSelected
          ? current.filter(f => f !== functionKey)
          : [...current, functionKey],
      }
    })
  }

  const toggleAllFunctions = (moduleKey: string) => {
    const allFunctions = Object.keys(moduleFunctions?.[moduleKey] || {})
    const current = selectedFunctions[moduleKey] || []
    const allSelected = allFunctions.length === current.length && current.length > 0

    setSelectedFunctions(prev => ({
      ...prev,
      [moduleKey]: allSelected ? [] : allFunctions,
    }))
  }

  const toggleModuleExpanded = (moduleKey: string) => {
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await createUser.mutateAsync({
        tenant_id: tenantId!,
        name: newUserData.name,
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role,
        phone: newUserData.phone || undefined,
      })
      setShowCreateUserModal(false)
      setNewUserData({ name: '', email: '', password: '', role: 'vendedor', phone: '' })
      setSuccess(true)
      refetch()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Erro ao criar usuário'
      setError(message)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!tenantData?.tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Empresa não encontrada</h2>
          <Link to="/super-admin/tenants" className="text-blue-400 hover:underline">
            Voltar para lista
          </Link>
        </div>
      </div>
    )
  }

  const tenant = tenantData.tenant

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/super-admin/tenants"
                className="p-2 hover:bg-accent/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{tenant.name}</h1>
                  <p className="text-sm text-muted-foreground">ID: {tenant.id}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                tenant.is_active 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {tenant.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-muted/50 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.users_count || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.leads_count || 0}</p>
                <p className="text-sm text-muted-foreground">Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.contacts_count || 0}</p>
                <p className="text-sm text-muted-foreground">Contatos</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">Data Criação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'info', label: 'Informações', icon: Building2 },
            { id: 'features', label: 'Módulos', icon: Sparkles },
            { id: 'users', label: 'Usuários', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-accent/50 text-muted-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mensagens */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3 mb-6"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3 mb-6"
          >
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-300">Alterações salvas com sucesso!</p>
          </motion.div>
        )}

        {/* Tab: Informações */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="bg-muted/50 rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Dados da Empresa
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Nome da Empresa</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Plano</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      {plans?.map((plan: any) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="5511999999999"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ia_enabled: !formData.ia_enabled })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.ia_enabled ? 'bg-blue-600' : 'bg-muted-foreground/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.ia_enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span>IA SDR Habilitada</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.is_active ? 'bg-green-600' : 'bg-muted-foreground/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.is_active ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span>Empresa Ativa</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Link
                  to="/super-admin/tenants"
                  className="px-6 py-2 bg-accent hover:bg-accent rounded-lg transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={updateTenant.isPending}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {updateTenant.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Tab: Módulos (Features) */}
        {activeTab === 'features' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-muted/50 rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Módulos e Funcionalidades
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Selecione os módulos e funcionalidades que esta empresa terá acesso. Clique em "Configurar funções" para escolher quais funcionalidades de cada módulo estarão disponíveis.
              </p>

              <div className="space-y-4">
                {availableFeatures && Object.entries(availableFeatures).map(([key, feature]: [string, any]) => {
                  const hasFunctions = moduleFunctions?.[key] && Object.keys(moduleFunctions[key]).length > 0
                  const isExpanded = expandedModules.has(key)
                  const functions = moduleFunctions?.[key] || {}
                  const selectedFuncs = selectedFunctions[key] || []
                  const allFunctions = Object.keys(functions)
                  const allSelected = allFunctions.length === selectedFuncs.length && selectedFuncs.length > 0

                  return (
                    <div key={key} className="border border-border rounded-lg overflow-hidden">
                      {/* Header do módulo */}
                      <div className={`flex items-center justify-between p-4 ${
                        selectedFeatures[key] ? 'bg-blue-500/10' : 'bg-accent/30'
                      }`}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleFeature(key)}
                            className={`p-2 rounded-lg transition-colors ${
                              selectedFeatures[key] ? 'bg-blue-500/30' : 'bg-border'
                            }`}
                          >
                            {selectedFeatures[key] ? (
                              <Check className="w-4 h-4 text-blue-400" />
                            ) : (
                              <div className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>

                        {hasFunctions && selectedFeatures[key] && (
                          <button
                            type="button"
                            onClick={() => toggleModuleExpanded(key)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
                          >
                            {isExpanded ? 'Ocultar funções' : 'Configurar funções'}
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {/* Sub-funções (colapsáveis) */}
                      {hasFunctions && selectedFeatures[key] && isExpanded && (
                        <div className="border-t border-border p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-muted-foreground">Selecione as funcionalidades:</p>
                            <button
                              type="button"
                              onClick={() => toggleAllFunctions(key)}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(functions).map(([funcKey, funcData]: [string, any]) => (
                              <label
                                key={funcKey}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  selectedFuncs.includes(funcKey)
                                    ? 'bg-blue-500/20 border border-blue-500/50'
                                    : 'bg-accent/20 border border-border hover:border-muted-foreground/30'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFuncs.includes(funcKey)}
                                  onChange={() => toggleFunction(key, funcKey)}
                                  className="hidden"
                                />
                                <div className={`w-4 h-4 rounded flex items-center justify-center ${
                                  selectedFuncs.includes(funcKey) ? 'bg-blue-500' : 'bg-muted-foreground/20'
                                }`}>
                                  {selectedFuncs.includes(funcKey) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <span className="text-sm">{funcData.name}</span>
                                  {funcData.description && (
                                    <p className="text-xs text-muted-foreground">{funcData.description}</p>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>

                          {selectedFuncs.length === 0 && (
                            <p className="text-xs text-amber-400 mt-3">
                              Nenhuma função selecionada = todas as funções liberadas
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={handleSaveFeatures}
                disabled={updateFeatures.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {updateFeatures.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Módulos
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab: Usuários */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-muted/50 rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Usuários da Empresa
                </h2>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Usuário
                </button>
              </div>
              
              {tenant.users && tenant.users.length > 0 ? (
                <div className="space-y-3">
                  {tenant.users.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-accent/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400'
                            : user.role === 'gestor'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-muted-foreground'
                        }`}>
                          {user.role}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Nenhum usuário cadastrado nesta empresa.
                  </p>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm font-medium mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Criar primeiro usuário
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Criar Usuário */}
      <AnimatePresence>
        {showCreateUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-muted rounded-xl border border-border w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  Novo Usuário
                </h3>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="p-1 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Nome *</label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">E-mail *</label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="usuario@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Senha *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none pr-10"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Função *</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="admin">Administrador</option>
                    <option value="gestor">Gestor</option>
                    <option value="vendedor">Vendedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="5511999999999"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createUser.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createUser.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Criar Usuário
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

