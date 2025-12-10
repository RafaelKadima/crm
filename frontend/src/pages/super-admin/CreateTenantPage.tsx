import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  ChevronLeft,
  User,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useCreateTenant, usePlans, useFeatures } from '@/hooks/useSuperAdmin'

export function CreateTenantPage() {
  const navigate = useNavigate()
  const createTenant = useCreateTenant()
  const { data: plans } = usePlans()
  const { data: features } = useFeatures()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'basic',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    whatsapp_number: '',
    ia_enabled: false,
    features: [] as string[],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    console.log('Enviando dados:', formData)
    
    try {
      const result = await createTenant.mutateAsync(formData)
      console.log('Resultado:', result)
      setSuccess(true)
      setTimeout(() => {
        navigate('/super-admin/tenants')
      }, 1500)
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error)
      const message = error?.response?.data?.message || error?.message || 'Erro ao criar empresa'
      setError(message)
    }
  }

  const toggleFeature = (key: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter(f => f !== key)
        : [...prev.features, key],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
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
                <h1 className="text-xl font-bold">Nova Empresa</h1>
                <p className="text-sm text-gray-400">Criar um novo tenant no sistema</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Sucesso */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-300">Empresa criada com sucesso! Redirecionando...</p>
            </motion.div>
          )}

          {/* Dados da Empresa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Dados da Empresa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Empresa XYZ"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="empresa-xyz"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Plano *</label>
                <select
                  required
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
          </motion.div>

          {/* Administrador */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              Administrador da Empresa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="admin@empresa.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Senha *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Módulos Disponíveis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {features && Object.entries(features).map(([key, feature]: [string, any]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFeature(key)}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    formData.features.includes(key)
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-gray-700/30 border-gray-600/50 hover:border-gray-500'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    formData.features.includes(key) ? 'bg-blue-500/30' : 'bg-gray-600/30'
                  }`}>
                    {formData.features.includes(key) && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{feature.name}</p>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* IA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
          >
            <label className="flex items-center gap-4 cursor-pointer">
              <div
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.ia_enabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    formData.ia_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </div>
              <div>
                <p className="font-medium">Habilitar IA SDR</p>
                <p className="text-sm text-gray-400">Permite que a empresa use agentes de IA para vendas</p>
              </div>
            </label>
          </motion.div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              to="/super-admin/tenants"
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={createTenant.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {createTenant.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Criar Empresa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

