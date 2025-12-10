import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accentColor, fontSize, compactMode } = useUIStore()

  // Aplicar tema
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // Listener para mudanças no tema do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        root.classList.remove('light', 'dark')
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Aplicar cor de destaque
  useEffect(() => {
    const accentColors: Record<string, string> = {
      blue: '#3B82F6',
      purple: '#8B5CF6',
      green: '#10B981',
      orange: '#F97316',
      pink: '#EC4899',
      cyan: '#06B6D4',
      red: '#EF4444',
      amber: '#F59E0B',
    }
    
    const color = accentColors[accentColor] || accentColors.blue
    document.documentElement.style.setProperty('--accent-color', color)
    document.documentElement.style.setProperty('--color-primary', color)
  }, [accentColor])

  // Aplicar tamanho de fonte
  useEffect(() => {
    const fontSizes: Record<string, string> = {
      small: '14px',
      normal: '16px',
      large: '18px',
    }
    
    document.documentElement.style.fontSize = fontSizes[fontSize] || '16px'
  }, [fontSize])

  // Aplicar modo compacto
  useEffect(() => {
    if (compactMode) {
      document.documentElement.classList.add('compact')
    } else {
      document.documentElement.classList.remove('compact')
    }
  }, [compactMode])

  return <>{children}</>
}

