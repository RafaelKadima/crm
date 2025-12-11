import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs')
  }
  return context
}

interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ 
  value: controlledValue, 
  defaultValue = '', 
  onValueChange, 
  children,
  className 
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div 
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1',
        'bg-muted/50 border border-white/5',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ value, children, className, disabled = false }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2',
        'text-sm font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected 
          ? 'bg-background text-foreground shadow-sm border border-white/10' 
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext()
  
  if (selectedValue !== value) return null

  return (
    <div 
      role="tabpanel"
      className={cn(
        'mt-4 focus-visible:outline-none',
        'animate-in fade-in-0 duration-200',
        className
      )}
    >
      {children}
    </div>
  )
}

