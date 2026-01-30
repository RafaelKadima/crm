import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Phone,
  Globe,
  MapPin,
  Mail,
  Link2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

export function CompanySettingsPage() {
  const { tenant, setTenant } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsapp_number: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    website: '',
    // Campos Linx
    linx_enabled: false,
    linx_empresa_id: '',
    linx_revenda_id: '',
    linx_api_url: '',
  })

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        slug: tenant.slug || '',
        whatsapp_number: tenant.whatsapp_number || '',
        email: tenant.settings?.email || '',
        phone: tenant.settings?.phone || '',
        address: tenant.settings?.address || '',
        city: tenant.settings?.city || '',
        state: tenant.settings?.state || '',
        website: tenant.settings?.website || '',
        // Campos Linx
        linx_enabled: tenant.linx_enabled || false,
        linx_empresa_id: tenant.linx_empresa_id || '',
        linx_revenda_id: tenant.linx_revenda_id || '',
        linx_api_url: tenant.linx_api_url || '',
      })
    }
  }, [tenant])

  const handleSave = async () => {
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const response = await api.put('/tenant/settings', formData)
      setTenant(response.data.tenant)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500" />
          Dados da Empresa
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure as informações da sua empresa
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">Configurações salvas com sucesso!</p>
        </motion.div>
      )}

      <div className="bg-muted/50 rounded-xl border border-border p-6 space-y-6">
        {/* Informações Básicas */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
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
                disabled
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-400" />
            Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">WhatsApp Business</label>
              <input
                type="text"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                placeholder="5511999999999"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Telefone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 3333-3333"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Globe className="w-4 h-4" />
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.empresa.com"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-400" />
            Endereço
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm text-muted-foreground mb-1">Endereço</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="São Paulo"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Estado</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Integração Linx */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-orange-400" />
            Integração Linx
          </h3>

          {/* Toggle de ativação */}
          <div className="flex items-center justify-between mb-4 p-4 bg-accent/30 rounded-lg">
            <div>
              <p className="font-medium">Integração Ativa</p>
              <p className="text-sm text-muted-foreground">Habilitar envio de leads para o Linx Smart</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, linx_enabled: !formData.linx_enabled })}
              className="p-1"
            >
              {formData.linx_enabled ? (
                <ToggleRight className="w-10 h-10 text-green-400" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Código da Empresa</label>
              <input
                type="text"
                value={formData.linx_empresa_id}
                onChange={(e) => setFormData({ ...formData, linx_empresa_id: e.target.value })}
                placeholder="Ex: 1"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">ID da empresa no Linx Smart</p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Código da Revenda</label>
              <input
                type="text"
                value={formData.linx_revenda_id}
                onChange={(e) => setFormData({ ...formData, linx_revenda_id: e.target.value })}
                placeholder="Ex: 1"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">ID da revenda no Linx Smart</p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">URL da API (opcional)</label>
              <input
                type="url"
                value={formData.linx_api_url}
                onChange={(e) => setFormData({ ...formData, linx_api_url: e.target.value })}
                placeholder="https://api.linx.com.br"
                className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar padrão</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
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
    </div>
  )
}

