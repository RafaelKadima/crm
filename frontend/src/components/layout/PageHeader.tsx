interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, eyebrow, actions, children }: PageHeaderProps) {
  const hasChildren = Boolean(children)
  return (
    <div className={hasChildren ? 'space-y-5 pb-5 mb-6 border-b' : 'mb-6'} style={hasChildren ? { borderColor: 'var(--color-border)' } : undefined}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="eyebrow mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.02em] md:text-[40px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[13.5px] leading-[1.5] text-muted-foreground max-w-[560px]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
