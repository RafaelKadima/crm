import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const languages = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'PT' },
  { code: 'en-US', flag: '🇺🇸', label: 'EN' },
]

interface LanguageSelectorProps {
  variant?: 'flags' | 'inline'
  showLabel?: boolean
  className?: string
}

export function LanguageSelector({
  variant = 'flags',
  showLabel = false,
  className = ''
}: LanguageSelectorProps) {
  const { i18n } = useTranslation()

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {languages.map((lang) => {
        const isActive = i18n.language === lang.code
        return (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-lg',
              'transition-all duration-200 border',
              isActive
                ? 'bg-foreground/10 border-foreground/20 scale-110'
                : 'border-transparent opacity-50 hover:opacity-100 hover:bg-foreground/5'
            )}
            title={lang.code === 'pt-BR' ? 'Português (Brasil)' : 'English (US)'}
          >
            <span className="text-xl">{lang.flag}</span>
            {showLabel && (
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {lang.label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
