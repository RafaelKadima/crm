import { toast } from 'sonner'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Bell,
  MessageSquare,
  UserPlus,
  Calendar,
  Zap,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'message' | 'lead' | 'appointment' | 'ai' | 'metric'

interface NotificationOptions {
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Icon mapping
const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  message: MessageSquare,
  lead: UserPlus,
  appointment: Calendar,
  ai: Zap,
  metric: TrendingUp,
}

// Color mapping
const colors = {
  success: { bg: 'rgba(16, 185, 129, 0.1)', border: '#10B981', text: '#10B981', glow: 'rgba(16, 185, 129, 0.3)' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', text: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', text: '#F59E0B', glow: 'rgba(245, 158, 11, 0.3)' },
  info: { bg: 'rgba(0, 212, 255, 0.1)', border: '#00D4FF', text: '#00D4FF', glow: 'rgba(0, 212, 255, 0.3)' },
  message: { bg: 'rgba(139, 92, 246, 0.1)', border: '#8B5CF6', text: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.3)' },
  lead: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22C55E', text: '#22C55E', glow: 'rgba(34, 197, 94, 0.3)' },
  appointment: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3B82F6', text: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)' },
  ai: { bg: 'rgba(255, 255, 255, 0.1)', border: '#FFFFFF', text: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.3)' },
  metric: { bg: 'rgba(236, 72, 153, 0.1)', border: '#EC4899', text: '#EC4899', glow: 'rgba(236, 72, 153, 0.3)' },
}

// Custom notification content component
function NotificationContent({ 
  type, 
  title, 
  description, 
  action 
}: { 
  type: NotificationType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  const Icon = icons[type]
  const color = colors[type]

  return (
    <div className="flex items-start gap-3 py-1">
      {/* Animated Icon */}
      <div 
        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center relative"
        style={{ 
          background: color.bg,
          boxShadow: `0 0 20px ${color.glow}`,
        }}
      >
        <Icon 
          className="w-5 h-5 animate-pulse" 
          style={{ color: color.text }}
        />
        {/* Ping effect */}
        <span 
          className="absolute inset-0 rounded-lg animate-ping opacity-30"
          style={{ background: color.bg }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p 
          className="font-display font-semibold text-sm tracking-wide"
          style={{ color: color.text }}
        >
          {title}
        </p>
        {description && (
          <p className="text-sm text-white/70 mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "mt-2 px-3 py-1 text-xs font-medium rounded-md transition-all",
              "hover:scale-105 active:scale-95"
            )}
            style={{ 
              background: color.bg,
              color: color.text,
              border: `1px solid ${color.border}40`,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

// Main notification function
export function notify(type: NotificationType, options: NotificationOptions) {
  const { title, description, duration = 4000, action } = options

  return toast.custom(
    (t) => (
      <div
        className={cn(
          "w-[380px] p-4 rounded-xl relative overflow-hidden",
          "bg-gradient-to-br from-[#12151C] to-[#0A0C10]",
          "border border-white/10",
          "shadow-2xl"
        )}
        style={{
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 30px ${colors[type].glow}`,
        }}
      >
        {/* Top border glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${colors[type].border}, transparent)`,
          }}
        />
        
        {/* Content */}
        <NotificationContent 
          type={type}
          title={title}
          description={description}
          action={action}
        />

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div 
            className="h-full origin-left"
            style={{ 
              background: `linear-gradient(90deg, ${colors[type].border}, ${colors[type].border}80)`,
              animation: `progress ${duration}ms linear forwards`,
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={() => toast.dismiss(t)}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 
                     text-white/40 hover:text-white/80 transition-all"
        >
          <XCircle className="w-4 h-4" />
        </button>

        <style>{`
          @keyframes progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}</style>
      </div>
    ),
    {
      duration,
      position: 'top-right',
    }
  )
}

// Convenience functions
export const notifySuccess = (title: string, description?: string) => 
  notify('success', { title, description })

export const notifyError = (title: string, description?: string) => 
  notify('error', { title, description })

export const notifyWarning = (title: string, description?: string) => 
  notify('warning', { title, description })

export const notifyInfo = (title: string, description?: string) => 
  notify('info', { title, description })

export const notifyNewMessage = (from: string, preview: string, onClick?: () => void) => 
  notify('message', { 
    title: `Nova mensagem de ${from}`,
    description: preview,
    action: onClick ? { label: 'Ver mensagem', onClick } : undefined,
  })

export const notifyNewLead = (name: string, source: string, onClick?: () => void) => 
  notify('lead', { 
    title: 'Novo Lead Capturado!',
    description: `${name} via ${source}`,
    action: onClick ? { label: 'Ver lead', onClick } : undefined,
  })

export const notifyAppointment = (title: string, time: string, onClick?: () => void) => 
  notify('appointment', { 
    title: 'Agendamento Próximo',
    description: `${title} às ${time}`,
    action: onClick ? { label: 'Ver detalhes', onClick } : undefined,
  })

export const notifyAI = (title: string, description?: string) => 
  notify('ai', { 
    title,
    description,
    duration: 5000,
  })

export const notifyMetric = (metric: string, value: string, change?: string) => 
  notify('metric', { 
    title: metric,
    description: `${value}${change ? ` (${change})` : ''}`,
  })

export default notify

