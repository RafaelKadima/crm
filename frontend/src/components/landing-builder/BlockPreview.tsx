import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  GripVertical,
  Trash2,
  Settings,
  Copy,
  ChevronUp,
  ChevronDown,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { type Block, type BlockType, type GlobalSettings } from '@/types/landing-page-builder'

interface BlockPreviewProps {
  block: Block
  globalSettings: GlobalSettings
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

export function BlockPreview({
  block,
  globalSettings,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: BlockPreviewProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative group",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Block Container */}
      <div
        onClick={onSelect}
        className={cn(
          "relative border-2 rounded-lg transition-all cursor-pointer",
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-transparent hover:border-muted-foreground/20"
        )}
      >
        {/* Block Label */}
        <div className={cn(
          "absolute -top-3 left-4 px-2 py-0.5 rounded text-xs font-medium transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          block.isRequired ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
        )}>
          {getBlockLabel(block.type)}
          {block.isRequired && <Lock className="h-3 w-3 inline ml-1" />}
        </div>

        {/* Toolbar */}
        <div className={cn(
          "absolute -top-3 right-4 flex items-center gap-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded bg-muted hover:bg-muted-foreground/20 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Move Up */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className="p-1 rounded bg-muted hover:bg-muted-foreground/20 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          {/* Move Down */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className="p-1 rounded bg-muted hover:bg-muted-foreground/20 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Duplicate */}
          {!block.isRequired && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1 rounded bg-muted hover:bg-muted-foreground/20"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}

          {/* Delete */}
          {!block.isRequired && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Block Content Preview */}
        <div className="p-4">
          <BlockContentPreview block={block} globalSettings={globalSettings} />
        </div>
      </div>
    </motion.div>
  )
}

// Componente que renderiza o preview do conteúdo do bloco
function BlockContentPreview({ block, globalSettings }: { block: Block; globalSettings: GlobalSettings }) {
  const { type, settings } = block

  switch (type) {
    case 'hero':
      return <HeroPreview settings={settings as any} globalSettings={globalSettings} />
    case 'products':
      return <ProductsPreview settings={settings as any} globalSettings={globalSettings} />
    case 'form':
      return <FormPreview settings={settings as any} globalSettings={globalSettings} />
    case 'testimonials':
      return <TestimonialsPreview settings={settings as any} />
    case 'faq':
      return <FAQPreview settings={settings as any} />
    case 'text':
      return <TextPreview settings={settings as any} />
    case 'cta':
      return <CTAPreview settings={settings as any} />
    case 'features':
      return <FeaturesPreview settings={settings as any} />
    case 'countdown':
      return <CountdownPreview settings={settings as any} />
    case 'divider':
      return <DividerPreview settings={settings as any} />
    case 'header':
      return <HeaderPreview settings={settings as any} />
    case 'footer':
      return <FooterPreview settings={settings as any} />
    case 'image':
      return <ImagePreview settings={settings as any} />
    case 'video':
      return <VideoPreview settings={settings as any} />
    case 'gallery':
      return <GalleryPreview settings={settings as any} />
    case 'columns':
      return <ColumnsPreview settings={settings as any} />
    case 'section':
      return <SectionPreview settings={settings as any} />
    default:
      return <div className="p-8 text-center text-muted-foreground">Preview: {type}</div>
  }
}

// Previews individuais
function HeroPreview({ settings, globalSettings }: { settings: any; globalSettings: GlobalSettings }) {
  const bgStyle = settings.backgroundType === 'gradient'
    ? { background: `linear-gradient(135deg, ${settings.gradientFrom}, ${settings.gradientTo})` }
    : { backgroundColor: settings.backgroundColor }

  return (
    <div
      className="rounded-lg p-8 text-center"
      style={{ ...bgStyle, color: settings.textColor }}
    >
      <h2 className="text-2xl font-bold mb-2">{settings.title || 'Título do Hero'}</h2>
      <p className="text-sm opacity-80 mb-4">{settings.subtitle || 'Subtítulo aqui'}</p>
      <button
        className="px-6 py-2 rounded-lg font-medium text-white"
        style={{ backgroundColor: settings.ctaColor }}
      >
        {settings.ctaText || 'Botão CTA'}
      </button>
    </div>
  )
}

function ProductsPreview({ settings, globalSettings }: { settings: any; globalSettings: GlobalSettings }) {
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: settings.backgroundColor }}>
      <h3 className="text-lg font-semibold text-center mb-2">{settings.title || 'Produtos'}</h3>
      {settings.subtitle && (
        <p className="text-sm text-muted-foreground text-center mb-4">{settings.subtitle}</p>
      )}
      <div className={`grid grid-cols-${settings.columns} gap-3`}>
        {[1, 2, 3].slice(0, settings.columns).map((i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="aspect-[4/3] bg-gray-100 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormPreview({ settings, globalSettings }: { settings: any; globalSettings: GlobalSettings }) {
  return (
    <div className="rounded-lg p-6 max-w-md mx-auto" style={{ backgroundColor: settings.backgroundColor }}>
      <h3 className="text-lg font-semibold text-center mb-2">{settings.title || 'Formulário'}</h3>
      {settings.subtitle && (
        <p className="text-sm text-muted-foreground text-center mb-4">{settings.subtitle}</p>
      )}
      <div className="space-y-3">
        {(settings.fields || []).slice(0, 3).map((field: any, i: number) => (
          <div key={i}>
            <div className="h-2 bg-gray-200 rounded w-1/4 mb-1"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
        ))}
        <button
          className="w-full py-2 rounded-lg font-medium text-white"
          style={{ backgroundColor: settings.buttonColor }}
        >
          {settings.buttonText || 'Enviar'}
        </button>
      </div>
    </div>
  )
}

function TestimonialsPreview({ settings }: { settings: any }) {
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: settings.backgroundColor }}>
      <h3 className="text-lg font-semibold text-center mb-4">{settings.title || 'Depoimentos'}</h3>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-gray-200"></div>
              <div>
                <div className="h-2 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-2 bg-gray-100 rounded w-12"></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded"></div>
              <div className="h-2 bg-gray-100 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FAQPreview({ settings }: { settings: any }) {
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: settings.backgroundColor }}>
      <h3 className="text-lg font-semibold text-center mb-4">{settings.title || 'FAQ'}</h3>
      <div className="space-y-2 max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TextPreview({ settings }: { settings: any }) {
  const TitleTag = (settings.titleTag || 'h2') as keyof JSX.IntrinsicElements
  
  const fontSizeClasses: Record<string, string> = {
    xs: 'text-xs',
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xl: 'text-xl',
  }
  
  const fontWeightClasses: Record<string, string> = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }
  
  const lineHeightClasses: Record<string, string> = {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
  }
  
  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
  }
  
  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    lg: 'max-w-4xl',
    md: 'max-w-2xl',
    sm: 'max-w-xl',
  }

  return (
    <div
      className={cn(
        "rounded-lg",
        paddingClasses[settings.padding || 'medium'],
        maxWidthClasses[settings.maxWidth || 'full'],
        settings.maxWidth !== 'full' && 'mx-auto'
      )}
      style={{
        backgroundColor: settings.backgroundColor || 'transparent',
        textAlign: settings.alignment,
      }}
    >
      {settings.title && (
        <TitleTag 
          className={cn(
            "mb-4",
            settings.titleTag === 'h1' && 'text-3xl font-bold',
            settings.titleTag === 'h2' && 'text-2xl font-semibold',
            settings.titleTag === 'h3' && 'text-xl font-semibold',
            settings.titleTag === 'h4' && 'text-lg font-medium',
            settings.titleTag === 'p' && 'text-lg font-medium',
          )}
          style={{ color: settings.titleColor || settings.textColor }}
        >
          {settings.title}
        </TitleTag>
      )}
      <p 
        className={cn(
          fontSizeClasses[settings.fontSize || 'medium'],
          fontWeightClasses[settings.fontWeight || 'normal'],
          lineHeightClasses[settings.lineHeight || 'normal'],
        )}
        style={{ color: settings.textColor }}
      >
        {settings.content || 'Seu texto aqui...'}
      </p>
    </div>
  )
}

function CTAPreview({ settings }: { settings: any }) {
  return (
    <div
      className="rounded-lg p-8 text-center"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      <h3 className="text-xl font-bold mb-2">{settings.title || 'Call to Action'}</h3>
      <p className="text-sm opacity-80 mb-4">{settings.subtitle || 'Subtítulo'}</p>
      <button
        className="px-6 py-2 rounded-lg font-medium text-white"
        style={{ backgroundColor: settings.buttonColor }}
      >
        {settings.buttonText || 'Botão'}
      </button>
    </div>
  )
}

function FeaturesPreview({ settings }: { settings: any }) {
  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: settings.backgroundColor }}>
      <h3 className="text-lg font-semibold text-center mb-4">{settings.title || 'Recursos'}</h3>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 mx-auto mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto mb-1"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2 mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountdownPreview({ settings }: { settings: any }) {
  return (
    <div
      className="rounded-lg p-6 text-center"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      <h3 className="text-lg font-semibold mb-4">{settings.title || 'Contador'}</h3>
      <div className="flex justify-center gap-4">
        {['Dias', 'Horas', 'Min', 'Seg'].map((label) => (
          <div key={label} className="text-center">
            <div className="text-2xl font-bold">00</div>
            <div className="text-xs opacity-70">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DividerPreview({ settings }: { settings: any }) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      settings.height === 'small' && 'py-4',
      settings.height === 'medium' && 'py-8',
      settings.height === 'large' && 'py-12',
    )}>
      {settings.style === 'line' && (
        <div className="w-full h-px" style={{ backgroundColor: settings.color }}></div>
      )}
      {settings.style === 'dots' && (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: settings.color }}></div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeaderPreview({ settings }: { settings: any }) {
  return (
    <div
      className="rounded-lg p-4 flex items-center justify-between"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      {settings.logo ? (
        <img src={settings.logo} alt="Logo" className="h-10 max-w-[150px] object-contain" />
      ) : (
        <div className="h-8 w-24 bg-gray-300/50 rounded flex items-center justify-center text-xs text-gray-500">
          Logo
        </div>
      )}
      {settings.showMenu && (
        <div className="flex gap-4">
          <div className="h-2 w-12 bg-gray-300/50 rounded"></div>
          <div className="h-2 w-12 bg-gray-300/50 rounded"></div>
          <div className="h-2 w-12 bg-gray-300/50 rounded"></div>
        </div>
      )}
    </div>
  )
}

function FooterPreview({ settings }: { settings: any }) {
  return (
    <div
      className="rounded-lg p-6 text-center"
      style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
    >
      <p className="text-sm">{settings.copyright || '© 2024 Sua Empresa'}</p>
    </div>
  )
}

function ImagePreview({ settings }: { settings: any }) {
  return (
    <div
      className={cn(
        "rounded-lg p-4",
        settings.alignment === 'left' && 'text-left',
        settings.alignment === 'center' && 'text-center',
        settings.alignment === 'right' && 'text-right'
      )}
    >
      {settings.src ? (
        <div className="inline-block">
          <img
            src={settings.src}
            alt={settings.alt || 'Imagem'}
            className={cn(
              "max-w-full h-auto",
              settings.borderRadius === 'small' && 'rounded',
              settings.borderRadius === 'medium' && 'rounded-lg',
              settings.borderRadius === 'large' && 'rounded-2xl',
              settings.borderRadius === 'full' && 'rounded-full',
              settings.shadow && 'shadow-lg',
              settings.width === '50%' && 'w-1/2',
              settings.width === '75%' && 'w-3/4',
              settings.width === 'full' && 'w-full'
            )}
          />
          {settings.caption && (
            <p className="text-sm text-muted-foreground mt-2">{settings.caption}</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="h-16 w-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🖼️</span>
            </div>
            <p className="text-sm">Adicione uma URL de imagem</p>
          </div>
        </div>
      )}
    </div>
  )
}

function VideoPreview({ settings }: { settings: any }) {
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    return url
  }

  const embedUrl = getEmbedUrl(settings.url)

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: settings.backgroundColor }}
    >
      {settings.title && (
        <h4 className="text-sm font-medium mb-2 text-center">{settings.title}</h4>
      )}
      {embedUrl ? (
        <div className={cn(
          "relative w-full overflow-hidden rounded-lg",
          settings.aspectRatio === '16:9' && 'aspect-video',
          settings.aspectRatio === '4:3' && 'aspect-[4/3]',
          settings.aspectRatio === '1:1' && 'aspect-square'
        )}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center aspect-video">
          <div className="text-center text-gray-400">
            <div className="h-16 w-16 mx-auto mb-2 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-2xl">▶️</span>
            </div>
            <p className="text-sm">Adicione uma URL de vídeo</p>
          </div>
        </div>
      )}
    </div>
  )
}

function GalleryPreview({ settings }: { settings: any }) {
  const images = settings.images || []
  const columns = settings.columns || 3

  return (
    <div className="rounded-lg p-4">
      {images.length > 0 ? (
        <div className={cn(
          "grid",
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-3',
          columns === 4 && 'grid-cols-4',
          settings.gap === 'small' && 'gap-2',
          settings.gap === 'medium' && 'gap-4',
          settings.gap === 'large' && 'gap-6'
        )}>
          {images.map((img: any, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              {img.src ? (
                <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span>🖼️</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-3',
          columns === 4 && 'grid-cols-4'
        )}>
          {[1, 2, 3, 4, 5, 6].slice(0, columns * 2).map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">🖼️</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ColumnsPreview({ settings }: { settings: any }) {
  const columns = settings.columns || 2
  const contents = settings.columnContents || []
  
  const gapClasses: Record<string, string> = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
  }
  
  const alignClasses: Record<string, string> = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  }
  
  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  }

  return (
    <div
      className={cn(
        "rounded-lg",
        paddingClasses[settings.padding || 'medium']
      )}
      style={{ backgroundColor: settings.backgroundColor || 'transparent' }}
    >
      <div className={cn(
        "grid",
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        gapClasses[settings.gap || 'medium'],
        alignClasses[settings.alignment || 'top']
      )}>
        {Array.from({ length: columns }).map((_, index) => {
          const col = contents[index] || { type: 'text', content: `Coluna ${index + 1}` }
          
          return (
            <div 
              key={index} 
              className={cn(
                "p-4 bg-white/50 rounded-lg",
                col.alignment === 'left' && 'text-left',
                col.alignment === 'center' && 'text-center',
                col.alignment === 'right' && 'text-right'
              )}
            >
              {col.type === 'text' && (
                <>
                  {col.title && <h4 className="font-semibold mb-1">{col.title}</h4>}
                  <p className="text-sm text-muted-foreground">{col.content || 'Conteúdo'}</p>
                </>
              )}
              
              {col.type === 'image' && (
                col.imageUrl ? (
                  <img src={col.imageUrl} alt="" className="w-full h-auto rounded" />
                ) : (
                  <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-gray-400">
                    🖼️
                  </div>
                )
              )}
              
              {col.type === 'button' && (
                <button 
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: col.buttonColor || '#3B82F6' }}
                >
                  {col.buttonText || 'Botão'}
                </button>
              )}
              
              {col.type === 'icon' && (
                <div className="text-center">
                  <span className="text-3xl block mb-2">{col.iconName || '✨'}</span>
                  {col.title && <h4 className="font-semibold mb-1">{col.title}</h4>}
                  {col.content && <p className="text-sm text-muted-foreground">{col.content}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionPreview({ settings }: { settings: any }) {
  const elements = settings.elements || []
  
  const paddingClasses: Record<string, string> = {
    none: 'py-0',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-12',
    xl: 'py-16',
  }
  
  const maxWidthClasses: Record<string, string> = {
    full: 'max-w-full',
    xl: 'max-w-6xl',
    lg: 'max-w-4xl',
    md: 'max-w-2xl',
  }

  const bgStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    color: settings.textColor,
  }
  
  if (settings.backgroundImage) {
    bgStyle.backgroundImage = `url(${settings.backgroundImage})`
    bgStyle.backgroundSize = 'cover'
    bgStyle.backgroundPosition = 'center'
  }

  return (
    <div className={cn("rounded-lg relative", paddingClasses[settings.padding || 'large'])} style={bgStyle}>
      {settings.backgroundOverlay && settings.backgroundImage && (
        <div 
          className="absolute inset-0 rounded-lg"
          style={{ 
            backgroundColor: settings.overlayColor || '#000000',
            opacity: (settings.overlayOpacity || 50) / 100
          }}
        />
      )}
      
      <div className={cn(
        "relative mx-auto px-4",
        maxWidthClasses[settings.maxWidth || 'lg'],
        settings.alignment === 'left' && 'text-left',
        settings.alignment === 'center' && 'text-center',
        settings.alignment === 'right' && 'text-right'
      )}>
        {settings.title && (
          <h2 className="text-2xl font-bold mb-2">{settings.title}</h2>
        )}
        {settings.subtitle && (
          <p className="text-lg opacity-80 mb-6">{settings.subtitle}</p>
        )}
        
        {elements.length > 0 ? (
          <div className="space-y-4">
            {elements.map((el: any, index: number) => (
              <div key={el.id || index}>
                {el.type === 'text' && (
                  <p className="text-sm">{el.settings.content || 'Texto'}</p>
                )}
                {el.type === 'image' && (
                  el.settings.src ? (
                    <img src={el.settings.src} alt="" className="max-w-full h-auto mx-auto rounded" />
                  ) : (
                    <div className="h-32 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                      🖼️ Imagem
                    </div>
                  )
                )}
                {el.type === 'button' && (
                  <button 
                    className="px-6 py-2 rounded text-white font-medium"
                    style={{ backgroundColor: el.settings.color || '#3B82F6' }}
                  >
                    {el.settings.text || 'Botão'}
                  </button>
                )}
                {el.type === 'spacer' && (
                  <div className={cn(
                    el.settings.height === 'small' && 'h-4',
                    el.settings.height === 'medium' && 'h-8',
                    el.settings.height === 'large' && 'h-12'
                  )} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed rounded-lg text-muted-foreground text-center">
            <p className="text-sm">Adicione elementos à seção</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getBlockLabel(type: BlockType): string {
  const labels: Record<BlockType, string> = {
    header: 'Cabeçalho',
    hero: 'Hero',
    products: 'Produtos',
    form: 'Formulário',
    testimonials: 'Depoimentos',
    faq: 'FAQ',
    text: 'Texto',
    image: 'Imagem',
    video: 'Vídeo',
    gallery: 'Galeria',
    countdown: 'Contador',
    features: 'Recursos',
    cta: 'CTA',
    divider: 'Divisor',
    footer: 'Rodapé',
    columns: 'Colunas',
    section: 'Seção',
  }
  return labels[type]
}

