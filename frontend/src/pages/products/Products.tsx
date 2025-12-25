import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  Copy,
  Image as ImageIcon,
  MoreVertical,
  Star,
  X,
  Upload,
  Loader2,
  DollarSign,
  Tag,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useDuplicateProduct,
  useUploadProductImage,
  useDeleteProductImage,
  useSetPrimaryImage,
  useProductCategories,
} from '@/hooks/useProducts'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product, ProductImage } from '@/types'

// Limite máximo de imagens por produto
const MAX_PRODUCT_IMAGES = 4

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const { data: productsData, isLoading } = useProducts({ search: searchQuery || undefined })
  const { data: categories } = useProductCategories()
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const duplicateMutation = useDuplicateProduct()

  const products = productsData?.data || []

  const handleCreateNew = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
    setActiveDropdown(null)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteModalOpen(true)
    setActiveDropdown(null)
  }

  const confirmDelete = async () => {
    if (productToDelete) {
      await deleteMutation.mutateAsync(productToDelete.id)
      setIsDeleteModalOpen(false)
      setProductToDelete(null)
    }
  }

  const handleDuplicate = async (product: Product) => {
    await duplicateMutation.mutateAsync(product.id)
    setActiveDropdown(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            {products.length} produtos cadastrados
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum produto cadastrado</h3>
          <p className="text-muted-foreground mt-1">
            Comece adicionando seu primeiro produto
          </p>
          <Button onClick={handleCreateNew} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="relative aspect-square bg-muted">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images.find(i => i.is_primary)?.url || product.images[0]?.url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    {!product.is_active && (
                      <Badge variant="secondary" className="bg-red-500/90 text-white">
                        Inativo
                      </Badge>
                    )}
                    {product.promotional_price && product.promotional_price < product.price && (
                      <Badge className="bg-green-500 text-white ml-1">
                        -{Math.round(((product.price - product.promotional_price) / product.price) * 100)}%
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2 right-2">
                    <div className="relative">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white"
                        onClick={() => setActiveDropdown(activeDropdown === product.id ? null : product.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      <AnimatePresence>
                        {activeDropdown === product.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 mt-1 w-40 bg-background border rounded-lg shadow-lg z-10 overflow-hidden"
                          >
                            <button
                              onClick={() => handleEdit(product)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDuplicate(product)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicar
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  )}
                  {product.category && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {product.category.name}
                    </Badge>
                  )}

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-2">
                    {product.promotional_price && product.promotional_price < product.price ? (
                      <>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(product.promotional_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
                    )}
                  </div>

                  {/* Stock */}
                  {product.track_stock && (
                    <p className={cn(
                      "text-xs mt-2",
                      product.stock > 10 ? "text-green-600" :
                      product.stock > 0 ? "text-amber-600" :
                      "text-red-600"
                    )}>
                      {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        categories={categories || []}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={async (data) => {
          if (selectedProduct) {
            await updateMutation.mutateAsync({ id: selectedProduct.id, data })
          } else {
            await createMutation.mutateAsync(data)
          }
          setIsModalOpen(false)
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Excluir Produto</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>
              Tem certeza que deseja excluir o produto{' '}
              <strong>{productToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Product Modal ============

interface ProductModalProps {
  product: Product | null
  categories: { id: string; name: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Product>) => Promise<void>
  isLoading: boolean
}

function ProductModal({ product, categories, open, onOpenChange, onSave, isLoading }: ProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    short_description: '',
    price: 0,
    promotional_price: undefined,
    category_id: undefined,
    is_active: true,
    show_on_landing_page: true,
    track_stock: false,
    stock: 0,
    specifications: {},
  })
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadProductImage()
  const deleteMutation = useDeleteProductImage()
  const setPrimaryMutation = useSetPrimaryImage()

  // Load product data when editing
  useState(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price,
        promotional_price: product.promotional_price,
        category_id: product.category_id,
        is_active: product.is_active,
        show_on_landing_page: product.show_on_landing_page,
        track_stock: product.track_stock,
        stock: product.stock,
        specifications: product.specifications || {},
      })
      setImages(product.images || [])
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        short_description: '',
        price: 0,
        promotional_price: undefined,
        category_id: undefined,
        is_active: true,
        show_on_landing_page: true,
        track_stock: false,
        stock: 0,
        specifications: {},
      })
      setImages([])
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || !product) return

    // Verifica limite de imagens antes de fazer upload
    const remainingSlots = MAX_PRODUCT_IMAGES - images.length
    if (remainingSlots <= 0) {
      toast.error(`Limite de ${MAX_PRODUCT_IMAGES} imagens atingido`)
      return
    }

    // Limita arquivos ao espaço disponível
    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      toast.warning(`Apenas ${remainingSlots} imagem(ns) será(ão) enviada(s). Limite: ${MAX_PRODUCT_IMAGES}`)
    }

    setUploading(true)
    try {
      for (const file of filesToUpload) {
        const newImage = await uploadMutation.mutateAsync({
          productId: product.id,
          file,
          isPrimary: images.length === 0,
        })
        setImages((prev) => [...prev, newImage])
      }
    } catch (error: any) {
      // Trata erro de limite do backend
      if (error?.response?.status === 422 && error?.response?.data?.error) {
        toast.error(error.response.data.error)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!product) return
    await deleteMutation.mutateAsync({ productId: product.id, imageId })
    setImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  const handleSetPrimary = async (imageId: string) => {
    if (!product) return
    await setPrimaryMutation.mutateAsync({ productId: product.id, imageId })
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_primary: img.id === imageId,
      }))
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do produto"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Código do produto"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição curta</label>
              <Input
                value={formData.short_description || ''}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                placeholder="Breve descrição do produto"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição completa</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada do produto"
                className="w-full px-3 py-2 border rounded-lg bg-background min-h-[100px] resize-y"
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço promocional</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.promotional_price || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        promotional_price: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estoque</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock || 0}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  disabled={!formData.track_stock}
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_on_landing_page}
                  onChange={(e) => setFormData({ ...formData, show_on_landing_page: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Exibir na Landing Page</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.track_stock}
                  onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Controlar estoque</span>
              </label>
            </div>

            {/* Images (only when editing) */}
            {product && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Imagens</label>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    images.length >= MAX_PRODUCT_IMAGES
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {images.length}/{MAX_PRODUCT_IMAGES}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {images.map((image) => (
                    <div key={image.id} className="relative aspect-square group">
                      <img
                        src={image.url}
                        alt={image.alt || 'Produto'}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {image.is_primary && (
                        <div className="absolute top-1 left-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {!image.is_primary && (
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => handleSetPrimary(image.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Upload Button - só aparece se não atingiu o limite */}
                  {images.length < MAX_PRODUCT_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mb-1" />
                          <span className="text-xs">Adicionar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  Clique na estrela para definir a imagem principal
                </p>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              {product ? 'Salvar' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

