interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className={children ? 'space-y-4 pb-4 border-b border-white/5 mb-6' : 'mb-6'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[0.02em]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground/70 mt-1 font-light tracking-wide">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
