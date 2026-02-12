import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

const themes = [
  { id: 'light', icon: Sun, preview: 'bg-gray-100 border-2 border-gray-300' },
  { id: 'dark', icon: Moon, preview: 'bg-background border-2 border-border' },
  { id: 'system', icon: Monitor, preview: 'bg-gradient-to-r from-gray-100 to-gray-900 border-2 border-border' },
]

const accentColors = [
  { id: 'blue', color: '#3B82F6', class: 'bg-blue-500' },
  { id: 'purple', color: '#8B5CF6', class: 'bg-purple-500' },
  { id: 'green', color: '#10B981', class: 'bg-emerald-500' },
  { id: 'orange', color: '#F97316', class: 'bg-orange-500' },
  { id: 'pink', color: '#EC4899', class: 'bg-pink-500' },
  { id: 'cyan', color: '#06B6D4', class: 'bg-cyan-500' },
  { id: 'red', color: '#EF4444', class: 'bg-red-500' },
  { id: 'amber', color: '#F59E0B', class: 'bg-amber-500' },
]

const fontSizes = [
  { id: 'small', scale: '14px' },
  { id: 'normal', scale: '16px' },
  { id: 'large', scale: '18px' },
]

export function AppearanceSettingsPage() {
  const { t } = useTranslation()
  const { 
    theme, setTheme, 
    accentColor, setAccentColor, 
    fontSize, setFontSize, 
    compactMode, setCompactMode 
  } = useUIStore()
  
  const [selectedTheme, setSelectedTheme] = useState(theme)
  const [selectedAccent, setSelectedAccent] = useState(accentColor)
  const [selectedFontSize, setSelectedFontSize] = useState(fontSize)
  const [selectedCompactMode, setSelectedCompactMode] = useState(compactMode)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Aplicar tema ao documento
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Aplicar cor de destaque
  useEffect(() => {
    const colorObj = accentColors.find(c => c.id === accentColor)
    if (colorObj) {
      document.documentElement.style.setProperty('--accent-color', colorObj.color)
    }
  }, [accentColor])

  // Aplicar tamanho de fonte
  useEffect(() => {
    const sizeObj = fontSizes.find(s => s.id === fontSize)
    if (sizeObj) {
      document.documentElement.style.setProperty('--base-font-size', sizeObj.scale)
    }
  }, [fontSize])

  const handleSave = async () => {
    setLoading(true)
    
    // Aplicar todas as configurações
    setTheme(selectedTheme)
    setAccentColor(selectedAccent)
    setFontSize(selectedFontSize as 'small' | 'normal' | 'large')
    setCompactMode(selectedCompactMode)
    
    await new Promise(resolve => setTimeout(resolve, 300))
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="w-6 h-6 text-pink-500" />
          {t('appearancePage.title')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('appearancePage.subtitle')}
        </p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">{t('appearancePage.saveSuccess')}</p>
        </motion.div>
      )}

      {/* Tema */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('appearancePage.theme')}</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((thm) => (
            <button
              key={thm.id}
              onClick={() => setSelectedTheme(thm.id as 'light' | 'dark' | 'system')}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                selectedTheme === thm.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border hover:border-border'
              }`}
            >
              {selectedTheme === thm.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`w-full h-20 rounded-lg mb-3 ${thm.preview}`} />
              <div className="flex items-center gap-2 justify-center">
                <thm.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{t(`appearancePage.themes.${thm.id}`)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cor de Destaque */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('appearancePage.accentColor')}</h3>
        <div className="flex flex-wrap gap-3">
          {accentColors.map((color) => (
            <button
              key={color.id}
              onClick={() => setSelectedAccent(color.id)}
              className={`relative w-12 h-12 rounded-full transition-transform hover:scale-110 ${
                selectedAccent === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
              }`}
              style={{ backgroundColor: color.color }}
              title={t(`appearancePage.colors.${color.id}`)}
            >
              {selectedAccent === color.id && (
                <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tamanho da Fonte */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('appearancePage.fontSize')}</h3>
        <div className="flex gap-3">
          {fontSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setSelectedFontSize(size.id as 'small' | 'normal' | 'large')}
              className={`flex-1 py-3 px-4 rounded-lg border transition-colors ${
                selectedFontSize === size.id
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-border hover:border-border'
              }`}
            >
              <span className="font-medium" style={{ fontSize: size.scale }}>
                {t(`appearancePage.fontSizes.${size.id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modo Compacto */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('appearancePage.compactMode')}</p>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.compactModeDesc')}
            </p>
          </div>
          <button
            onClick={() => setSelectedCompactMode(!selectedCompactMode)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              selectedCompactMode ? 'bg-blue-600' : 'bg-muted-foreground/20'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                selectedCompactMode ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('appearancePage.preview')}</h3>
        <div
          className={`p-4 rounded-lg border transition-colors ${
            selectedTheme === 'light'
              ? 'bg-white text-gray-900 border-gray-300'
              : 'bg-background text-white border-border'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: accentColors.find(c => c.id === selectedAccent)?.color }}
            />
            <div>
              <p className="font-semibold" style={{ fontSize: fontSizes.find(s => s.id === selectedFontSize)?.scale }}>
                {t('appearancePage.previewLead')}
              </p>
              <p className={`text-sm ${selectedTheme === 'light' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {t('appearancePage.previewEmail')}
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: accentColors.find(c => c.id === selectedAccent)?.color }}
          >
            {t('appearancePage.previewButton')}
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('appearancePage.saving')}
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {t('appearancePage.savePreferences')}
          </>
        )}
      </button>
    </div>
  )
}

