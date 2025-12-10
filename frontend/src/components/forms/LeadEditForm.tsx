import { useState, useEffect } from 'react'
import { Save, Loader2, User, Mail, Phone, MapPin, DollarSign, Calendar, Users, Package, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Lead, User as UserType } from '@/types'
import api from '@/api/axios'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  promotional_price?: number
  current_price: number
  category?: {
    id: string
    name: string
  }
}

interface LeadEditFormProps {
  lead: Lead
  onSave?: (updatedLead: Lead) => void
  onCancel?: () => void
  onDelete?: () => void
}

interface FormData {
  // Contact info
  name: string
  email: string
  phone: string
  cpf: string
  address: string
  // Lead info
  value: string
  expected_close_date: string
  owner_id: string
  product_id: string
}

export function LeadEditForm({ lead, onSave, onCancel, onDelete }: LeadEditFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    value: '',
    expected_close_date: '',
    owner_id: '',
    product_id: '',
  })
  const [users, setUsers] = useState<UserType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load initial data
  useEffect(() => {
    if (lead) {
      const currentProduct = (lead as any).products?.[0]
      setFormData({
        name: lead.contact?.name || lead.name || '',
        email: lead.contact?.email || '',
        phone: lead.contact?.phone || lead.phone || '',
        cpf: lead.contact?.cpf || '',
        address: lead.contact?.address || '',
        value: lead.value?.toString() || '',
        expected_close_date: lead.expected_close_date?.split('T')[0] || '',
        owner_id: lead.owner_id || '',
        product_id: currentProduct?.id || '',
      })
    }
  }, [lead])

  // Load users for owner selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get('/users')
        setUsers(response.data.data || response.data || [])
      } catch (err) {
        console.error('Error loading users:', err)
      }
    }
    loadUsers()
  }, [])

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.get('/products')
        setProducts(response.data.data || response.data || [])
      } catch (err) {
        console.error('Error loading products:', err)
      }
    }
    loadProducts()
  }, [])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Se mudou o produto, atualiza o valor automaticamente
      if (field === 'product_id') {
        if (value) {
          const selectedProduct = products.find(p => p.id === value)
          if (selectedProduct) {
            newData.value = selectedProduct.current_price?.toString() || selectedProduct.price?.toString() || '0'
          }
        } else {
          newData.value = '0'
        }
      }
      
      return newData
    })
    setError(null)
    setSuccess(false)
  }

  const handleDelete = async () => {
    if (!lead) return
    
    setIsDeleting(true)
    setError(null)
    
    try {
      await api.delete(`/leads/${lead.id}`)
      onDelete?.()
    } catch (err: any) {
      console.error('Error deleting lead:', err)
      setError(err.response?.data?.message || 'Erro ao excluir lead')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Update contact
      if (lead.contact) {
        await api.put(`/contacts/${lead.contact.id}`, {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          cpf: formData.cpf || null,
          address: formData.address || null,
        })
      }

      // Update lead with product
      const leadUpdate: any = {
        product_id: formData.product_id || null,
      }
      if (formData.expected_close_date) leadUpdate.expected_close_date = formData.expected_close_date
      
      await api.put(`/leads/${lead.id}`, leadUpdate)

      // Assign owner if changed
      if (formData.owner_id && formData.owner_id !== lead.owner_id) {
        await api.put(`/leads/${lead.id}/assign`, {
          owner_id: formData.owner_id,
        })
      }

      setSuccess(true)
      
      // Reload lead data
      const response = await api.get(`/leads/${lead.id}`)
      onSave?.(response.data)

    } catch (err: any) {
      console.error('Error saving lead:', err)
      setError(err.response?.data?.message || 'Erro ao salvar dados')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4" />
          Dados do Contato
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(00) 00000-0000"
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleChange('cpf', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Rua, número, bairro, cidade"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Information */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Dados do Lead
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Produto */}
          <div className="col-span-2">
            <Label htmlFor="product_id">Produto de Interesse</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                id="product_id"
                value={formData.product_id}
                onChange={(e) => handleChange('product_id', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">Nenhum produto selecionado</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {formatCurrency(product.current_price || product.price)}
                    {product.category && ` (${product.category.name})`}
                  </option>
                ))}
              </select>
            </div>
            {products.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Nenhum produto cadastrado. Cadastre produtos no menu Produtos.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="value">Valor (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="0,00"
                className="pl-10 bg-gray-50"
                disabled={!!formData.product_id}
              />
            </div>
            {formData.product_id && (
              <p className="text-xs text-emerald-600 mt-1">
                ✓ Valor preenchido automaticamente pelo produto
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => handleChange('expected_close_date', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="owner_id">Responsável</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                id="owner_id"
                value={formData.owner_id}
                onChange={(e) => handleChange('owner_id', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">Selecione um responsável</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✅ Dados salvos com sucesso!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSaving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Delete Section */}
      {onDelete && (
        <div className="pt-4 border-t border-red-200">
          {!showDeleteConfirm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Lead
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Tem certeza que deseja excluir este lead?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Esta ação não pode ser desfeita. Todas as mensagens e dados serão perdidos.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirmar Exclusão
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

