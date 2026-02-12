import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Paintbrush,
  Upload,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sun,
  Moon,
  Image,
  Type,
  Palette,
} from 'lucide-react'
import {
  useBranding,
  useUpdateBranding,
  useUploadLogo,
  useRemoveLogo,
  useResetBranding,
  DEFAULT_BRANDING,
  type Branding,
} from '@/hooks/useBranding'

const fontOptions = [
  'DM Sans',
  'Inter',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Montserrat',
  'Lato',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
]

export function BrandingSettingsPage() {
  const { t } = useTranslation()
  const { data: brandingData, isLoading } = useBranding()
  const updateBranding = useUpdateBranding()
  const uploadLogo = useUploadLogo()
  const removeLogo = useRemoveLogo()
  const resetBranding = useResetBranding()

  const [name, setName] = useState('')
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lightLogoRef = useRef<HTMLInputElement>(null)
  const darkLogoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (brandingData) {
      setName(brandingData.name)
      setBranding({ ...DEFAULT_BRANDING, ...brandingData.branding })
    }
  }, [brandingData])

  const handleSave = async () => {
    setError(null)
    try {
      await updateBranding.mutateAsync({ name, ...branding })
      setSuccess(t('brandingPage.saveSuccess'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('brandingPage.saveError'))
    }
  }

  const handleUpload = async (file: File, type: 'light' | 'dark' | 'favicon') => {
    try {
      await uploadLogo.mutateAsync({ file, type })
      setSuccess(t('brandingPage.logoUploadSuccess'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('brandingPage.logoUploadError'))
    }
  }

  const handleRemove = async (type: 'light' | 'dark' | 'favicon') => {
    try {
      await removeLogo.mutateAsync(type)
      setSuccess(t('brandingPage.logoRemoveSuccess'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('brandingPage.logoRemoveError'))
    }
  }

  const handleReset = async () => {
    if (window.confirm(t('brandingPage.resetConfirm'))) {
      try {
        await resetBranding.mutateAsync()
        setBranding(DEFAULT_BRANDING)
        setSuccess(t('brandingPage.resetSuccess'))
        setTimeout(() => setSuccess(null), 3000)
      } catch (err: any) {
        setError(err?.response?.data?.message || t('brandingPage.saveError'))
      }
    }
  }

  const ColorInput = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string
    value: string
    onChange: (val: string) => void
    description?: string
  }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer border-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-accent border border-border rounded-lg text-sm font-mono"
        />
      </div>
    </div>
  )

  const LogoUploader = ({
    titleKey,
    descKey,
    icon: Icon,
    currentUrl,
    inputRef,
    type,
  }: {
    titleKey: string
    descKey: string
    icon: React.ElementType
    currentUrl: string | null
    inputRef: React.RefObject<HTMLInputElement>
    type: 'light' | 'dark' | 'favicon'
  }) => (
    <div className="bg-accent/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">{t(titleKey)}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{t(descKey)}</p>

      {currentUrl ? (
        <div className="space-y-2">
          <div className={`p-4 rounded-lg flex items-center justify-center ${
            type === 'light' ? 'bg-white' : 'bg-background'
          }`}>
            <img src={currentUrl} alt={t(titleKey)} className="max-h-16 max-w-full object-contain" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 px-3 py-1.5 bg-muted-foreground/20 hover:bg-accent rounded text-sm transition-colors"
            >
              {t('brandingPage.change')}
            </button>
            <button
              onClick={() => handleRemove(type)}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-border transition-colors"
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('brandingPage.clickToUpload')}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file, type)
          e.target.value = ''
        }}
      />
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Paintbrush className="w-6 h-6 text-pink-500" />
            {t('brandingPage.title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('brandingPage.subtitle')}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-muted-foreground/20 rounded-lg transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          {t('brandingPage.reset')}
        </button>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">{success}</p>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Nome da Empresa */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-blue-400" />
          {t('brandingPage.companyName')}
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('brandingPage.companyNamePlaceholder')}
          className="w-full px-4 py-3 bg-accent border border-border rounded-lg text-lg focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Logos */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-400" />
          {t('brandingPage.logos')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LogoUploader
            titleKey="brandingPage.mainLogo"
            descKey="brandingPage.mainLogoDesc"
            icon={Sun}
            currentUrl={brandingData?.logo_url || null}
            inputRef={lightLogoRef as React.RefObject<HTMLInputElement>}
            type="light"
          />
          <LogoUploader
            titleKey="brandingPage.darkLogo"
            descKey="brandingPage.darkLogoDesc"
            icon={Moon}
            currentUrl={brandingData?.logo_dark_url || null}
            inputRef={darkLogoRef as React.RefObject<HTMLInputElement>}
            type="dark"
          />
          <LogoUploader
            titleKey="brandingPage.favicon"
            descKey="brandingPage.faviconDesc"
            icon={Image}
            currentUrl={brandingData?.favicon_url || null}
            inputRef={faviconRef as React.RefObject<HTMLInputElement>}
            type="favicon"
          />
        </div>
      </div>

      {/* Cores */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-400" />
          {t('brandingPage.systemColors')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ColorInput
            label={t('brandingPage.primaryColor')}
            description={t('brandingPage.primaryColorDesc')}
            value={branding.primary_color}
            onChange={(v) => setBranding({ ...branding, primary_color: v })}
          />
          <ColorInput
            label={t('brandingPage.secondaryColor')}
            description={t('brandingPage.secondaryColorDesc')}
            value={branding.secondary_color}
            onChange={(v) => setBranding({ ...branding, secondary_color: v })}
          />
          <ColorInput
            label={t('brandingPage.accentColorLabel')}
            description={t('brandingPage.accentColorDesc')}
            value={branding.accent_color}
            onChange={(v) => setBranding({ ...branding, accent_color: v })}
          />
          <ColorInput
            label={t('brandingPage.sidebarBg')}
            description={t('brandingPage.sidebarBgDesc')}
            value={branding.sidebar_color}
            onChange={(v) => setBranding({ ...branding, sidebar_color: v })}
          />
          <ColorInput
            label={t('brandingPage.sidebarText')}
            description={t('brandingPage.sidebarTextDesc')}
            value={branding.sidebar_text_color}
            onChange={(v) => setBranding({ ...branding, sidebar_text_color: v })}
          />
          <ColorInput
            label={t('brandingPage.headerBg')}
            description={t('brandingPage.headerBgDesc')}
            value={branding.header_color}
            onChange={(v) => setBranding({ ...branding, header_color: v })}
          />
        </div>
      </div>

      {/* Tipografia e Estilos */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Type className="w-5 h-5 text-green-400" />
          {t('brandingPage.typography')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t('brandingPage.mainFont')}</label>
            <select
              value={branding.font_family}
              onChange={(e) => setBranding({ ...branding, font_family: e.target.value })}
              className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-blue-500 focus:outline-none"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t('brandingPage.buttonRadius')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="24"
                value={branding.button_radius}
                onChange={(e) => setBranding({ ...branding, button_radius: e.target.value })}
                className="flex-1"
              />
              <span className="text-sm font-mono bg-accent px-3 py-1 rounded">
                {branding.button_radius}px
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('brandingPage.preview')}</h3>
        <div className="rounded-lg overflow-hidden border border-border">
          {/* Mock Sidebar */}
          <div className="flex">
            <div
              className="w-48 p-4"
              style={{ backgroundColor: branding.sidebar_color, color: branding.sidebar_text_color }}
            >
              {brandingData?.logo_dark_url ? (
                <img src={brandingData.logo_dark_url} alt="Logo" className="h-8 mb-4 object-contain" />
              ) : (
                <div className="text-lg font-bold mb-4" style={{ fontFamily: branding.font_family }}>
                  {name || t('brandingPage.companyNamePlaceholder')}
                </div>
              )}
              <nav className="space-y-2 text-sm">
                <div className="px-3 py-2 rounded" style={{ backgroundColor: branding.primary_color }}>
                  {t('brandingPage.previewDashboard')}
                </div>
                <div className="px-3 py-2 rounded opacity-70 hover:opacity-100">{t('brandingPage.previewLeads')}</div>
                <div className="px-3 py-2 rounded opacity-70 hover:opacity-100">{t('brandingPage.previewConversations')}</div>
              </nav>
            </div>
            {/* Mock Content */}
            <div className="flex-1 bg-background p-6">
              <h4 className="text-xl font-bold mb-4" style={{ fontFamily: branding.font_family }}>
                {t('brandingPage.previewDashboard')}
              </h4>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 text-white"
                  style={{
                    backgroundColor: branding.primary_color,
                    borderRadius: `${branding.button_radius}px`,
                  }}
                >
                  {t('brandingPage.previewPrimaryButton')}
                </button>
                <button
                  className="px-4 py-2 text-white"
                  style={{
                    backgroundColor: branding.secondary_color,
                    borderRadius: `${branding.button_radius}px`,
                  }}
                >
                  {t('brandingPage.previewSecondaryButton')}
                </button>
                <span
                  className="px-3 py-1 text-white text-sm flex items-center"
                  style={{
                    backgroundColor: branding.accent_color,
                    borderRadius: `${branding.button_radius}px`,
                  }}
                >
                  {t('brandingPage.previewBadge')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={updateBranding.isPending}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
      >
        {updateBranding.isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('brandingPage.saving')}
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            {t('brandingPage.saveSettings')}
          </>
        )}
      </button>
    </div>
  )
}
