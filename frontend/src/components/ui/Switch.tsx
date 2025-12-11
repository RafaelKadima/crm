import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  id,
  name,
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
  
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked
  
  const handleToggle = () => {
    if (disabled) return
    const newValue = !checked
    if (controlledChecked === undefined) {
      setInternalChecked(newValue)
    }
    onCheckedChange?.(newValue)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      name={name}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked 
          ? 'bg-primary shadow-[0_0_10px_rgba(255,255,255,0.2)]' 
          : 'bg-muted',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full shadow-lg',
          'transition-all duration-300 ease-out',
          checked 
            ? 'translate-x-5 bg-primary-foreground' 
            : 'translate-x-0 bg-muted-foreground/50'
        )}
      />
    </button>
  )
}

interface SwitchWithLabelProps extends SwitchProps {
  label: string
  description?: string
}

export function SwitchWithLabel({
  label,
  description,
  ...props
}: SwitchWithLabelProps) {
  const id = React.useId()
  
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label 
          htmlFor={id}
          className="text-sm font-medium cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch {...props} id={id} />
    </div>
  )
}

