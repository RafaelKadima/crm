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
          className="absolute inset-0 rounded-full"
          style={{ 
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
          animate={animated ? { rotate: 360 } : undefined}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle Ring */}
        <motion.div
          className="absolute rounded-full"
          style={{ 
            width: '72%', 
            height: '72%', 
            top: '14%', 
            left: '14%',
            border: '2px solid rgba(255, 255, 255, 0.12)',
          }}
          animate={animated ? { rotate: -360 } : undefined}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner Ring */}
        <motion.div
          className="absolute rounded-full"
          style={{ 
            width: '44%', 
            height: '44%', 
            top: '28%', 
            left: '28%',
            border: '2px solid rgba(255, 255, 255, 0.08)',
          }}
          animate={animated ? { rotate: 360 } : undefined}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Core */}
        <motion.div
          className="absolute rounded-full"
          style={{ 
            width: '22%', 
            height: '22%', 
            top: '39%', 
            left: '39%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%)',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
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
            className="absolute w-1.5 h-1.5 rounded-full bg-white/60"
            style={{ top: '0', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }}
          />
          <div 
            className="absolute w-1 h-1 rounded-full bg-white/40"
            style={{ bottom: '0', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 4px rgba(255,255,255,0.3)' }}
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
          <span className="text-white">OMNI</span>
          <span className="text-white/50">FY</span>
          <span className="text-white/30 font-normal text-[0.6em] ml-2 tracking-[0.2em]">
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
      className={className}
      width={sizes[size]} 
      height={sizes[size]} 
      viewBox="0 0 64 64"
    >
      <defs>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </linearGradient>
        <filter id="glowWhite">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer Ring */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
      
      {/* Middle Ring */}
      <circle cx="32" cy="32" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
      
      {/* Inner Ring */}
      <circle cx="32" cy="32" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
      
      {/* Core */}
      <circle cx="32" cy="32" r="6" fill="url(#coreGradient)" filter="url(#glowWhite)"/>
      
      {/* Orbital Dots */}
      <circle cx="32" cy="4" r="3" fill="rgba(255,255,255,0.5)"/>
      <circle cx="32" cy="60" r="2" fill="rgba(255,255,255,0.3)"/>
    </svg>
  )
}

export default OmnifyLogo
