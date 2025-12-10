import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  fontSize: 'small' | 'normal' | 'large'
  compactMode: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setAccentColor: (color: string) => void
  setFontSize: (size: 'small' | 'normal' | 'large') => void
  setCompactMode: (compact: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'dark',
      accentColor: 'blue',
      fontSize: 'normal',
      compactMode: false,

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed,
      })),

      setSidebarCollapsed: (collapsed) => set({
        sidebarCollapsed: collapsed,
      }),

      setTheme: (theme) => set({ theme }),
      
      setAccentColor: (accentColor) => set({ accentColor }),
      
      setFontSize: (fontSize) => set({ fontSize }),
      
      setCompactMode: (compactMode) => set({ compactMode }),
    }),
    {
      name: 'crm-ui',
    }
  )
)

