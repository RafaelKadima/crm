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
    <div className="min-h-screen w-full grid grid-cols-1 lg:[grid-template-columns:1.1fr_1fr]">
      {/* ════════════════ HERO SIDE (charcoal) ════════════════ */}
      <aside
        className="relative isolate hidden lg:flex flex-col justify-between px-12 xl:px-16 py-10 overflow-hidden bold-grid bold-glow"
        style={{ background: '#0A0A0C', color: '#F4F3EF' }}
      >
        {/* Logo + language */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between z-10"
        >
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] font-display text-[22px] leading-none"
              style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
            >
              O
            </div>
            <span className="font-display text-[22px] leading-none">
              OmniFy<span style={{ color: 'var(--color-bold-ink)' }}>.</span>
            </span>
          </div>
          <div className="text-[rgba(244,243,239,0.55)]">
            <LanguageSelector variant="inline" />
          </div>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="z-10 max-w-[580px]"
        >
          <p className="eyebrow" style={{ color: 'rgba(244,243,239,0.55)' }}>
            CRM COM IA AUTÔNOMA
          </p>
          <h1
            className="mt-4 font-display text-[44px] leading-[1.02] tracking-[-0.02em] sm:text-[56px] lg:text-[64px]"
            style={{ color: '#F4F3EF' }}
          >
            O comercial{' '}
            <span className="neon-mark">roda sozinho</span>.
            <br />
            Você decide.
          </h1>
          <p
            className="mt-5 max-w-[460px] text-[15px] leading-[1.55]"
            style={{ color: 'rgba(244,243,239,0.58)' }}
          >
            SDR autônomo qualifica leads, marca reuniões e entrega propostas enquanto seu time
            fecha. Ads otimizados por agente. Pipeline que anda sem alguém empurrar.
          </p>
        </motion.div>

        {/* Stats footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="z-10 grid grid-cols-3 gap-8 border-t pt-6"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {[
            { n: 'R$ 847K', l: 'MRR médio adicionado' },
            { n: '2,3×', l: 'aumento em demos marcadas' },
            { n: '14h', l: 'economizadas por SDR/semana' },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-display text-[30px] leading-none" style={{ color: '#F4F3EF' }}>
                {s.n}
              </div>
              <div className="mt-2 text-[11.5px] leading-tight" style={{ color: 'rgba(244,243,239,0.5)' }}>
                {s.l}
              </div>
            </div>
          ))}
        </motion.div>
      </aside>

      {/* ════════════════ FORM SIDE (warm bege) ════════════════ */}
      <main
        className="relative flex items-center justify-center px-6 py-12 sm:px-12"
        style={{ background: 'var(--color-warm)', color: 'var(--color-warm-ink)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo (lg breakpoint hides the aside) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-[10px] font-display text-[20px]"
              style={{ background: '#0A0A0C', color: 'var(--color-bold-ink)' }}
            >
              O
            </div>
            <span className="font-display text-[22px] leading-none" style={{ color: 'var(--color-warm-ink)' }}>
              OmniFy<span style={{ color: '#0A0A0C' }}>.</span>
            </span>
          </div>

          <p className="eyebrow" style={{ color: 'var(--color-warm-muted)' }}>
            BEM-VINDA DE VOLTA
          </p>
          <h2
            className="mt-3 font-display text-[40px] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--color-warm-ink)' }}
          >
            Entre na sua <span className="display-italic">conta</span>
          </h2>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--color-warm-muted)' }}>
            {t('auth.loginSubtitle', { defaultValue: 'Continue de onde parou' })}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-[10px] border px-3 py-2.5 text-[13px]"
                style={{
                  background: 'rgba(220, 38, 38, 0.06)',
                  borderColor: 'rgba(220, 38, 38, 0.25)',
                  color: '#B91C1C',
                }}
              >
                {errorMessage}
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label
                className="block text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'var(--color-warm-muted)' }}
              >
                {t('auth.email')}
              </label>
              <Input
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                {...register('email')}
                className={cn(
                  'h-11 rounded-[10px] border px-3.5 text-[14px]',
                  errors.email && 'border-destructive'
                )}
                style={{
                  background: '#FFFFFF',
                  borderColor: 'var(--color-warm-border)',
                  color: 'var(--color-warm-ink)',
                }}
              />
              {errors.email && (
                <p className="text-[11.5px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <label
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--color-warm-muted)' }}
                >
                  {t('auth.password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11.5px] font-medium hover:underline"
                  style={{ color: 'var(--color-warm-ink)' }}
                >
                  {t('auth.forgotPassword', { defaultValue: 'Esqueci a senha' })}
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    'h-11 rounded-[10px] border px-3.5 pr-20 text-[14px]',
                    errors.password && 'border-destructive'
                  )}
                  style={{
                    background: '#FFFFFF',
                    borderColor: 'var(--color-warm-border)',
                    color: 'var(--color-warm-ink)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11.5px] font-medium transition-colors hover:underline"
                  style={{ color: 'var(--color-warm-muted)' }}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Mostrar
                    </>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11.5px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="group mt-2 h-12 w-full rounded-[10px] text-[14px] font-semibold"
              style={{
                background: '#0A0A0C',
                color: 'var(--color-bold-ink)',
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <Spinner size="sm" className="text-[var(--color-bold-ink)]" />
                  <span className="ml-2">Entrando…</span>
                </>
              ) : (
                <>
                  {t('auth.login')}
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'var(--color-bold-ink)' }}
                  />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div
            className="mt-10 flex flex-col gap-2 border-t pt-5 text-[11.5px]"
            style={{
              borderColor: 'var(--color-warm-border)',
              color: 'var(--color-warm-muted)',
            }}
          >
            <p>
              <span>{t('auth.valuePropTitle', { defaultValue: 'Ainda não tem conta?' })}</span>{' '}
              <Link
                to="/signup"
                className="font-semibold hover:underline"
                style={{ color: 'var(--color-warm-ink)' }}
              >
                {t('auth.valuePropSubtitle', { defaultValue: 'Começar teste grátis' })}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>© {new Date().getFullYear()} OmniFy</span>
              <span style={{ color: 'rgba(107, 102, 96, 0.4)' }}>·</span>
              <Link to="/privacy" className="hover:underline">
                {t('auth.privacyPolicy', { defaultValue: 'Privacidade' })}
              </Link>
              <span style={{ color: 'rgba(107, 102, 96, 0.4)' }}>·</span>
              <Link to="/terms" className="hover:underline">
                {t('auth.terms', { defaultValue: 'Termos' })}
              </Link>
              <span style={{ color: 'rgba(107, 102, 96, 0.4)' }}>·</span>
              <a href="mailto:suporte@omnify.center" className="hover:underline">
                {t('auth.support', { defaultValue: 'Suporte' })}
              </a>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
