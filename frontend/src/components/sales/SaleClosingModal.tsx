import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Loader2,
  Search,
  Calculator,
  CreditCard,
  Percent,
  FileText,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateSale, useSearchProducts } from '@/hooks/useSales'
import type { ProductSearchResult, SaleItemInput } from '@/api/sales'

interface SaleClosingModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  leadName: string
  onSuccess?: () => void
}

type SaleMode = 'simple' | 'detailed'

interface SaleItem extends SaleItemInput {
  id: string // temp id for UI
  product?: ProductSearchResult
}

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Outro' },
]

export function SaleClosingModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}: SaleClosingModalProps) {
  const [mode, setMode] = useState<SaleMode>('simple')
  const [simpleValue, setSimpleValue] = useState('')
  const [items, setItems] = useState<SaleItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [additionalValue, setAdditionalValue] = useState('')
  const [additionalDescription, setAdditionalDescription] = useState('')
  const [discountType, setDiscountType] = useState<'value' | 'percentage'>('value')
  const [discountValue, setDiscountValue] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [installments, setInstallments] = useState('1')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createSaleMutation = useCreateSale()
  const { data: searchResults = [], isLoading: isSearching } = useSearchProducts(searchQuery)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode('simple')
      setSimpleValue('')
      setItems([])
      setSearchQuery('')
      setShowSearch(false)
      setAdditionalValue('')
      setAdditionalDescription('')
      setDiscountType('value')
      setDiscountValue('')
      setPaymentMethod('')
      setInstallments('1')
      setNotes('')
      setErrors({})
    }
  }, [isOpen])

  // Calculate totals
  const calculations = useMemo(() => {
    if (mode === 'simple') {
      const total = parseFloat(simpleValue) || 0
      return {
        subtotalProducts: 0,
        additionalValue: 0,
        discountValue: 0,
        total,
      }
    }

    const subtotalProducts = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price - (item.discount || 0))
    }, 0)

    const additional = parseFloat(additionalValue) || 0
    const baseForDiscount = subtotalProducts + additional

    let discount = 0
    if (discountType === 'percentage') {
      const percentage = parseFloat(discountValue) || 0
      discount = baseForDiscount * (percentage / 100)
    } else {
      discount = parseFloat(discountValue) || 0
    }

    const total = Math.max(0, baseForDiscount - discount)

    return {
      subtotalProducts,
      additionalValue: additional,
      discountValue: discount,
      total,
    }
  }, [mode, simpleValue, items, additionalValue, discountType, discountValue])

  const addItem = (product: ProductSearchResult) => {
    const newItem: SaleItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: product.price,
      discount: 0,
      product,
    }
    setItems((prev) => [...prev, newItem])
    setSearchQuery('')
    setShowSearch(false)
  }

  const addManualItem = () => {
    const newItem: SaleItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
    }
    setItems((prev) => [...prev, newItem])
  }

  const updateItem = (id: string, field: keyof SaleItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return { ...item, [field]: value }
      })
    )
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (mode === 'simple') {
      if (!simpleValue || parseFloat(simpleValue) <= 0) {
        newErrors.simpleValue = 'Informe o valor da venda'
      }
    } else {
      if (items.length === 0 && !additionalValue) {
        newErrors.items = 'Adicione pelo menos um produto ou valor adicional'
      }
      items.forEach((item, index) => {
        if (!item.description) {
          newErrors[`item_${index}_description`] = 'Descricao obrigatoria'
        }
        if (item.unit_price <= 0) {
          newErrors[`item_${index}_price`] = 'Preco obrigatorio'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      if (mode === 'simple') {
        await createSaleMutation.mutateAsync({
          lead_id: leadId,
          total_value: parseFloat(simpleValue),
          payment_method: paymentMethod || undefined,
          installments: parseInt(installments) || 1,
          notes: notes || undefined,
        })
      } else {
        await createSaleMutation.mutateAsync({
          lead_id: leadId,
          items: items.map((item) => ({
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
          })),
          additional_value: parseFloat(additionalValue) || undefined,
          additional_description: additionalDescription || undefined,
          discount_value: discountType === 'value' ? parseFloat(discountValue) || undefined : undefined,
          discount_percentage: discountType === 'percentage' ? parseFloat(discountValue) || undefined : undefined,
          payment_method: paymentMethod || undefined,
          installments: parseInt(installments) || 1,
          notes: notes || undefined,
        })
      }

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Error creating sale:', error)
      setErrors({ submit: error.response?.data?.message || 'Erro ao registrar venda' })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-800 overflow-hidden my-8">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    Fechar Venda
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Cliente: <span className="text-white">{leadName}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector */}
              <div className="p-4 border-b border-gray-800">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('simple')}
                    className={`flex-1 py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                      mode === 'simple'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium">Valor Simples</span>
                  </button>
                  <button
                    onClick={() => setMode('detailed')}
                    className={`flex-1 py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                      mode === 'detailed'
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Adicionar Produtos</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Simple Mode */}
                {mode === 'simple' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Valor Total da Venda *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="number"
                        step="0.01"
                        value={simpleValue}
                        onChange={(e) => setSimpleValue(e.target.value)}
                        placeholder="0.00"
                        className={`pl-10 text-lg ${errors.simpleValue ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.simpleValue && (
                      <p className="text-red-400 text-xs mt-1">{errors.simpleValue}</p>
                    )}
                  </div>
                )}

                {/* Detailed Mode */}
                {mode === 'detailed' && (
                  <>
                    {/* Product Search */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Produtos</label>
                        <button
                          onClick={addManualItem}
                          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar item manual
                        </button>
                      </div>

                      {/* Search Input */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setShowSearch(true)
                          }}
                          onFocus={() => setShowSearch(true)}
                          placeholder="Buscar produto por nome ou SKU..."
                          className="pl-10"
                        />

                        {/* Search Results */}
                        {showSearch && searchQuery.length >= 2 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                            {isSearching ? (
                              <div className="p-4 text-center text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                              </div>
                            ) : searchResults.length > 0 ? (
                              searchResults.map((product) => (
                                <button
                                  key={product.id}
                                  onClick={() => addItem(product)}
                                  className="w-full p-3 hover:bg-gray-700 text-left flex items-center justify-between transition-colors"
                                >
                                  <div>
                                    <p className="font-medium">{product.name}</p>
                                    {product.sku && (
                                      <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                                    )}
                                  </div>
                                  <span className="text-green-400 font-medium">
                                    {formatCurrency(product.price)}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400">
                                Nenhum produto encontrado
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Items List */}
                      {items.length > 0 && (
                        <div className="space-y-3">
                          {items.map((item, index) => (
                            <div
                              key={item.id}
                              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-1 space-y-2">
                                  {/* Description */}
                                  <Input
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    placeholder="Descricao do item"
                                    className={`text-sm ${
                                      errors[`item_${index}_description`] ? 'border-red-500' : ''
                                    }`}
                                  />

                                  {/* Quantity, Price, Discount */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-xs text-gray-400">Qtd</label>
                                      <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                                        }
                                        className="text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400">Preco Unit.</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) =>
                                          updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                                        }
                                        className={`text-sm ${
                                          errors[`item_${index}_price`] ? 'border-red-500' : ''
                                        }`}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400">Desconto</label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.discount || ''}
                                        onChange={(e) =>
                                          updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
                                        }
                                        className="text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <span className="text-sm font-medium text-green-400">
                                    {formatCurrency(
                                      item.quantity * item.unit_price - (item.discount || 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {errors.items && <p className="text-red-400 text-xs mt-2">{errors.items}</p>}
                    </div>

                    {/* Additional Value */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Valor Adicional</label>
                        <div className="relative">
                          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            type="number"
                            step="0.01"
                            value={additionalValue}
                            onChange={(e) => setAdditionalValue(e.target.value)}
                            placeholder="0.00"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Descricao</label>
                        <Input
                          value={additionalDescription}
                          onChange={(e) => setAdditionalDescription(e.target.value)}
                          placeholder="Ex: Servico de instalacao"
                        />
                      </div>
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Desconto</label>
                      <div className="flex gap-2">
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as 'value' | 'percentage')}
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="value">R$</option>
                          <option value="percentage">%</option>
                        </select>
                        <div className="relative flex-1">
                          {discountType === 'percentage' ? (
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          ) : (
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          )}
                          <Input
                            type="number"
                            step="0.01"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder="0.00"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Forma de Pagamento</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Selecione...</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Parcelas</label>
                    <div className="relative">
                      <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        type="number"
                        min="1"
                        max="48"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Observacoes</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observacoes sobre a venda..."
                      rows={2}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>
                </div>

                {/* Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{errors.submit}</p>
                  </div>
                )}
              </div>

              {/* Footer with Total */}
              <div className="p-5 border-t border-gray-800 bg-gray-800/50">
                {/* Summary */}
                {mode === 'detailed' && (
                  <div className="mb-4 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal Produtos:</span>
                      <span>{formatCurrency(calculations.subtotalProducts)}</span>
                    </div>
                    {calculations.additionalValue > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Valor Adicional:</span>
                        <span>+ {formatCurrency(calculations.additionalValue)}</span>
                      </div>
                    )}
                    {calculations.discountValue > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>Desconto:</span>
                        <span>- {formatCurrency(calculations.discountValue)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <span className="text-lg font-medium">Total da Venda:</span>
                  <span className="text-2xl font-bold text-green-400">
                    {formatCurrency(calculations.total)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createSaleMutation.isPending || calculations.total <= 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {createSaleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar Venda
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
