import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useLogin } from '@/hooks/useAuth'
import { LanguageSelector } from '@/components/LanguageSelector'
import { cn } from '@/lib/utils'

const createLoginSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t('validation.email')),
  password: z.string().min(6, t('validation.minLength').replace('{{min}}', '6')),
})

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>

export function LoginPage() {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()
  const loginSchema = createLoginSchema(t)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  const errorMessage = loginMutation.error?.response?.data?.message ||
    loginMutation.error?.response?.data?.errors?.email?.[0] ||
    (loginMutation.error ? t('auth.loginError') : '')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Subtle warm depth */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] bg-foreground/[0.02]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px] relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Omni</span>
            <span className="text-muted-foreground">Fy</span>
            <span className="text-muted-foreground font-normal text-sm ml-1.5">HUB</span>
          </h1>
        </motion.div>

        {/* Title — serif, editorial */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="font-display text-3xl text-foreground">
            {t('auth.loginSubtitle') || 'Bem-vindo de volta'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com suas credenciais para continuar
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg text-sm text-center bg-destructive/10 text-destructive border border-destructive/15"
            >
              {errorMessage}
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('auth.email')}</label>
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('email')}
              className={cn(
                "h-10 bg-card border-border",
                errors.email && 'border-destructive'
              )}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('auth.password')}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={cn(
                  "h-10 bg-card border-border pr-10",
                  errors.password && 'border-destructive'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 mt-2"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Spinner size="sm" className="text-primary-foreground" />
            ) : (
              <>
                {t('auth.login')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {/* Language */}
          <div className="flex items-center justify-center pt-2">
            <LanguageSelector variant="inline" />
          </div>
        </motion.form>

        {/* Footer */}
        <motion.div
          className="text-center mt-8 pt-6 border-t border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/60 font-medium">{t('auth.valuePropTitle')}</span>
            {' · '}
            <span>{t('auth.valuePropSubtitle')}</span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('auth.privacyPolicy')}
            </Link>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-xs text-muted-foreground/50">v1.0</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
