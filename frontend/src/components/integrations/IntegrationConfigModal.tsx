import { useState, useEffect } from 'react'
import { X, Save, Loader2, Plus, Trash2, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import type { ExternalIntegration, IntegrationTemplate, AuthType, IntegrationType, TriggerEvent } from '@/types'
import { useCreateIntegration, useUpdateIntegration, useIntegrationTemplates, integrationTypeInfo, authTypeInfo, triggerEventInfo } from '@/hooks/useIntegrations'
import { usePipelines } from '@/hooks/usePipelines'
import { toast } from 'sonner'

interface IntegrationConfigModalProps {
  isOpen: boolean
  onClose: () => void
  integration?: ExternalIntegration | null
}

interface FormData {
  name: string
  slug: string
  description: string
  type: IntegrationType
  endpoint_url: string
  http_method: 'POST' | 'PUT' | 'PATCH'
  auth_type: AuthType
  auth_config: {
    // Basic Auth
    username?: string
    password?: string
    // Bearer Token
    token?: string
    // API Key
    header_name?: string
    key?: string
    // Linx Smart API
    subscription_key?: string
    ambiente?: string
    cnpj_empresa?: string
  }
  trigger_on: TriggerEvent[]
  trigger_stages: string[]
  mapping: Record<string, string>
}

const initialFormData: FormData = {
  name: '',
  slug: '',
  description: '',
  type: 'crm',
  endpoint_url: '',
  http_method: 'POST',
  auth_type: 'none',
  auth_config: {},
  trigger_on: ['lead_created'],
  trigger_stages: [],
  mapping: {},
}

export function IntegrationConfigModal({ isOpen, onClose, integration }: IntegrationConfigModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [activeTab, setActiveTab] = useState<'general' | 'auth' | 'triggers' | 'mapping'>('general')
  const [newMappingKey, setNewMappingKey] = useState('')
  const [newMappingValue, setNewMappingValue] = useState('')
  const [showStageSelector, setShowStageSelector] = useState(false)

  const { data: templates } = useIntegrationTemplates()
  const { data: pipelines } = usePipelines()
  const createMutation = useCreateIntegration()
  const updateMutation = useUpdateIntegration()

  const isEditing = !!integration

  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        slug: integration.slug || '',
        description: integration.description || '',
        type: integration.type,
        endpoint_url: integration.endpoint_url,
        http_method: integration.http_method,
        auth_type: integration.auth_type,
        auth_config: integration.auth_config || {},
        trigger_on: integration.trigger_on || ['lead_created'],
        trigger_stages: integration.trigger_stages || [],
        mapping: integration.mappings?.[0]?.mapping || {},
      })
      // Se tem stages configurados, expande o seletor
      if (integration.trigger_stages && integration.trigger_stages.length > 0) {
        setShowStageSelector(true)
      }
    } else {
      setFormData(initialFormData)
      setShowStageSelector(false)
    }
  }, [integration])

  const handleTemplateSelect = (template: IntegrationTemplate) => {
    setFormData({
      ...formData,
      name: template.name,
      slug: template.id,
      description: template.description,
      type: template.type,
      auth_type: template.auth_type,
      trigger_on: template.trigger_on,
      mapping: template.mapping,
    })
    toast.success(`Template "${template.name}" aplicado`)
  }

  const handleTriggerToggle = (trigger: TriggerEvent) => {
    const newTriggers = formData.trigger_on.includes(trigger)
      ? formData.trigger_on.filter(t => t !== trigger)
      : [...formData.trigger_on, trigger]

    // Se desmarcar lead_stage_changed, limpa os estágios selecionados
    if (trigger === 'lead_stage_changed' && formData.trigger_on.includes(trigger)) {
      setFormData({ ...formData, trigger_on: newTriggers, trigger_stages: [] })
      setShowStageSelector(false)
    } else {
      setFormData({ ...formData, trigger_on: newTriggers })
    }
  }

  const handleStageToggle = (stageId: string) => {
    const newStages = formData.trigger_stages.includes(stageId)
      ? formData.trigger_stages.filter(s => s !== stageId)
      : [...formData.trigger_stages, stageId]
    setFormData({ ...formData, trigger_stages: newStages })
  }

  // Obtem todos os estágios de todos os pipelines
  const allStages = pipelines?.flatMap(p =>
    p.stages.map(s => ({ ...s, pipelineName: p.name, pipelineId: p.id }))
  ) || []

  const handleAddMapping = () => {
    if (newMappingKey && newMappingValue) {
      setFormData({
        ...formData,
        mapping: { ...formData.mapping, [newMappingKey]: newMappingValue }
      })
      setNewMappingKey('')
      setNewMappingValue('')
    }
  }

  const handleRemoveMapping = (key: string) => {
    const newMapping = { ...formData.mapping }
    delete newMapping[key]
    setFormData({ ...formData, mapping: newMapping })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isEditing && integration) {
        await updateMutation.mutateAsync({
          id: integration.id,
          ...formData,
        })
        toast.success('Integração atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Integração criada com sucesso!')
      }
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao salvar integração')
    }
  }

  if (!isOpen) return null

  const isLoading = createMutation.isPending || updateMutation.isPending

  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'border-b-2 border-purple-500 text-purple-400'
        : 'text-muted-foreground hover:text-foreground'
    }`

  const inputClass = 'w-full px-3 py-2 bg-accent border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-purple-500 focus:outline-none'
  const labelClass = 'block text-sm font-medium text-muted-foreground mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-muted rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/80">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            {isEditing ? 'Editar Integração' : 'Nova Integração'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates (only for new integrations) */}
        {!isEditing && templates && templates.length > 0 && (
          <div className="px-6 py-3 bg-muted border-b border-border">
            <p className="text-sm text-muted-foreground mb-2">Templates disponíveis:</p>
            <div className="flex gap-2">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="px-3 py-1.5 text-sm bg-accent border border-border rounded-lg text-foreground hover:bg-accent hover:border-purple-500 transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/50">
          <button type="button" onClick={() => setActiveTab('general')} className={tabClass('general')}>
            Geral
          </button>
          <button type="button" onClick={() => setActiveTab('auth')} className={tabClass('auth')}>
            Autenticação
          </button>
          <button type="button" onClick={() => setActiveTab('triggers')} className={tabClass('triggers')}>
            Gatilhos
          </button>
          <button type="button" onClick={() => setActiveTab('mapping')} className={tabClass('mapping')}>
            Mapeamento
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      placeholder="Nome da integração"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      className={inputClass}
                      placeholder="linx, webhook-crm..."
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className={inputClass}
                    rows={2}
                    placeholder="Descrição opcional da integração"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as IntegrationType })}
                      className={inputClass}
                    >
                      {Object.entries(integrationTypeInfo).map(([value, info]) => (
                        <option key={value} value={value}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Método HTTP *</label>
                    <select
                      value={formData.http_method}
                      onChange={e => setFormData({ ...formData, http_method: e.target.value as 'POST' | 'PUT' | 'PATCH' })}
                      className={inputClass}
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>URL do Endpoint *</label>
                  <input
                    type="url"
                    value={formData.endpoint_url}
                    onChange={e => setFormData({ ...formData, endpoint_url: e.target.value })}
                    className={inputClass}
                    placeholder="https://api.exemplo.com/webhook"
                    required
                  />
                </div>
              </div>
            )}

            {/* Auth Tab */}
            {activeTab === 'auth' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Tipo de Autenticação</label>
                  <select
                    value={formData.auth_type}
                    onChange={e => setFormData({ ...formData, auth_type: e.target.value as AuthType, auth_config: {} })}
                    className={inputClass}
                  >
                    {Object.entries(authTypeInfo).map(([value, info]) => (
                      <option key={value} value={value}>{info.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-muted-foreground">{authTypeInfo[formData.auth_type].description}</p>
                </div>

                {formData.auth_type === 'basic' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg border border-border">
                    <div>
                      <label className={labelClass}>Usuário</label>
                      <input
                        type="text"
                        value={formData.auth_config.username || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, username: e.target.value }
                        })}
                        className={inputClass}
                        placeholder="usuario"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Senha</label>
                      <input
                        type="password"
                        value={formData.auth_config.password || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, password: e.target.value }
                        })}
                        className={inputClass}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {formData.auth_type === 'bearer' && (
                  <div className="p-4 bg-accent/50 rounded-lg border border-border">
                    <label className={labelClass}>Token</label>
                    <input
                      type="password"
                      value={formData.auth_config.token || ''}
                      onChange={e => setFormData({
                        ...formData,
                        auth_config: { ...formData.auth_config, token: e.target.value }
                      })}
                      className={inputClass}
                      placeholder="Bearer token"
                    />
                  </div>
                )}

                {formData.auth_type === 'api_key' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg border border-border">
                    <div>
                      <label className={labelClass}>Nome do Header</label>
                      <input
                        type="text"
                        value={formData.auth_config.header_name || 'X-API-Key'}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, header_name: e.target.value }
                        })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>API Key</label>
                      <input
                        type="password"
                        value={formData.auth_config.key || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, key: e.target.value }
                        })}
                        className={inputClass}
                        placeholder="sua-api-key"
                      />
                    </div>
                  </div>
                )}

                {formData.auth_type === 'linx_smart' && (
                  <div className="space-y-4 p-4 bg-accent/50 rounded-lg border border-border">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-300">
                        <strong>Linx Smart API:</strong> Configure as credenciais obtidas no Portal Linx.
                        O token será gerado e gerenciado automaticamente pelo CRM.
                      </p>
                    </div>

                    <div>
                      <label className={labelClass}>Subscription Key *</label>
                      <input
                        type="text"
                        value={formData.auth_config.subscription_key || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, subscription_key: e.target.value }
                        })}
                        className={inputClass}
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Obtido no Portal Linx (Perfil → Assinaturas)</p>
                    </div>

                    <div>
                      <label className={labelClass}>Ambiente *</label>
                      <select
                        value={formData.auth_config.ambiente || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, ambiente: e.target.value }
                        })}
                        className={inputClass}
                      >
                        <option value="">Selecione o ambiente</option>
                        <option value="HOMOLOGACAO">Homologação</option>
                        <option value="PRODUCAO">Produção</option>
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">Use HOMOLOGACAO para testes e PRODUCAO para ambiente real</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Usuário *</label>
                        <input
                          type="text"
                          value={formData.auth_config.username || ''}
                          onChange={e => setFormData({
                            ...formData,
                            auth_config: { ...formData.auth_config, username: e.target.value }
                          })}
                          className={inputClass}
                          placeholder="usuario.linx"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Senha *</label>
                        <input
                          type="password"
                          value={formData.auth_config.password || ''}
                          onChange={e => setFormData({
                            ...formData,
                            auth_config: { ...formData.auth_config, password: e.target.value }
                          })}
                          className={inputClass}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>CNPJ da Empresa (opcional)</label>
                      <input
                        type="text"
                        value={formData.auth_config.cnpj_empresa || ''}
                        onChange={e => setFormData({
                          ...formData,
                          auth_config: { ...formData.auth_config, cnpj_empresa: e.target.value }
                        })}
                        className={inputClass}
                        placeholder="00.000.000/0000-00"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Obrigatório apenas para multi-lojas</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Triggers Tab */}
            {activeTab === 'triggers' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione quando os dados devem ser enviados para esta integração:
                </p>

                {(Object.entries(triggerEventInfo) as [TriggerEvent, typeof triggerEventInfo[TriggerEvent]][]).map(([event, info]) => (
                  <div key={event} className="space-y-2">
                    <label
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.trigger_on.includes(event)
                          ? 'bg-purple-500/10 border-purple-500/50'
                          : 'bg-accent/30 border-border hover:bg-accent/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.trigger_on.includes(event)}
                        onChange={() => handleTriggerToggle(event)}
                        className="w-4 h-4 text-purple-500 bg-accent border-border rounded focus:ring-purple-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-foreground">{info.label}</p>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                      </div>
                      {/* Botao para expandir seletor de estagios */}
                      {event === 'lead_stage_changed' && formData.trigger_on.includes(event) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setShowStageSelector(!showStageSelector)
                          }}
                          className="ml-2 p-1 hover:bg-accent rounded transition-colors"
                        >
                          {showStageSelector ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </label>

                    {/* Seletor de estagios */}
                    {event === 'lead_stage_changed' && formData.trigger_on.includes(event) && showStageSelector && (
                      <div className="ml-8 p-4 bg-accent/30 border border-border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">
                            Estágios que disparam a integração:
                          </p>
                          {formData.trigger_stages.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, trigger_stages: [] })}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Limpar seleção
                            </button>
                          )}
                        </div>

                        {formData.trigger_stages.length === 0 && (
                          <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                            Nenhum estágio selecionado = dispara para qualquer mudança de estágio
                          </p>
                        )}

                        {pipelines && pipelines.length > 0 ? (
                          <div className="space-y-4 max-h-60 overflow-y-auto">
                            {pipelines.map(pipeline => (
                              <div key={pipeline.id} className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                  {pipeline.name}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {pipeline.stages.map(stage => (
                                    <label
                                      key={stage.id}
                                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                        formData.trigger_stages.includes(stage.id)
                                          ? 'bg-purple-500/20 border border-purple-500/50'
                                          : 'bg-muted-foreground/20/30 border border-transparent hover:bg-accent/50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.trigger_stages.includes(stage.id)}
                                        onChange={() => handleStageToggle(stage.id)}
                                        className="w-3 h-3 text-purple-500 bg-accent border-border rounded focus:ring-purple-500"
                                      />
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: stage.color }}
                                      />
                                      <span className="text-sm text-foreground truncate">
                                        {stage.name}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum pipeline encontrado</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mapping Tab */}
            {activeTab === 'mapping' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure como os campos do CRM serão enviados para o sistema externo:
                </p>

                {/* Existing mappings */}
                <div className="space-y-2">
                  {Object.entries(formData.mapping).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border border-border">
                      <span className="flex-1 font-mono text-sm text-foreground">{key}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="flex-1 font-mono text-sm text-purple-400">{value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMapping(key)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(formData.mapping).length === 0 && (
                    <p className="text-sm text-muted-foreground italic py-2">Nenhum mapeamento configurado</p>
                  )}
                </div>

                {/* Add new mapping */}
                <div className="flex items-end gap-2 pt-4 border-t border-border">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Campo externo</label>
                    <input
                      type="text"
                      value={newMappingKey}
                      onChange={e => setNewMappingKey(e.target.value)}
                      className={inputClass}
                      placeholder="nome_externo"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Campo CRM</label>
                    <input
                      type="text"
                      value={newMappingValue}
                      onChange={e => setNewMappingValue(e.target.value)}
                      className={inputClass}
                      placeholder="contact.name"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMapping}
                    className="p-2 bg-purple-600 text-foreground rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newMappingKey || !newMappingValue}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-accent/30 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-muted-foreground">Campos disponíveis:</strong><br />
                    contact.name, contact.phone, contact.email, owner.linx_empresa_id,
                    owner.linx_vendedor_id, owner.linx_loja_id, owner.linx_showroom_id,
                    channel.name, tenant.name, lead.value, stage.name
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-foreground rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IntegrationConfigModal
