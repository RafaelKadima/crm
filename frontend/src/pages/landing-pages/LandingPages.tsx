import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
  BarChart3,
  MoreVertical,
  Loader2,
  Link as LinkIcon,
  Users,
  TrendingUp,
  Palette,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import {
  useLandingPages,
  useCreateLandingPage,
  useDeleteLandingPage,
  usePublishLandingPage,
  useUnpublishLandingPage,
  useDuplicateLandingPage,
} from '@/hooks/useLandingPages'
import { useProducts } from '@/hooks/useProducts'
import { cn, formatCurrency } from '@/lib/utils'
import type { LandingPage, Product } from '@/types'

const themeIds = ['modern', 'minimal', 'bold', 'elegant'] as const
const themeColors: Record<string, string> = {
  modern: '#3B82F6',
  minimal: '#6B7280',
  bold: '#EF4444',
  elegant: '#8B5CF6',
}

export function LandingPagesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedLP, setSelectedLP] = useState<LandingPage | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const { data, isLoading } = useLandingPages()
  const deleteMutation = useDeleteLandingPage()
  const publishMutation = usePublishLandingPage()
  const unpublishMutation = useUnpublishLandingPage()
  const duplicateMutation = useDuplicateLandingPage()

  const landingPages = data?.landing_pages || []
  const limit = data?.limit || 1
  const canCreate = data?.can_create ?? true

  const handleDelete = (lp: LandingPage) => {
    setSelectedLP(lp)
    setIsDeleteModalOpen(true)
    setActiveDropdown(null)
  }

  const confirmDelete = async () => {
    if (selectedLP) {
      await deleteMutation.mutateAsync(selectedLP.id)
      setIsDeleteModalOpen(false)
      setSelectedLP(null)
    }
  }

  const handleTogglePublish = async (lp: LandingPage) => {
    if (lp.is_active && lp.published_at) {
      await unpublishMutation.mutateAsync(lp.id)
    } else {
      await publishMutation.mutateAsync(lp.id)
    }
    setActiveDropdown(null)
  }

  const handleDuplicate = async (lp: LandingPage) => {
    await duplicateMutation.mutateAsync(lp.id)
    setActiveDropdown(null)
  }

  const copyUrl = (lp: LandingPage) => {
    const url = `${window.location.origin}/lp/${lp.slug}`
    navigator.clipboard.writeText(url)
    setActiveDropdown(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('landingPages.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {landingPages.length} {t('landingPages.usedOf', { total: limit })}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={!canCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('landingPages.newLandingPage')}
        </Button>
      </div>

      {/* Limit Warning */}
      {!canCreate && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {t('landingPages.limitReached')}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {t('landingPages.limitMessage', { limit })}
            </p>
          </div>
        </div>
      )}

      {/* Landing Pages Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : landingPages.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('landingPages.noLandingPage')}</h3>
          <p className="text-muted-foreground mt-1">
            {t('landingPages.createFirst')}
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4" disabled={!canCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('landingPages.createLandingPage')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {landingPages.map((lp, index) => (
            <motion.div
              key={lp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Preview Header */}
                <div
                  className="h-32 relative"
                  style={{
                    background: `linear-gradient(135deg, ${lp.primary_color}, ${lp.secondary_color})`,
                  }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {lp.is_active && lp.published_at ? (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('landingPages.published')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        {t('landingPages.draft')}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3">
                    <div className="relative">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white"
                        onClick={() => setActiveDropdown(activeDropdown === lp.id ? null : lp.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      <AnimatePresence>
                        {activeDropdown === lp.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 mt-1 w-48 bg-background border rounded-lg shadow-lg z-10 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                setActiveDropdown(null)
                                navigate(`/landing-pages/${lp.id}/edit`)
                              }}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => window.open(`/lp/${lp.slug}`, '_blank')}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t('landingPages.view')}
                            </button>
                            <button
                              onClick={() => copyUrl(lp)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              <LinkIcon className="h-4 w-4" />
                              {t('landingPages.copyLink')}
                            </button>
                            <button
                              onClick={() => handleTogglePublish(lp)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            >
                              {lp.is_active && lp.published_at ? (
                                <>
                                  <EyeOff className="h-4 w-4" />
                                  {t('landingPages.unpublish')}
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4" />
                                  {t('landingPages.publish')}
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDuplicate(lp)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                              disabled={!canCreate}
                            >
                              <Copy className="h-4 w-4" />
                              {t('products.duplicate')}
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => handleDelete(lp)}
                              className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('common.delete')}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Theme indicator */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-white/80" />
                    <span className="text-xs text-white/80 capitalize">{lp.theme}</span>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{lp.name}</h3>
                  <p className="text-sm text-muted-foreground truncate mt-1">{lp.title}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Eye className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-lg font-semibold">{lp.views_count}</p>
                      <p className="text-xs text-muted-foreground">{t('landingPages.visits')}</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <Users className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-lg font-semibold">{lp.leads_count}</p>
                      <p className="text-xs text-muted-foreground">{t('landingPages.leads')}</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-lg font-semibold">
                        {lp.views_count > 0 ? ((lp.leads_count / lp.views_count) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">{t('landingPages.conversion')}</p>
                    </div>
                  </div>

                  {/* Products count */}
                  {lp.products && lp.products.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-3">
                      {lp.products.length} {t('landingPages.linkedProducts')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateLandingPageModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('landingPages.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>
              {t('landingPages.deleteConfirm')}{' '}
              <strong>{selectedLP?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('landingPages.deleteWarning')}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {t('common.cancel')}
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
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Create Modal ============

interface CreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateLandingPageModal({ open, onOpenChange }: CreateModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    theme: 'modern' as const,
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    cta_text: 'Tenho interesse',
    products: [] as string[],
  })

  const { data: productsData } = useProducts()
  const createMutation = useCreateLandingPage()

  const products = productsData?.data || []

  const handleCreate = async () => {
    await createMutation.mutateAsync(formData as any)
    onOpenChange(false)
    setStep(1)
    setFormData({
      name: '',
      title: '',
      description: '',
      theme: 'modern',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      cta_text: 'Tenho interesse',
      products: [],
    })
  }

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter((id) => id !== productId)
        : [...prev.products, productId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? t('landingPages.newLandingPage') : t('landingPages.selectProducts')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {step === 1 ? (
            <>
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('landingPages.internalName')} *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Lançamento Produto X"
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('landingPages.pageTitle')} *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Descubra o Produto X"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('common.description')}
                  className="w-full px-3 py-2 border rounded-lg bg-background min-h-[80px] resize-y"
                />
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('landingPages.theme')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {themeIds.map((themeId) => (
                    <button
                      key={themeId}
                      type="button"
                      onClick={() => setFormData({ ...formData, theme: themeId as any, primary_color: themeColors[themeId] })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-center transition-all',
                        formData.theme === themeId
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted'
                      )}
                    >
                      <div
                        className="h-8 w-full rounded mb-2"
                        style={{ backgroundColor: themeColors[themeId] }}
                      />
                      <span className="text-xs">{t(`landingPages.themes.${themeId}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('landingPages.buttonText')}</label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="Ex: Tenho interesse"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('landingPages.selectProductsDescription')}{' '}
                <strong>{t('landingPages.pricesNotShown')}</strong>
              </p>

              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3',
                      formData.products.includes(product.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    )}
                  >
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Globe className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                    {formData.products.includes(product.id) && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('landingPages.noProducts')}</p>
                  <p className="text-sm">{t('landingPages.registerProductsFirst')}</p>
                </div>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              {t('common.back')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.title}
            >
              {t('landingPages.nextProducts')}
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {t('landingPages.createLandingPage')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

