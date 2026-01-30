import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Save,
  Building2,
  Store,
  UserCog,
  Warehouse,
} from 'lucide-react'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import { useIntegrations } from '@/hooks/useIntegrations'

export function ProfileSettingsPage() {
  const { user, setAuth, token, tenant } = useAuthStore()
  const { data: integrations } = useIntegrations()

  const [loading, setLoading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Verifica se existe integracao Linx ativa
  const hasLinxIntegration = integrations?.some(
    (i) => i.slug === 'linx' && i.is_active
  ) || false

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    // Campos Linx
    linx_empresa_id: '',
    linx_vendedor_id: '',
    linx_loja_id: '',
    linx_showroom_id: '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Carrega dados do perfil
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        linx_empresa_id: user.linx_empresa_id || '',
        linx_vendedor_id: user.linx_vendedor_id || '',
        linx_loja_id: user.linx_loja_id || '',
        linx_showroom_id: user.linx_showroom_id || '',
      })
    }
  }, [user])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.put('/profile', profileData)
      
      // Atualiza o store local
      if (response.data.user && token && tenant) {
        setAuth(token, response.data.user, tenant)
      }
      
      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao atualizar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      setError('As senhas não coincidem')
      return
    }

    if (passwordData.new_password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres')
      return
    }

    setChangingPassword(true)
    setError(null)
    setSuccess(null)

    try {
      await api.post('/profile/change-password', passwordData)
      
      setSuccess('Senha alterada com sucesso!')
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    vendedor: 'Vendedor',
    marketing: 'Marketing',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-purple-500" />
          Meu Perfil
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais e senha
        </p>
      </div>

      {/* Mensagens */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">{success}</p>
        </motion.div>
      )}

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

      {/* Card do Usuário */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-accent hover:bg-accent rounded-full border-2 border-border transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user?.name}</h3>
            <p className="text-muted-foreground">{user?.email}</p>
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
              {roleLabels[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>

        {/* Formulário de Perfil */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <h4 className="font-medium text-muted-foreground border-b border-border pb-2">
            Informações Pessoais
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-muted-foreground mb-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* Campos Linx - apenas se tiver integracao ativa */}
          {hasLinxIntegration && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                Dados de Integracao Linx
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Preencha seus dados do sistema Linx para que os leads sejam enviados corretamente.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">ID Empresa (Linx)</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileData.linx_empresa_id}
                      onChange={(e) => setProfileData({ ...profileData, linx_empresa_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="Ex: 123"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">ID Vendedor (Linx)</label>
                  <div className="relative">
                    <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileData.linx_vendedor_id}
                      onChange={(e) => setProfileData({ ...profileData, linx_vendedor_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="Ex: 456"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">ID Loja (Linx)</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileData.linx_loja_id}
                      onChange={(e) => setProfileData({ ...profileData, linx_loja_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="Ex: 789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-1">ID Showroom (Linx)</label>
                  <div className="relative">
                    <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profileData.linx_showroom_id}
                      onChange={(e) => setProfileData({ ...profileData, linx_showroom_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="Ex: 101"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Perfil
            </button>
          </div>
        </form>
      </div>

      {/* Alterar Senha */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <h4 className="font-medium text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Alterar Senha
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Senha Atual</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  required
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={passwordData.new_password_confirmation}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password_confirmation: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Alterar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

