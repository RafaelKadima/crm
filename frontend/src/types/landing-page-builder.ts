// ============================================
// LANDING PAGE BUILDER - TIPOS E ESTRUTURAS
// ============================================

// Tipos de blocos disponíveis
export type BlockType = 
  | 'header'
  | 'hero'
  | 'products'      // Obrigatório
  | 'form'          // Obrigatório
  | 'testimonials'
  | 'faq'
  | 'text'
  | 'image'
  | 'video'
  | 'gallery'
  | 'countdown'
  | 'features'
  | 'cta'
  | 'divider'
  | 'footer'
  | 'columns'       // Container com colunas
  | 'section'       // Container de seção

// Bloco base
export interface Block {
  id: string
  type: BlockType
  order: number
  settings: BlockSettings
  isRequired?: boolean
  children?: Block[]  // Para blocos container
}

// Configurações específicas de cada bloco
export interface HeaderSettings {
  logo?: string
  showMenu: boolean
  menuItems: { label: string; href: string }[]
  sticky: boolean
  backgroundColor: string
  textColor: string
}

export interface HeroSettings {
  title: string
  subtitle: string
  backgroundType: 'color' | 'image' | 'gradient'
  backgroundColor: string
  backgroundImage?: string
  gradientFrom: string
  gradientTo: string
  textColor: string
  ctaText: string
  ctaColor: string
  alignment: 'left' | 'center' | 'right'
  height: 'small' | 'medium' | 'large' | 'full'
  overlay: boolean
  overlayOpacity: number
}

export interface ProductsSettings {
  title: string
  subtitle: string
  columns: 2 | 3 | 4
  showDescription: boolean
  cardStyle: 'minimal' | 'bordered' | 'shadow'
  backgroundColor: string
}

export interface FormSettings {
  title: string
  subtitle: string
  buttonText: string
  buttonColor: string
  fields: FormField[]
  backgroundColor: string
  style: 'inline' | 'card' | 'floating'
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select'
  required: boolean
  placeholder?: string
  options?: string[] // Para select
}

export interface TestimonialsSettings {
  title: string
  items: Testimonial[]
  layout: 'grid' | 'carousel' | 'list'
  columns: 1 | 2 | 3
  showRating: boolean
  showImage: boolean
  backgroundColor: string
}

export interface Testimonial {
  id: string
  name: string
  role?: string
  content: string
  image?: string
  rating?: number
}

export interface FAQSettings {
  title: string
  items: FAQItem[]
  style: 'accordion' | 'list'
  backgroundColor: string
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}

export interface TextSettings {
  content: string
  alignment: 'left' | 'center' | 'right'
  fontSize: 'small' | 'medium' | 'large'
  backgroundColor: string
  textColor: string
  padding: 'none' | 'small' | 'medium' | 'large'
}

export interface ImageSettings {
  src: string
  alt: string
  caption?: string
  width: 'auto' | 'full' | '50%' | '75%'
  alignment: 'left' | 'center' | 'right'
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
  shadow: boolean
}

export interface VideoSettings {
  url: string
  title?: string
  autoplay: boolean
  controls: boolean
  aspectRatio: '16:9' | '4:3' | '1:1'
  backgroundColor: string
}

export interface GallerySettings {
  images: { src: string; alt: string }[]
  columns: 2 | 3 | 4
  gap: 'small' | 'medium' | 'large'
  style: 'grid' | 'masonry'
}

export interface CountdownSettings {
  title: string
  targetDate: string
  showDays: boolean
  showHours: boolean
  showMinutes: boolean
  showSeconds: boolean
  backgroundColor: string
  textColor: string
  style: 'boxes' | 'inline'
}

export interface FeaturesSettings {
  title: string
  subtitle: string
  items: FeatureItem[]
  columns: 2 | 3 | 4
  iconStyle: 'circle' | 'square' | 'none'
  backgroundColor: string
}

export interface FeatureItem {
  id: string
  icon: string
  title: string
  description: string
}

export interface CTASettings {
  title: string
  subtitle: string
  buttonText: string
  buttonColor: string
  backgroundColor: string
  textColor: string
  style: 'simple' | 'gradient' | 'image'
  backgroundImage?: string
}

export interface DividerSettings {
  style: 'line' | 'dots' | 'wave' | 'none'
  color: string
  height: 'small' | 'medium' | 'large'
}

export interface FooterSettings {
  copyright: string
  showSocialLinks: boolean
  socialLinks: { platform: string; url: string }[]
  backgroundColor: string
  textColor: string
  columns: 1 | 2 | 3 | 4
}

export interface ColumnsSettings {
  columns: 2 | 3 | 4
  gap: 'small' | 'medium' | 'large'
  alignment: 'top' | 'center' | 'bottom'
  backgroundColor: string
  padding: 'none' | 'small' | 'medium' | 'large'
  // Cada coluna pode ter: tipo (text, image, etc) e conteúdo
  columnContents: ColumnContent[]
}

export interface ColumnContent {
  type: 'text' | 'image' | 'button' | 'icon'
  content: string
  title?: string
  subtitle?: string
  imageUrl?: string
  buttonText?: string
  buttonUrl?: string
  buttonColor?: string
  iconName?: string
  alignment?: 'left' | 'center' | 'right'
}

export interface SectionSettings {
  title?: string
  subtitle?: string
  backgroundColor: string
  backgroundImage?: string
  backgroundOverlay: boolean
  overlayColor: string
  overlayOpacity: number
  textColor: string
  padding: 'none' | 'small' | 'medium' | 'large' | 'xl'
  maxWidth: 'full' | 'xl' | 'lg' | 'md'
  alignment: 'left' | 'center' | 'right'
  // Elementos dentro da seção
  elements: SectionElement[]
}

export interface SectionElement {
  id: string
  type: 'text' | 'image' | 'button' | 'spacer' | 'icon-list'
  settings: any
}

// Union type de todas as settings
export type BlockSettings = 
  | HeaderSettings
  | HeroSettings
  | ProductsSettings
  | FormSettings
  | TestimonialsSettings
  | FAQSettings
  | TextSettings
  | ImageSettings
  | VideoSettings
  | GallerySettings
  | CountdownSettings
  | FeaturesSettings
  | CTASettings
  | DividerSettings
  | FooterSettings
  | ColumnsSettings
  | SectionSettings

// Configurações globais da landing page
export interface GlobalSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  fontFamily: 'Inter' | 'Poppins' | 'Roboto' | 'Open Sans' | 'Montserrat' | 'Lato'
  borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full'
  spacing: 'compact' | 'normal' | 'relaxed'
}

// Estrutura completa da landing page
export interface LandingPageData {
  blocks: Block[]
  globalSettings: GlobalSettings
  products: string[] // IDs dos produtos selecionados
}

// Definição de um tipo de bloco (para a sidebar)
export interface BlockDefinition {
  type: BlockType
  label: string
  icon: string
  description: string
  isRequired?: boolean
  defaultSettings: BlockSettings
}

// Lista de blocos disponíveis
export const AVAILABLE_BLOCKS: BlockDefinition[] = [
  {
    type: 'header',
    label: 'Cabeçalho',
    icon: '🎨',
    description: 'Logo e menu de navegação',
    defaultSettings: {
      showMenu: false,
      menuItems: [],
      sticky: true,
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    } as HeaderSettings,
  },
  {
    type: 'hero',
    label: 'Hero Section',
    icon: '🦸',
    description: 'Título principal com chamada para ação',
    defaultSettings: {
      title: 'Bem-vindo à nossa loja',
      subtitle: 'Encontre os melhores produtos aqui',
      backgroundType: 'gradient',
      backgroundColor: '#3B82F6',
      gradientFrom: '#3B82F6',
      gradientTo: '#8B5CF6',
      textColor: '#ffffff',
      ctaText: 'Ver produtos',
      ctaColor: '#22C55E',
      alignment: 'center',
      height: 'medium',
      overlay: false,
      overlayOpacity: 50,
    } as HeroSettings,
  },
  {
    type: 'products',
    label: 'Produtos',
    icon: '📦',
    description: 'Grid de produtos (obrigatório)',
    isRequired: true,
    defaultSettings: {
      title: 'Nossos Produtos',
      subtitle: 'Escolha o produto de seu interesse',
      columns: 3,
      showDescription: true,
      cardStyle: 'shadow',
      backgroundColor: '#f9fafb',
    } as ProductsSettings,
  },
  {
    type: 'form',
    label: 'Formulário',
    icon: '📝',
    description: 'Captura de leads (obrigatório)',
    isRequired: true,
    defaultSettings: {
      title: 'Tenho interesse!',
      subtitle: 'Preencha seus dados para receber mais informações',
      buttonText: 'Enviar',
      buttonColor: '#22C55E',
      fields: [
        { name: 'name', label: 'Nome completo', type: 'text', required: true, placeholder: 'Seu nome' },
        { name: 'phone', label: 'WhatsApp', type: 'phone', required: true, placeholder: '(11) 99999-9999' },
        { name: 'email', label: 'E-mail', type: 'email', required: false, placeholder: 'seu@email.com' },
      ],
      backgroundColor: '#ffffff',
      style: 'card',
    } as FormSettings,
  },
  {
    type: 'testimonials',
    label: 'Depoimentos',
    icon: '⭐',
    description: 'Avaliações de clientes',
    defaultSettings: {
      title: 'O que nossos clientes dizem',
      items: [],
      layout: 'grid',
      columns: 3,
      showRating: true,
      showImage: true,
      backgroundColor: '#ffffff',
    } as TestimonialsSettings,
  },
  {
    type: 'faq',
    label: 'FAQ',
    icon: '❓',
    description: 'Perguntas frequentes',
    defaultSettings: {
      title: 'Perguntas Frequentes',
      items: [],
      style: 'accordion',
      backgroundColor: '#f9fafb',
    } as FAQSettings,
  },
  {
    type: 'features',
    label: 'Recursos',
    icon: '✨',
    description: 'Lista de benefícios ou recursos',
    defaultSettings: {
      title: 'Por que escolher a gente?',
      subtitle: '',
      items: [],
      columns: 3,
      iconStyle: 'circle',
      backgroundColor: '#ffffff',
    } as FeaturesSettings,
  },
  {
    type: 'text',
    label: 'Texto',
    icon: '📄',
    description: 'Bloco de texto livre',
    defaultSettings: {
      content: 'Seu texto aqui...',
      alignment: 'left',
      fontSize: 'medium',
      backgroundColor: 'transparent',
      textColor: '#1f2937',
      padding: 'medium',
    } as TextSettings,
  },
  {
    type: 'image',
    label: 'Imagem',
    icon: '🖼️',
    description: 'Imagem com legenda opcional',
    defaultSettings: {
      src: '',
      alt: '',
      width: 'full',
      alignment: 'center',
      borderRadius: 'medium',
      shadow: true,
    } as ImageSettings,
  },
  {
    type: 'video',
    label: 'Vídeo',
    icon: '📹',
    description: 'Vídeo do YouTube ou Vimeo',
    defaultSettings: {
      url: '',
      autoplay: false,
      controls: true,
      aspectRatio: '16:9',
      backgroundColor: '#000000',
    } as VideoSettings,
  },
  {
    type: 'cta',
    label: 'Call to Action',
    icon: '🎯',
    description: 'Banner de chamada para ação',
    defaultSettings: {
      title: 'Pronto para começar?',
      subtitle: 'Entre em contato agora mesmo',
      buttonText: 'Fale conosco',
      buttonColor: '#22C55E',
      backgroundColor: '#3B82F6',
      textColor: '#ffffff',
      style: 'gradient',
    } as CTASettings,
  },
  {
    type: 'countdown',
    label: 'Contador',
    icon: '⏰',
    description: 'Contagem regressiva',
    defaultSettings: {
      title: 'Oferta termina em:',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      backgroundColor: '#1f2937',
      textColor: '#ffffff',
      style: 'boxes',
    } as CountdownSettings,
  },
  {
    type: 'divider',
    label: 'Divisor',
    icon: '➖',
    description: 'Linha separadora',
    defaultSettings: {
      style: 'line',
      color: '#e5e7eb',
      height: 'medium',
    } as DividerSettings,
  },
  {
    type: 'footer',
    label: 'Rodapé',
    icon: '📋',
    description: 'Rodapé com informações',
    defaultSettings: {
      copyright: '© 2024 Sua Empresa. Todos os direitos reservados.',
      showSocialLinks: true,
      socialLinks: [],
      backgroundColor: '#1f2937',
      textColor: '#9ca3af',
      columns: 1,
    } as FooterSettings,
  },
  {
    type: 'columns',
    label: 'Colunas',
    icon: '📊',
    description: 'Layout com múltiplas colunas',
    defaultSettings: {
      columns: 2,
      gap: 'medium',
      alignment: 'top',
      backgroundColor: 'transparent',
      padding: 'medium',
      columnContents: [
        { type: 'text', content: 'Coluna 1', alignment: 'center' },
        { type: 'text', content: 'Coluna 2', alignment: 'center' },
      ],
    } as ColumnsSettings,
  },
  {
    type: 'section',
    label: 'Seção',
    icon: '📦',
    description: 'Container com elementos personalizados',
    defaultSettings: {
      title: '',
      subtitle: '',
      backgroundColor: '#f9fafb',
      backgroundOverlay: false,
      overlayColor: '#000000',
      overlayOpacity: 50,
      textColor: '#1f2937',
      padding: 'large',
      maxWidth: 'lg',
      alignment: 'center',
      elements: [],
    } as SectionSettings,
  },
]

// Configurações globais padrão
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  primaryColor: '#3B82F6',
  secondaryColor: '#8B5CF6',
  accentColor: '#22C55E',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter',
  borderRadius: 'medium',
  spacing: 'normal',
}

// Blocos padrão para nova landing page
export const DEFAULT_BLOCKS: Block[] = [
  {
    id: 'default-hero',
    type: 'hero',
    order: 0,
    settings: AVAILABLE_BLOCKS.find(b => b.type === 'hero')!.defaultSettings,
  },
  {
    id: 'default-products',
    type: 'products',
    order: 1,
    isRequired: true,
    settings: AVAILABLE_BLOCKS.find(b => b.type === 'products')!.defaultSettings,
  },
  {
    id: 'default-form',
    type: 'form',
    order: 2,
    isRequired: true,
    settings: AVAILABLE_BLOCKS.find(b => b.type === 'form')!.defaultSettings,
  },
]

