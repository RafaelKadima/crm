import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Search,
  Send,
  Loader2,
  ArrowLeft,
  ImageIcon,
  DollarSign,
  FileText,
  Check,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils'
import { useChatProducts, useSendProductToChat, ChatProduct } from '@/hooks/useChatProducts'
import { toast } from 'sonner'

interface ProductSelectorProps {
  ticketId: string | null
  isOpen: boolean
  onClose: () => void
  onSent: () => void
}

export function ProductSelector({ ticketId, isOpen, onClose, onSent }: ProductSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ChatProduct | null>(null)
  const [includeDescription, setIncludeDescription] = useState(true)
  const [includePrice, setIncludePrice] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)

  const { data: products, isLoading } = useChatProducts({ search: search || undefined })
  const sendMutation = useSendProductToChat()

  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!search) return products

    const searchLower = search.toLowerCase()
    return products.filter(
      p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku?.toLowerCase().includes(searchLower)
    )
  }, [products, search])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  const previewMessage = useMemo(() => {
    if (!selectedProduct) return ''

    const lines: string[] = []
    lines.push(`*${selectedProduct.name}*`)

    if (selectedProduct.sku) {
      lines.push(`Codigo: ${selectedProduct.sku}`)
    }

    lines.push('')

    if (includeDescription) {
      if (selectedProduct.short_description) {
        lines.push(selectedProduct.short_description)
      } else if (selectedProduct.description) {
        const desc = selectedProduct.description.replace(/<[^>]*>/g, '')
        lines.push(desc.length > 300 ? desc.slice(0, 297) + '...' : desc)
      }
      lines.push('')
    }

    if (includePrice) {
      if (
        selectedProduct.promotional_price &&
        selectedProduct.promotional_price < selectedProduct.price
      ) {
        lines.push(`~~De: ${formatPrice(selectedProduct.price)}~~`)
        lines.push(`*Por: ${formatPrice(selectedProduct.promotional_price)}*`)
      } else {
        lines.push(`*Preco: ${formatPrice(selectedProduct.price)}*`)
      }
    }

    return lines.join('\n')
  }, [selectedProduct, includeDescription, includePrice])

  const handleSend = async () => {
    if (!ticketId || !selectedProduct) return

    try {
      await sendMutation.mutateAsync({
        ticketId,
        productId: selectedProduct.id,
        includeDescription,
        includePrice,
        includeImages,
      })

      toast.success('Produto enviado com sucesso!')
      onSent()
      handleClose()
    } catch (error: any) {
      console.error('Error sending product:', error)
      toast.error(error.response?.data?.error || 'Erro ao enviar produto')
    }
  }

  const handleClose = () => {
    setSelectedProduct(null)
    setSearch('')
    setIncludeDescription(true)
    setIncludePrice(true)
    setIncludeImages(true)
    onClose()
  }

  const handleBack = () => {
    setSelectedProduct(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent size="lg" className="max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Catalogo de Produtos
          </DialogTitle>
          <DialogDescription>
            Selecione um produto para enviar no chat
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!selectedProduct ? (
            // Lista de produtos
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {products?.length === 0
                        ? 'Nenhum produto cadastrado'
                        : 'Nenhum produto encontrado'}
                    </p>
                    {products?.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Cadastre produtos na pagina de Produtos
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all',
                          'hover:border-primary/50 hover:bg-muted/50'
                        )}
                        onClick={() => setSelectedProduct(product)}
                      >
                        {/* Imagem */}
                        <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2">
                          {product.primary_image ? (
                            <img
                              src={product.primary_image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              {product.sku}
                            </p>
                          )}
                          <div className="flex items-baseline gap-2">
                            {product.promotional_price &&
                            product.promotional_price < product.price ? (
                              <>
                                <span className="text-sm font-bold text-green-500">
                                  {formatPrice(product.promotional_price)}
                                </span>
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-bold">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                          {product.images.length > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              {product.images.length} foto{product.images.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Detalhes e opcoes de envio
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header com botao voltar */}
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 flex items-center gap-3">
                  {selectedProduct.primary_image && (
                    <img
                      src={selectedProduct.primary_image}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-md object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(selectedProduct.promotional_price || selectedProduct.price)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Opcoes de envio */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Opcoes de envio</label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={includeDescription}
                        onCheckedChange={(checked) => setIncludeDescription(!!checked)}
                      />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Incluir descricao</p>
                        <p className="text-xs text-muted-foreground">
                          Envia a descricao do produto
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={includePrice}
                        onCheckedChange={(checked) => setIncludePrice(!!checked)}
                      />
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Incluir preco</p>
                        <p className="text-xs text-muted-foreground">
                          Envia o preco do produto
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={includeImages}
                        onCheckedChange={(checked) => setIncludeImages(!!checked)}
                      />
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Incluir fotos</p>
                        <p className="text-xs text-muted-foreground">
                          Envia todas as {selectedProduct.images.length} foto{selectedProduct.images.length !== 1 ? 's' : ''} do produto
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview da mensagem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preview da mensagem</label>
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
                  </div>
                </div>

                {/* Preview das fotos */}
                {includeImages && selectedProduct.images.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Fotos que serao enviadas
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedProduct.images.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt={img.alt}
                          className="w-20 h-20 rounded-md object-cover shrink-0"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botao enviar */}
              <div className="pt-4 border-t mt-4">
                <Button
                  onClick={handleSend}
                  disabled={sendMutation.isPending}
                  className="w-full"
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Produto
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

export default ProductSelector
