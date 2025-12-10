import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  MapPin,
  CreditCard,
  FileText,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency } from '@/lib/utils'
import api from '@/api/axios'
import type { CustomerData, Lead, Product } from '@/types'

interface CustomerDataFormProps {
  lead: Lead
  onSave?: (data: CustomerData) => void
  onClose?: () => void
  isRequired?: boolean // Se true, campos obrigatórios precisam ser preenchidos
}

interface LeadWithProducts extends Lead {
  products?: (Product & { pivot: { quantity: number; unit_price: number } })[]
}

const paymentMethods = [
  { id: 'pix', label: 'PIX' },
  { id: 'credit_card', label: 'Cartão de Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito' },
  { id: 'boleto', label: 'Boleto Bancário' },
  { id: 'financing', label: 'Financiamento' },
  { id: 'cash', label: 'Dinheiro' },
]

const installmentOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function CustomerDataForm({ lead, onSave, onClose, isRequired = false }: CustomerDataFormProps) {
  const [formData, setFormData] = useState<Partial<CustomerData>>({
    cpf: '',
    cnpj: '',
    rg: '',
    birth_date: '',
    address: '',
    address_number: '',
    address_complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    payment_method: '',
    installments: 1,
    notes: '',
  })
  const [leadProducts, setLeadProducts] = useState<LeadWithProducts['products']>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchingCep, setIsSearchingCep] = useState(false)
  const [cpfValid, setCpfValid] = useState<boolean | null>(null)
  const [cnpjValid, setCnpjValid] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'payment'>('personal')
  const [saved, setSaved] = useState(false)

  // Load existing data
  useEffect(() => {
    loadCustomerData()
  }, [lead.id])

  const loadCustomerData = async () => {
    try {
      const response = await api.get(`/leads/${lead.id}/customer-data`)
      if (response.data.customer_data) {
        setFormData({
          ...response.data.customer_data,
          birth_date: response.data.customer_data.birth_date?.split('T')[0] || '',
        })
      }
      if (response.data.lead?.products) {
        setLeadProducts(response.data.lead.products)
      }
    } catch (error) {
      console.error('Error loading customer data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchCep = async () => {
    const cep = formData.zip_code?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) return

    setIsSearchingCep(true)
    try {
      const response = await api.post('/utils/search-cep', { cep })
      setFormData((prev) => ({
        ...prev,
        address: response.data.address || prev.address,
        neighborhood: response.data.neighborhood || prev.neighborhood,
        city: response.data.city || prev.city,
        state: response.data.state || prev.state,
      }))
    } catch (error) {
      console.error('Error searching CEP:', error)
    } finally {
      setIsSearchingCep(false)
    }
  }

  const handleValidateCpf = async () => {
    const cpf = formData.cpf?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) {
      setCpfValid(false)
      return
    }

    try {
      const response = await api.post('/utils/validate-cpf', { cpf })
      setCpfValid(response.data.valid)
      if (response.data.formatted) {
        setFormData((prev) => ({ ...prev, cpf: response.data.formatted }))
      }
    } catch (error) {
      setCpfValid(false)
    }
  }

  const handleValidateCnpj = async () => {
    const cnpj = formData.cnpj?.replace(/\D/g, '')
    if (!cnpj || cnpj.length !== 14) {
      setCnpjValid(false)
      return
    }

    try {
      const response = await api.post('/utils/validate-cnpj', { cnpj })
      setCnpjValid(response.data.valid)
      if (response.data.formatted) {
        setFormData((prev) => ({ ...prev, cnpj: response.data.formatted }))
      }
    } catch (error) {
      setCnpjValid(false)
    }
  }

  // Validação dos campos obrigatórios
  const validateRequiredFields = (): string[] => {
    const errors: string[] = []
    if (isRequired) {
      if (!formData.cpf && !formData.cnpj) {
        errors.push('CPF ou CNPJ é obrigatório')
      }
      if (!formData.address) {
        errors.push('Endereço é obrigatório')
      }
      if (!formData.city) {
        errors.push('Cidade é obrigatória')
      }
      if (!formData.state) {
        errors.push('Estado é obrigatório')
      }
    }
    return errors
  }

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleSave = async () => {
    // Validar campos obrigatórios
    const errors = validateRequiredFields()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])

    setIsSaving(true)
    try {
      const response = await api.post(`/leads/${lead.id}/customer-data`, formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSave?.(response.data.customer_data)
    } catch (error) {
      console.error('Error saving customer data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
  }

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`
  }

  // Calculate total
  const totalValue = leadProducts?.reduce((sum, product) => {
    return sum + (product.pivot.unit_price * product.pivot.quantity)
  }, 0) || lead.value || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Required Form Alert */}
      {isRequired && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Preenchimento Obrigatório
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Preencha os dados do cliente para concluir o fechamento. CPF/CNPJ e endereço são obrigatórios.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                Campos obrigatórios não preenchidos:
              </p>
              <ul className="text-sm text-red-600 dark:text-red-500 mt-1 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Products Summary */}
      {leadProducts && leadProducts.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <Package className="h-4 w-4" />
            Produtos de interesse
          </h4>
          <div className="space-y-2">
            {leadProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <span>{product.name}</span>
                <span className="font-medium">
                  {product.pivot.quantity}x {formatCurrency(product.pivot.unit_price)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg text-green-600">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'personal', label: 'Dados Pessoais', icon: User },
          { id: 'address', label: 'Endereço', icon: MapPin },
          { id: 'payment', label: 'Pagamento', icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal Data Tab */}
      {activeTab === 'personal' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* CPF */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CPF</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={formData.cpf || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, cpf: formatCpf(e.target.value) })
                    setCpfValid(null)
                  }}
                  onBlur={handleValidateCpf}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={cn(
                    cpfValid === true && 'border-green-500',
                    cpfValid === false && 'border-red-500'
                  )}
                />
                {cpfValid !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {cpfValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CNPJ (se empresa)</label>
            <div className="relative">
              <Input
                value={formData.cnpj || ''}
                onChange={(e) => {
                  setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })
                  setCnpjValid(null)
                }}
                onBlur={handleValidateCnpj}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className={cn(
                  cnpjValid === true && 'border-green-500',
                  cnpjValid === false && 'border-red-500'
                )}
              />
              {cnpjValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cnpjValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RG */}
          <div className="space-y-2">
            <label className="text-sm font-medium">RG</label>
            <Input
              value={formData.rg || ''}
              onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
              placeholder="Número do RG"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data de Nascimento</label>
            <Input
              type="date"
              value={formData.birth_date || ''}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
        </motion.div>
      )}

      {/* Address Tab */}
      {activeTab === 'address' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* CEP */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CEP</label>
            <div className="flex gap-2">
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => setFormData({ ...formData, zip_code: formatCep(e.target.value) })}
                placeholder="00000-000"
                maxLength={9}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchCep}
                disabled={isSearchingCep || !formData.zip_code || formData.zip_code.replace(/\D/g, '').length !== 8}
              >
                {isSearchingCep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Avenida..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Número</label>
              <Input
                value={formData.address_number || ''}
                onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                placeholder="Nº"
              />
            </div>
          </div>

          {/* Complement */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Complemento</label>
            <Input
              value={formData.address_complement || ''}
              onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
              placeholder="Apto, Bloco, Sala..."
            />
          </div>

          {/* Neighborhood */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bairro</label>
            <Input
              value={formData.neighborhood || ''}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              placeholder="Bairro"
            />
          </div>

          {/* City / State */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="">UF</option>
                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Forma de Pagamento</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: method.id })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                    formData.payment_method === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted hover:border-muted-foreground/20'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Installments */}
          {(formData.payment_method === 'credit_card' || formData.payment_method === 'financing') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Parcelas</label>
              <select
                value={formData.installments || 1}
                onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                {installmentOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatCurrency(totalValue / n)}
                    {n === 1 ? ' (à vista)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre o pagamento ou entrega..."
              className="w-full px-3 py-2 border rounded-lg bg-background min-h-[100px] resize-y"
            />
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-green-600 flex items-center gap-2 text-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Dados salvos!
            </motion.span>
          )}
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Salvar Dados
          </Button>
        </div>
      </div>
    </div>
  )
}

