import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Send,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  Package,
} from 'lucide-react'
import api from '@/api/axios'
import { cn } from '@/lib/utils'
import type { Block, GlobalSettings } from '@/types/landing-page-builder'

interface PublicProduct {
  id: string
  name: string
  short_description?: string
  description?: string
  specifications?: Record<string, string>
  images: { url: string; alt?: string; is_primary: boolean }[]
  is_featured: boolean
}

interface PublicLandingPage {
  id: string
  title: string
  description?: string
  logo?: string
  background_image?: string
  primary_color: string
  secondary_color: string
  text_color: string
  theme: string
  hero_title?: string
  hero_subtitle?: string
  cta_text: string
  cta_button_color: string
  show_products: boolean
  show_testimonials: boolean
  show_faq: boolean
  show_contact_info: boolean
  testimonials?: { name: string; role?: string; content: string; image?: string; rating?: number }[]
  faq?: { question: string; answer: string }[]
  contact_info?: { phone?: string; email?: string; whatsapp?: string; address?: string }
  form_fields?: { name: string; label: string; type: string; required: boolean }[]
  success_message: string
  products: PublicProduct[]
  tenant: { name: string }
  tracking?: { facebook_pixel?: string; google_analytics?: string; gtm_id?: string }
  blocks?: Block[]
  global_settings?: GlobalSettings
}

export function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [landingPage, setLandingPage] = useState<PublicLandingPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    product_id: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    loadLandingPage()
  }, [slug])

  const loadLandingPage = async () => {
    try {
      const response = await api.get<PublicLandingPage>(`/lp/${slug}`)
      setLandingPage(response.data)
      
      if (response.data.products.length === 1) {
        setSelectedProduct(response.data.products[0])
        setFormData(prev => ({ ...prev, product_id: response.data.products[0].id }))
      }
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'Página não encontrada' : 'Erro ao carregar página')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!landingPage) return

    setIsSubmitting(true)
    try {
      await api.post(`/lp/${slug}/submit`, {
        ...formData,
        product_id: selectedProduct?.id || formData.product_id,
      })
      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting form:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectProduct = (product: PublicProduct) => {
    setSelectedProduct(product)
    setFormData(prev => ({ ...prev, product_id: product.id }))
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">{error || 'Página não encontrada'}</h1>
          <p className="text-gray-600 mt-2">A landing page que você está procurando não existe ou foi removida.</p>
        </div>
      </div>
    )
  }

  // Se tem blocos do builder, renderiza eles
  if (landingPage.blocks && landingPage.blocks.length > 0) {
    return (
      <BlocksRenderer 
        blocks={landingPage.blocks} 
        globalSettings={landingPage.global_settings}
        landingPage={landingPage}
        products={landingPage.products}
        selectedProduct={selectedProduct}
        onSelectProduct={selectProduct}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        isSubmitted={isSubmitted}
        onSubmit={handleSubmit}
        expandedFaq={expandedFaq}
        setExpandedFaq={setExpandedFaq}
      />
    )
  }

  // Layout legado (sem blocos do builder)
  const { primary_color, secondary_color, text_color, cta_button_color } = landingPage

  return (
    <LegacyLayout 
      landingPage={landingPage}
      selectedProduct={selectedProduct}
      onSelectProduct={selectProduct}
      formData={formData}
      setFormData={setFormData}
      isSubmitting={isSubmitting}
      isSubmitted={isSubmitted}
      onSubmit={handleSubmit}
      expandedFaq={expandedFaq}
      setExpandedFaq={setExpandedFaq}
    />
  )
}

// ==================== BLOCKS RENDERER ====================

interface BlocksRendererProps {
  blocks: Block[]
  globalSettings?: GlobalSettings
  landingPage: PublicLandingPage
  products: PublicProduct[]
  selectedProduct: PublicProduct | null
  onSelectProduct: (product: PublicProduct) => void
  formData: any
  setFormData: (data: any) => void
  isSubmitting: boolean
  isSubmitted: boolean
  onSubmit: (e: React.FormEvent) => void
  expandedFaq: number | null
  setExpandedFaq: (index: number | null) => void
}

function BlocksRenderer({ 
  blocks, 
  globalSettings, 
  landingPage,
  products,
  selectedProduct,
  onSelectProduct,
  formData,
  setFormData,
  isSubmitting,
  isSubmitted,
  onSubmit,
  expandedFaq,
  setExpandedFaq,
}: BlocksRendererProps) {
  const settings = globalSettings || {
    primaryColor: landingPage.primary_color,
    secondaryColor: landingPage.secondary_color,
    textColor: landingPage.text_color,
    backgroundColor: '#ffffff',
    fontFamily: 'Inter',
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: settings.backgroundColor,
        fontFamily: settings.fontFamily,
      }}
    >
      {blocks
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <PublicBlockRenderer
            key={block.id}
            block={block}
            globalSettings={settings}
            landingPage={landingPage}
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={onSelectProduct}
            formData={formData}
            setFormData={setFormData}
            isSubmitting={isSubmitting}
            isSubmitted={isSubmitted}
            onSubmit={onSubmit}
            expandedFaq={expandedFaq}
            setExpandedFaq={setExpandedFaq}
          />
        ))}
    </div>
  )
}

interface PublicBlockRendererProps {
  block: Block
  globalSettings: any
  landingPage: PublicLandingPage
  products: PublicProduct[]
  selectedProduct: PublicProduct | null
  onSelectProduct: (product: PublicProduct) => void
  formData: any
  setFormData: (data: any) => void
  isSubmitting: boolean
  isSubmitted: boolean
  onSubmit: (e: React.FormEvent) => void
  expandedFaq: number | null
  setExpandedFaq: (index: number | null) => void
}

function PublicBlockRenderer({ 
  block, 
  globalSettings,
  landingPage,
  products,
  selectedProduct,
  onSelectProduct,
  formData,
  setFormData,
  isSubmitting,
  isSubmitted,
  onSubmit,
  expandedFaq,
  setExpandedFaq,
}: PublicBlockRendererProps) {
  const s = block.settings as any

  switch (block.type) {
    case 'header':
      return (
        <header 
          className={cn("p-4 flex items-center justify-between", s.sticky && "sticky top-0 z-50")}
          style={{ backgroundColor: s.backgroundColor, color: s.textColor }}
        >
          {s.logo ? (
            <img src={s.logo} alt="Logo" className="h-10 max-w-[150px] object-contain" />
          ) : (
            <div className="h-8 w-24" />
          )}
          {s.showMenu && (
            <nav className="flex gap-4">
              {(s.menuItems || []).map((item: any, i: number) => (
                <a key={i} href={item.href} className="hover:opacity-80">{item.label}</a>
              ))}
            </nav>
          )}
        </header>
      )

    case 'hero':
      const bgStyle = s.backgroundType === 'gradient'
        ? { background: `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})` }
        : s.backgroundType === 'image'
        ? { backgroundImage: `url(${s.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: s.backgroundColor }
      
      const heightClass = {
        small: 'min-h-[40vh]',
        medium: 'min-h-[60vh]',
        large: 'min-h-[80vh]',
        full: 'min-h-screen',
      }[s.height || 'medium']

      return (
        <section 
          className={cn("flex items-center justify-center relative", heightClass)}
          style={{ ...bgStyle, color: s.textColor }}
        >
          <div className={cn(
            "container mx-auto px-4 py-16",
            s.alignment === 'left' && 'text-left',
            s.alignment === 'center' && 'text-center',
            s.alignment === 'right' && 'text-right'
          )}>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              {s.title}
            </motion.h1>
            {s.subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto mb-8"
              >
                {s.subtitle}
              </motion.p>
            )}
            {s.ctaText && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full font-semibold text-lg shadow-lg text-white"
                style={{ backgroundColor: s.ctaColor }}
              >
                {s.ctaText}
              </motion.button>
            )}
          </div>
        </section>
      )

    case 'products':
      return (
        <section id="products-section" className="py-12 container mx-auto px-4" style={{ backgroundColor: s.backgroundColor }}>
          {s.title && <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">{s.title}</h2>}
          {s.subtitle && <p className="text-center text-gray-600 mb-8">{s.subtitle}</p>}
          
          <div className={cn(
            "grid gap-4 max-w-5xl mx-auto",
            s.columns === 2 && 'grid-cols-2',
            s.columns === 3 && 'grid-cols-2 md:grid-cols-3',
            s.columns === 4 && 'grid-cols-2 md:grid-cols-4'
          )}>
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg",
                  s.cardStyle === 'shadow' && 'shadow-md',
                  s.cardStyle === 'bordered' && 'border',
                  selectedProduct?.id === product.id && 'ring-2 ring-blue-500'
                )}
                onClick={() => onSelectProduct(product)}
              >
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {product.images?.[0] ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {selectedProduct?.id === product.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  {s.showDescription && product.short_description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.short_description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )

    case 'form':
      return (
        <section id="form-section" className="py-16" style={{ backgroundColor: s.backgroundColor }}>
          <div className="container mx-auto px-4 max-w-xl">
            {isSubmitted ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
                <p className="text-gray-600">{landingPage.success_message}</p>
              </motion.div>
            ) : (
              <>
                {s.title && <h2 className="text-2xl font-bold text-center mb-2">{s.title}</h2>}
                {s.subtitle && <p className="text-center text-gray-600 mb-6">{s.subtitle}</p>}
                
                <form onSubmit={onSubmit} className="space-y-4">
                  {(s.fields || []).map((field: any, i: number) => (
                    <div key={i}>
                      <label className="block text-sm font-medium mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full px-4 py-3 border rounded-lg"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type === 'phone' ? 'tel' : field.type}
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full px-4 py-3 border rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-lg text-white font-semibold text-lg flex items-center justify-center"
                    style={{ backgroundColor: s.buttonColor }}
                  >
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : s.buttonText || 'Enviar'}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      )

    case 'testimonials':
      const testimonialItems = s.items || []
      if (testimonialItems.length === 0) return null
      
      return (
        <section className="py-16" style={{ backgroundColor: s.backgroundColor }}>
          <div className="container mx-auto px-4">
            {s.title && <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{s.title}</h2>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonialItems.map((item: any, i: number) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-md">
                  <div className="flex mb-3">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className={cn("h-4 w-4", star <= (item.rating || 5) ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />
                    ))}
                  </div>
                  <p className="text-gray-600 italic mb-4">"{item.content}"</p>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold mr-3">
                      {item.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      {item.role && <p className="text-sm text-gray-500">{item.role}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'faq':
      const faqItems = s.items || []
      if (faqItems.length === 0) return null
      
      return (
        <section className="py-16" style={{ backgroundColor: s.backgroundColor }}>
          <div className="container mx-auto px-4 max-w-3xl">
            {s.title && <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{s.title}</h2>}
            <div className="space-y-3">
              {faqItems.map((item: any, i: number) => (
                <div key={i} className="border rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium">{item.question}</span>
                    {expandedFaq === i ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'text':
      const TitleTag = (s.titleTag || 'h2') as keyof JSX.IntrinsicElements
      return (
        <section 
          className={cn(
            s.padding === 'small' && 'py-4',
            s.padding === 'medium' && 'py-8',
            s.padding === 'large' && 'py-12',
            s.maxWidth === 'sm' && 'max-w-xl mx-auto',
            s.maxWidth === 'md' && 'max-w-2xl mx-auto',
            s.maxWidth === 'lg' && 'max-w-4xl mx-auto',
          )}
          style={{ backgroundColor: s.backgroundColor, textAlign: s.alignment }}
        >
          <div className="container mx-auto px-4">
            {s.title && (
              <TitleTag 
                className={cn(
                  "mb-4",
                  s.titleTag === 'h1' && 'text-3xl font-bold',
                  s.titleTag === 'h2' && 'text-2xl font-semibold',
                  s.titleTag === 'h3' && 'text-xl font-semibold',
                  s.titleTag === 'h4' && 'text-lg font-medium',
                )}
                style={{ color: s.titleColor || s.textColor }}
              >
                {s.title}
              </TitleTag>
            )}
            <p 
              className={cn(
                s.fontSize === 'small' && 'text-sm',
                s.fontSize === 'medium' && 'text-base',
                s.fontSize === 'large' && 'text-lg',
                s.fontSize === 'xl' && 'text-xl',
              )}
              style={{ color: s.textColor }}
            >
              {s.content}
            </p>
          </div>
        </section>
      )

    case 'cta':
      return (
        <section 
          className="py-16 text-center"
          style={{ backgroundColor: s.backgroundColor, color: s.textColor }}
        >
          <div className="container mx-auto px-4">
            {s.title && <h2 className="text-2xl md:text-3xl font-bold mb-4">{s.title}</h2>}
            {s.subtitle && <p className="text-lg opacity-80 mb-6">{s.subtitle}</p>}
            {s.buttonText && (
              <button
                onClick={() => document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full font-semibold text-lg text-white"
                style={{ backgroundColor: s.buttonColor }}
              >
                {s.buttonText}
              </button>
            )}
          </div>
        </section>
      )

    case 'features':
      const featureItems = s.items || []
      return (
        <section className="py-16" style={{ backgroundColor: s.backgroundColor }}>
          <div className="container mx-auto px-4">
            {s.title && <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{s.title}</h2>}
            <div className={cn(
              "grid gap-6 max-w-5xl mx-auto",
              s.columns === 2 && 'grid-cols-2',
              s.columns === 3 && 'grid-cols-2 md:grid-cols-3',
              s.columns === 4 && 'grid-cols-2 md:grid-cols-4',
            )}>
              {featureItems.map((item: any, i: number) => (
                <div key={i} className="text-center p-4">
                  {item.icon && <span className="text-4xl block mb-3">{item.icon}</span>}
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'countdown':
      return <CountdownBlock settings={s} />

    case 'divider':
      return (
        <div className={cn(
          "flex items-center justify-center",
          s.height === 'small' && 'py-4',
          s.height === 'medium' && 'py-8',
          s.height === 'large' && 'py-12',
        )}>
          {s.style === 'line' && <div className="w-full max-w-3xl h-px mx-4" style={{ backgroundColor: s.color }} />}
          {s.style === 'dots' && (
            <div className="flex gap-2">
              {[1,2,3].map(i => <div key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />)}
            </div>
          )}
        </div>
      )

    case 'image':
      if (!s.src) return null
      return (
        <div className={cn(
          "py-8",
          s.alignment === 'center' && 'text-center',
          s.alignment === 'right' && 'text-right',
        )}>
          <div className="container mx-auto px-4">
            <img 
              src={s.src} 
              alt={s.alt || ''} 
              className={cn(
                "max-w-full h-auto inline-block",
                s.width === '50%' && 'w-1/2',
                s.width === '75%' && 'w-3/4',
                s.width === 'full' && 'w-full',
                s.borderRadius === 'small' && 'rounded',
                s.borderRadius === 'medium' && 'rounded-lg',
                s.borderRadius === 'large' && 'rounded-2xl',
                s.shadow && 'shadow-lg',
              )}
            />
            {s.caption && <p className="text-sm text-gray-500 mt-2">{s.caption}</p>}
          </div>
        </div>
      )

    case 'video':
      const getEmbedUrl = (url: string) => {
        if (!url) return null
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
        return url
      }
      const embedUrl = getEmbedUrl(s.url)
      if (!embedUrl) return null
      
      return (
        <div className="py-8" style={{ backgroundColor: s.backgroundColor }}>
          <div className="container mx-auto px-4 max-w-4xl">
            {s.title && <h3 className="text-xl font-semibold text-center mb-4">{s.title}</h3>}
            <div className={cn(
              "relative w-full overflow-hidden rounded-lg",
              s.aspectRatio === '16:9' && 'aspect-video',
              s.aspectRatio === '4:3' && 'aspect-[4/3]',
              s.aspectRatio === '1:1' && 'aspect-square',
            )}>
              <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen />
            </div>
          </div>
        </div>
      )

    case 'columns':
      const columnCount = s.columns || 2
      const contents = s.columnContents || []
      return (
        <section 
          className={cn(
            s.padding === 'small' && 'py-4',
            s.padding === 'medium' && 'py-8',
            s.padding === 'large' && 'py-12',
          )}
          style={{ backgroundColor: s.backgroundColor }}
        >
          <div className="container mx-auto px-4">
            <div className={cn(
              "grid",
              columnCount === 2 && 'grid-cols-1 md:grid-cols-2',
              columnCount === 3 && 'grid-cols-1 md:grid-cols-3',
              columnCount === 4 && 'grid-cols-2 md:grid-cols-4',
              s.gap === 'small' && 'gap-4',
              s.gap === 'medium' && 'gap-6',
              s.gap === 'large' && 'gap-8',
            )}>
              {Array.from({ length: columnCount }).map((_, i) => {
                const col = contents[i] || {}
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "p-4",
                      col.alignment === 'center' && 'text-center',
                      col.alignment === 'right' && 'text-right',
                    )}
                  >
                    {col.type === 'text' && (
                      <>
                        {col.title && <h3 className="text-xl font-semibold mb-2">{col.title}</h3>}
                        <p className="text-gray-600">{col.content}</p>
                      </>
                    )}
                    {col.type === 'image' && col.imageUrl && (
                      <img src={col.imageUrl} alt="" className="w-full h-auto rounded-lg" />
                    )}
                    {col.type === 'button' && (
                      <button
                        className="px-6 py-3 rounded-lg text-white font-medium"
                        style={{ backgroundColor: col.buttonColor || '#3B82F6' }}
                      >
                        {col.buttonText || 'Botão'}
                      </button>
                    )}
                    {col.type === 'icon' && (
                      <>
                        <span className="text-4xl block mb-3">{col.iconName || '✨'}</span>
                        {col.title && <h3 className="text-lg font-semibold mb-1">{col.title}</h3>}
                        {col.content && <p className="text-sm text-gray-600">{col.content}</p>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )

    case 'section':
      const elements = s.elements || []
      const bgStyle2: React.CSSProperties = {
        backgroundColor: s.backgroundColor,
        color: s.textColor,
      }
      if (s.backgroundImage) {
        bgStyle2.backgroundImage = `url(${s.backgroundImage})`
        bgStyle2.backgroundSize = 'cover'
        bgStyle2.backgroundPosition = 'center'
      }
      
      return (
        <section 
          className={cn(
            "relative",
            s.padding === 'small' && 'py-8',
            s.padding === 'medium' && 'py-12',
            s.padding === 'large' && 'py-16',
            s.padding === 'xl' && 'py-24',
          )}
          style={bgStyle2}
        >
          {s.backgroundOverlay && s.backgroundImage && (
            <div 
              className="absolute inset-0"
              style={{ 
                backgroundColor: s.overlayColor || '#000',
                opacity: (s.overlayOpacity || 50) / 100
              }}
            />
          )}
          
          <div className={cn(
            "relative container mx-auto px-4",
            s.maxWidth === 'xl' && 'max-w-6xl',
            s.maxWidth === 'lg' && 'max-w-4xl',
            s.maxWidth === 'md' && 'max-w-2xl',
            s.alignment === 'center' && 'text-center',
            s.alignment === 'right' && 'text-right',
          )}>
            {s.title && <h2 className="text-2xl md:text-3xl font-bold mb-2">{s.title}</h2>}
            {s.subtitle && <p className="text-lg opacity-80 mb-8">{s.subtitle}</p>}
            
            {elements.length > 0 && (
              <div className="space-y-4">
                {elements.map((el: any) => (
                  <div key={el.id}>
                    {el.type === 'text' && <p>{el.settings.content}</p>}
                    {el.type === 'image' && el.settings.src && (
                      <img src={el.settings.src} alt="" className="max-w-full h-auto mx-auto rounded-lg" />
                    )}
                    {el.type === 'button' && (
                      <button
                        className="px-6 py-3 rounded-lg text-white font-medium"
                        style={{ backgroundColor: el.settings.color || '#3B82F6' }}
                      >
                        {el.settings.text || 'Botão'}
                      </button>
                    )}
                    {el.type === 'spacer' && (
                      <div className={cn(
                        el.settings.height === 'small' && 'h-4',
                        el.settings.height === 'medium' && 'h-8',
                        el.settings.height === 'large' && 'h-12',
                      )} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )

    case 'footer':
      return (
        <footer 
          className="py-8 text-center"
          style={{ backgroundColor: s.backgroundColor, color: s.textColor }}
        >
          <div className="container mx-auto px-4">
            <p>{s.copyright || `© ${new Date().getFullYear()} Todos os direitos reservados.`}</p>
          </div>
        </footer>
      )

    default:
      return null
  }
}

// Countdown component com timer real
function CountdownBlock({ settings }: { settings: any }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(settings.targetDate).getTime()
    
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        clearInterval(interval)
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [settings.targetDate])

  return (
    <section 
      className="py-12 text-center"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      <div className="container mx-auto px-4">
        {settings.title && <h2 className="text-xl md:text-2xl font-bold mb-6">{settings.title}</h2>}
        <div className="flex justify-center gap-4 md:gap-8">
          {[
            { value: timeLeft.days, label: 'Dias' },
            { value: timeLeft.hours, label: 'Horas' },
            { value: timeLeft.minutes, label: 'Min' },
            { value: timeLeft.seconds, label: 'Seg' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-5xl font-bold">{String(item.value).padStart(2, '0')}</div>
              <div className="text-sm opacity-70">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ==================== LEGACY LAYOUT ====================

interface LegacyLayoutProps {
  landingPage: PublicLandingPage
  selectedProduct: PublicProduct | null
  onSelectProduct: (product: PublicProduct) => void
  formData: any
  setFormData: (data: any) => void
  isSubmitting: boolean
  isSubmitted: boolean
  onSubmit: (e: React.FormEvent) => void
  expandedFaq: number | null
  setExpandedFaq: (index: number | null) => void
}

function LegacyLayout({
  landingPage,
  selectedProduct,
  onSelectProduct,
  formData,
  setFormData,
  isSubmitting,
  isSubmitted,
  onSubmit,
  expandedFaq,
  setExpandedFaq,
}: LegacyLayoutProps) {
  const { primary_color, secondary_color, text_color, cta_button_color } = landingPage

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Hero Section */}
      <section
        className="relative min-h-[60vh] flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primary_color}, ${secondary_color})`,
        }}
      >
        {landingPage.background_image && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${landingPage.background_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        <div className="relative z-10 container mx-auto px-4 py-16 text-center">
          {landingPage.logo && (
            <motion.img
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              src={landingPage.logo}
              alt={landingPage.tenant.name}
              className="h-16 mx-auto mb-8"
            />
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: text_color }}
          >
            {landingPage.hero_title || landingPage.title}
          </motion.h1>

          {landingPage.hero_subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto"
              style={{ color: text_color }}
            >
              {landingPage.hero_subtitle}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-8 px-8 py-4 rounded-full text-white font-semibold text-lg shadow-lg"
            style={{ backgroundColor: cta_button_color }}
          >
            {landingPage.cta_text}
          </motion.button>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full h-auto">
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#f9fafb"
            />
          </svg>
        </div>
      </section>

      {/* Products */}
      {landingPage.show_products && landingPage.products.length > 0 && (
        <section id="products-section" className="py-12 container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-gray-800">Nossos Produtos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {landingPage.products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedProduct?.id === product.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => onSelectProduct(product)}
              >
                <div className="aspect-[4/3] bg-gray-100 relative">
                  {product.images?.[0] ? (
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {selectedProduct?.id === product.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</h3>
                  {product.short_description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.short_description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Form */}
      <section id="form-section" className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          {isSubmitted ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: cta_button_color }} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Obrigado!</h2>
              <p className="text-gray-600">{landingPage.success_message}</p>
            </motion.div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
                {selectedProduct ? `Interesse em: ${selectedProduct.name}` : 'Preencha seus dados'}
              </h2>
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="seu@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.phone}
                  className="w-full py-4 rounded-lg text-white font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: cta_button_color }}
                >
                  {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="h-5 w-5 mr-2" />{landingPage.cta_text}</>}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {landingPage.show_testimonials && landingPage.testimonials && landingPage.testimonials.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">O que nossos clientes dizem</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {landingPage.testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl shadow-lg">
                  {testimonial.rating && (
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < testimonial.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  )}
                  <p className="text-gray-600 italic mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full mr-3 flex items-center justify-center text-white font-semibold" style={{ backgroundColor: primary_color }}>
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{testimonial.name}</p>
                      {testimonial.role && <p className="text-sm text-gray-500">{testimonial.role}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {landingPage.show_faq && landingPage.faq && landingPage.faq.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Perguntas Frequentes</h2>
            <div className="space-y-4">
              {landingPage.faq.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-800">{item.question}</span>
                    {expandedFaq === index ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} {landingPage.tenant.name}. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
