import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

export function Select({ 
  value: controlledValue, 
  defaultValue = '', 
  onValueChange, 
  children,
  disabled = false
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const handleValueChange = (newValue: string) => {
    if (disabled) return
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  placeholder?: string
}

export function SelectTrigger({ children, className, placeholder }: SelectTriggerProps) {
  const { value, open, setOpen } = useSelectContext()
  
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg',
        'border border-white/10 bg-muted px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-all duration-200',
        className
      )}
    >
      <span className={cn(!value && 'text-muted-foreground')}>
        {children}
      </span>
      <ChevronDown className={cn(
        'h-4 w-4 opacity-50 transition-transform duration-200',
        open && 'rotate-180'
      )} />
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext()
  
  if (!value) {
    return <span className="text-muted-foreground">{placeholder}</span>
  }
  
  return <span>{value}</span>
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen } = useSelectContext()
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 w-full rounded-lg',
        'bg-card border border-white/10',
        'shadow-xl shadow-black/20',
        'py-1 overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
    >
      {children}
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function SelectItem({ value, children, className, disabled = false }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelectContext()
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={cn(
        'relative flex w-full cursor-pointer items-center px-3 py-2 text-sm',
        'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
        'transition-colors duration-150',
        isSelected && 'bg-white/10',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span className="flex-1 text-left">{children}</span>
      {isSelected && (
        <Check className="h-4 w-4 text-primary ml-2" />
      )}
    </button>
  )
}

interface SelectGroupProps {
  children: React.ReactNode
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <div className="py-1">{children}</div>
}

interface SelectLabelProps {
  children: React.ReactNode
  className?: string
}

export function SelectLabel({ children, className }: SelectLabelProps) {
  return (
    <div className={cn(
      'px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider',
      className
    )}>
      {children}
    </div>
  )
}

interface SelectSeparatorProps {
  className?: string
}

export function SelectSeparator({ className }: SelectSeparatorProps) {
  return <div className={cn('my-1 h-px bg-white/10', className)} />
}

