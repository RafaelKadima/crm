import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useLogin } from '@/hooks/useAuth'
import { OmnifyLogo } from '@/components/OmnifyLogo'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()

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
    (loginMutation.error ? 'Erro ao fazer login' : '')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Futuristic Background - Monochrome */}
      <div className="absolute inset-0 bg-background">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        
        {/* Gradient Orbs - Subtle White/Gray */}
        <motion.div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)' }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%)' }}
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        />

        {/* Animated Scan Lines */}
        <motion.div 
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className={cn(
          "border-0 shadow-2xl overflow-hidden",
          "bg-card/60 backdrop-blur-xl",
          "futuristic-card"
        )}>
          {/* Top Gradient Border */}
          <div 
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), rgba(255,255,255,0.1), transparent)',
            }}
          />

          <CardHeader className="text-center pb-2 pt-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6"
            >
              <OmnifyLogo size="lg" showText={false} animated={true} />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-2xl font-display tracking-[0.15em]">
                <span className="text-white">OMNI</span>
                <span className="text-white/50">FY</span>
                <span className="text-white/30 font-normal text-lg ml-2 tracking-[0.2em]">HUB</span>
              </CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn(
                    "p-3 rounded-lg text-sm text-center",
                    "bg-destructive/10 text-destructive border border-destructive/20"
                  )}
                >
                  {errorMessage}
                </motion.div>
              )}

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="text-sm font-medium text-foreground/80">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  className={cn(
                    "bg-background/50 border-white/10",
                    "focus:border-white/30 focus:ring-white/10",
                    "placeholder:text-muted-foreground/50",
                    errors.email && 'border-destructive focus:border-destructive'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="text-sm font-medium text-foreground/80">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      "bg-background/50 border-white/10 pr-10",
                      "focus:border-white/30 focus:ring-white/10",
                      "placeholder:text-muted-foreground/50",
                      errors.password && 'border-destructive focus:border-destructive'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  type="submit" 
                  className={cn(
                    "w-full mt-2 relative overflow-hidden",
                    "bg-white text-background",
                    "hover:bg-white/90",
                    "font-semibold",
                    "shadow-lg shadow-white/10",
                    "transition-all duration-300"
                  )}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Spinner size="sm" className="text-background" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      Acessar Sistema
                    </>
                  )}
                  
                  {/* Button Shine Effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  />
                </Button>
              </motion.div>
            </form>

            {/* Value Proposition */}
            <motion.div 
              className="mt-6 pt-5 border-t border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                <span className="text-white/60 font-medium">Visão 360° do seu negócio.</span>
                <br />
                <span className="text-white/40">CRM inteligente • SDR Autônomo • Ads automatizados</span>
              </p>
            </motion.div>
          </CardContent>

          {/* Bottom Gradient Border */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), rgba(255,255,255,0.2), transparent)',
            }}
          />
        </Card>

        {/* Version Tag */}
        <motion.p 
          className="text-center mt-6 text-xs text-muted-foreground font-mono tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-white/80">OmniFy</span>
          <span className="text-white/40">HUB</span>
          <span className="ml-2 opacity-40">v1.0.0</span>
        </motion.p>
      </motion.div>
    </div>
  )
}
