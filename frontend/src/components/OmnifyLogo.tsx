import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OmnifyLogoProps {
  collapsed?: boolean
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function OmnifyLogo({
  collapsed = false,
  className,
  showText = true,
  size = 'md',
  animated = true
}: OmnifyLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-sm' },
    md: { icon: 40, text: 'text-lg' },
    lg: { icon: 56, text: 'text-2xl' },
  }

  const { icon: iconSize, text: textSize } = sizes[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Animated Logo Icon */}
      <div
        className="relative shrink-0"
        style={{ width: iconSize, height: iconSize }}
      >
        {/* Outer Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-current opacity-20"
          animate={animated ? { rotate: 360 } : undefined}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        {/* Middle Ring */}
        <motion.div
          className="absolute rounded-full border-2 border-current opacity-[0.12]"
          style={{
            width: '72%',
            height: '72%',
            top: '14%',
            left: '14%',
          }}
          animate={animated ? { rotate: -360 } : undefined}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner Ring */}
        <motion.div
          className="absolute rounded-full border-2 border-current opacity-[0.08]"
          style={{
            width: '44%',
            height: '44%',
            top: '28%',
            left: '28%',
          }}
          animate={animated ? { rotate: 360 } : undefined}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Core */}
        <motion.div
          className="absolute rounded-full bg-current opacity-70"
          style={{
            width: '22%',
            height: '22%',
            top: '39%',
            left: '39%',
            boxShadow: '0 0 15px currentColor',
          }}
          animate={animated ? {
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          } : undefined}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Orbital Dots */}
        <motion.div
          className="absolute inset-0"
          animate={animated ? { rotate: 360 } : undefined}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-current opacity-60"
            style={{ top: '0', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 6px currentColor' }}
          />
          <div
            className="absolute w-1 h-1 rounded-full bg-current opacity-40"
            style={{ bottom: '0', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 4px currentColor' }}
          />
        </motion.div>
      </div>

      {/* Logo Text */}
      {showText && !collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className={cn('font-display font-bold tracking-[0.15em]', textSize)}
        >
          <span className="text-foreground">OMNI</span>
          <span className="text-foreground/50">FY</span>
          <span className="text-foreground/30 font-normal text-[0.6em] ml-2 tracking-[0.2em]">
            HUB
          </span>
        </motion.div>
      )}
    </div>
  )
}

// Static version for places where animation is not desired
export function OmnifyLogoStatic({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 24,
    md: 32,
    lg: 48,
  }

  return (
    <svg
      className={cn('text-foreground', className)}
      width={sizes[size]}
      height={sizes[size]}
      viewBox="0 0 64 64"
    >
      <defs>
        <filter id="glowWhite">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Outer Ring */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2"/>

      {/* Middle Ring */}
      <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.12"/>

      {/* Inner Ring */}
      <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.08"/>

      {/* Core */}
      <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.7" filter="url(#glowWhite)"/>

      {/* Orbital Dots */}
      <circle cx="32" cy="4" r="3" fill="currentColor" opacity="0.5"/>
      <circle cx="32" cy="60" r="2" fill="currentColor" opacity="0.3"/>
    </svg>
  )
}

export default OmnifyLogo
