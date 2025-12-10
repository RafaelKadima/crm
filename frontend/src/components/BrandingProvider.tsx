import { useEffect, createContext, useContext } from 'react'
import { useBranding, DEFAULT_BRANDING, type TenantBranding, type Branding } from '@/hooks/useBranding'

interface BrandingContextType {
  branding: Branding
  name: string
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  isLoading: boolean
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  name: '',
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  isLoading: true,
})

export function useTenantBranding() {
  return useContext(BrandingContext)
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useBranding()

  const branding = data?.branding ?? DEFAULT_BRANDING

  // Aplicar cores como variáveis CSS
  useEffect(() => {
    if (!data) return

    const root = document.documentElement
    const b = data.branding ?? DEFAULT_BRANDING

    // Cores principais
    root.style.setProperty('--branding-primary', b.primary_color)
    root.style.setProperty('--branding-secondary', b.secondary_color)
    root.style.setProperty('--branding-accent', b.accent_color)
    
    // Sidebar
    root.style.setProperty('--branding-sidebar-bg', b.sidebar_color)
    root.style.setProperty('--branding-sidebar-text', b.sidebar_text_color)
    
    // Header
    root.style.setProperty('--branding-header-bg', b.header_color)
    root.style.setProperty('--branding-header-text', b.header_text_color)
    
    // Estilos
    root.style.setProperty('--branding-button-radius', `${b.button_radius}px`)
    root.style.setProperty('--branding-font-family', b.font_family)

    // Adicionar fonte do Google Fonts se não for a padrão
    if (b.font_family !== 'DM Sans') {
      const fontLink = document.getElementById('branding-font-link')
      const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(b.font_family)}:wght@400;500;600;700&display=swap`
      
      if (fontLink) {
        fontLink.setAttribute('href', fontUrl)
      } else {
        const link = document.createElement('link')
        link.id = 'branding-font-link'
        link.rel = 'stylesheet'
        link.href = fontUrl
        document.head.appendChild(link)
      }
    }

    // Atualizar favicon
    if (data.favicon_url) {
      const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (favicon) {
        favicon.href = data.favicon_url
      } else {
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = data.favicon_url
        document.head.appendChild(link)
      }
    }

    // Atualizar título da página
    if (data.name) {
      document.title = `${data.name} - CRM`
    }
  }, [data])

  const value: BrandingContextType = {
    branding,
    name: data?.name ?? '',
    logoUrl: data?.logo_url ?? null,
    logoDarkUrl: data?.logo_dark_url ?? null,
    faviconUrl: data?.favicon_url ?? null,
    isLoading,
  }

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}
