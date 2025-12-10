import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { useTenant, useUpdateTenant, useUpdateTenantFeatures, usePlans, useFeatures } from '@/hooks/useSuperAdmin'

export function TenantDetailsPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { data: tenantData, isLoading, refetch } = useTenant(tenantId || '')
  const updateTenant = useUpdateTenant()
  const updateFeatures = useUpdateTenantFeatures()
  const { data: plans } = usePlans()
  const { data: availableFeatures } = useFeatures()

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'features' | 'users'>('info')

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'basic',
    whatsapp_number: '',
    ia_enabled: false,
    is_active: true,
  })

  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({})

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

      // Carregar features ativas
      if (tenantData.features) {
        const featuresState: Record<string, boolean> = {}
        Object.entries(tenantData.features).forEach(([key, feature]: [string, any]) => {
          featuresState[key] = feature.is_enabled
        })
        setSelectedFeatures(featuresState)
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
      const features = Object.entries(selectedFeatures).map(([key, enabled]) => ({
        key,
        enabled,
      }))

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
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/super-admin/tenants"
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{tenant.name}</h1>
                  <p className="text-sm text-gray-400">ID: {tenant.id}</p>
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
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.users_count || 0}</p>
                <p className="text-sm text-gray-400">Usuários</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.leads_count || 0}</p>
                <p className="text-sm text-gray-400">Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenantData.stats?.contacts_count || 0}</p>
                <p className="text-sm text-gray-400">Contatos</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                </p>
                <p className="text-sm text-gray-400">Data Criação</p>
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
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
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
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Dados da Empresa
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Nome da Empresa</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Plano</label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      {plans?.map((plan: any) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
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
                        formData.ia_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                        formData.is_active ? 'bg-green-600' : 'bg-gray-600'
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
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
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
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Módulos Disponíveis
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Selecione os módulos que esta empresa terá acesso. Módulos desativados não aparecerão no menu da empresa.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableFeatures && Object.entries(availableFeatures).map(([key, feature]: [string, any]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFeature(key)}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                      selectedFeatures[key]
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-gray-700/30 border-gray-600/50 hover:border-gray-500'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedFeatures[key] ? 'bg-blue-500/30' : 'bg-gray-600/30'
                    }`}>
                      {selectedFeatures[key] ? (
                        <Check className="w-4 h-4 text-blue-400" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-gray-400">{feature.description}</p>
                    </div>
                  </button>
                ))}
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
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Usuários da Empresa
              </h2>
              
              {tenant.users && tenant.users.length > 0 ? (
                <div className="space-y-3">
                  {tenant.users.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
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
                            : 'bg-gray-500/20 text-gray-400'
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
                <p className="text-gray-400 text-center py-8">
                  Nenhum usuário cadastrado nesta empresa.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

