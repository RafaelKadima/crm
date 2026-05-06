import { useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { FloatingSaveButton } from '@/components/ui/FloatingSaveButton'
import { HelpDrawer, type HelpContent } from '@/components/ui/HelpDrawer'
import { Can } from '@/components/auth/Can'
import type { PermissionKey } from '@/hooks/useHasPermission'
import { cn } from '@/lib/utils'

// ─── Field types ──────────────────────────────────────────────────────

export type ConfigFieldType =
  | 'text'
  | 'password'
  | 'number'
  | 'boolean'
  | 'textarea'
  | 'url'
  | 'email'
  | 'select'
  | 'datalist'
  | 'color'

export interface ConfigFieldOption {
  value: string
  label: string
}

export interface ConfigField {
  key: string
  label: string
  type: ConfigFieldType
  placeholder?: string
  description?: string
  required?: boolean
  options?: ConfigFieldOption[]
  /** Para datalist/select dependentes — pega lista de outro field */
  optionsFromField?: string
  optionsMap?: Record<string, ReadonlyArray<ConfigFieldOption>>
  /** Esconde o field se user não tem essa permission */
  permission?: PermissionKey
  /** Custom render (escape hatch) — ignora `type` */
  render?: (props: FieldRenderProps) => ReactNode
  /** Validação simples — retorna mensagem de erro ou null */
  validate?: (value: unknown, all: Record<string, unknown>) => string | null
  /** Disable condicional (ex: campo só faz sentido com outro = true) */
  disabledWhen?: (all: Record<string, unknown>) => boolean
  rows?: number // textarea
}

export interface FieldRenderProps {
  value: unknown
  onChange: (next: unknown) => void
  field: ConfigField
  values: Record<string, unknown>
  disabled?: boolean
}

export interface ConfigSection {
  title: string
  description?: string
  icon?: LucideIcon
  fields: ConfigField[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

interface ConfigPageProps<T extends Record<string, any>> {
  title: string
  description?: string
  icon?: LucideIcon
  sections: ConfigSection[]
  values: T
  onChange: (patch: Partial<T> | ((prev: T) => T)) => void
  onSave: () => void | Promise<void>
  onReset?: () => void
  isDirty: boolean
  isSaving: boolean
  isLoading?: boolean
  changesCount?: number
  help?: HelpContent
  headerActions?: ReactNode
  footer?: ReactNode
}

// ─── ConfigPage ───────────────────────────────────────────────────────

export function ConfigPage<T extends Record<string, any>>({
  title,
  description,
  icon: Icon,
  sections,
  values,
  onChange,
  onSave,
  onReset,
  isDirty,
  isSaving,
  isLoading,
  changesCount,
  help,
  headerActions,
  footer,
}: ConfigPageProps<T>) {
  const [helpOpen, setHelpOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {help && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(true)}
              title="Ajuda"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section, i) => (
          <ConfigSectionView
            key={`${section.title}-${i}`}
            section={section}
            values={values}
            onChange={onChange}
          />
        ))}
      </div>

      {footer}

      {/* Save bar — inline ou floating dependendo do scroll */}
      <FloatingSaveButton
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={onSave}
        onReset={onReset}
        changesCount={changesCount}
      />

      {help && (
        <HelpDrawer
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={title}
          help={help}
        />
      )}
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────

interface ConfigSectionViewProps<T extends Record<string, any>> {
  section: ConfigSection
  values: T
  onChange: (patch: Partial<T> | ((prev: T) => T)) => void
}

function ConfigSectionView<T extends Record<string, any>>({
  section,
  values,
  onChange,
}: ConfigSectionViewProps<T>) {
  const [collapsed, setCollapsed] = useState(section.defaultCollapsed ?? false)
  const Icon = section.icon

  return (
    <section className="rounded-xl border bg-card">
      <header
        className={cn(
          'flex items-start justify-between gap-3 px-6 py-4',
          section.collapsible && 'cursor-pointer select-none',
        )}
        onClick={() => section.collapsible && setCollapsed((c) => !c)}
      >
        <div className="flex items-start gap-3">
          {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />}
          <div>
            <h3 className="font-medium">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {section.description}
              </p>
            )}
          </div>
        </div>
        {section.collapsible && (
          <Button variant="ghost" size="icon">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        )}
      </header>

      {!collapsed && (
        <div className="space-y-4 border-t px-6 py-5">
          {section.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              values={values}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── FieldRow + renderer por type ─────────────────────────────────────

function FieldRow<T extends Record<string, any>>({
  field,
  values,
  onChange,
}: {
  field: ConfigField
  values: T
  onChange: (patch: Partial<T> | ((prev: T) => T)) => void
}) {
  const value = values[field.key]
  const disabled = field.disabledWhen ? field.disabledWhen(values) : false
  const errorMsg = field.validate ? field.validate(value, values) : null

  const set = (next: unknown) => {
    onChange({ [field.key]: next } as Partial<T>)
  }

  // Custom renderer escape hatch
  if (field.render) {
    const node = field.render({ value, onChange: set, field, values, disabled })
    return wrapPermission(field.permission, node)
  }

  // Boolean renderiza diferente (label do lado)
  if (field.type === 'boolean') {
    return wrapPermission(
      field.permission,
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 flex-1">
          <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Switch
          checked={!!value}
          disabled={disabled}
          onCheckedChange={(v) => set(v)}
        />
      </div>,
    )
  }

  return wrapPermission(
    field.permission,
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      <FieldInput
        field={field}
        value={value}
        values={values}
        onChange={set}
        disabled={disabled}
      />

      {errorMsg ? (
        <p className="text-xs text-destructive">{errorMsg}</p>
      ) : field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null}
    </div>,
  )
}

function wrapPermission(permission: PermissionKey | undefined, node: ReactNode) {
  if (!permission) return <>{node}</>
  return <Can permission={permission}>{node}</Can>
}

function FieldInput({
  field,
  value,
  values,
  onChange,
  disabled,
}: {
  field: ConfigField
  value: unknown
  values: Record<string, unknown>
  onChange: (v: unknown) => void
  disabled?: boolean
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={field.key}
          rows={field.rows ?? 3}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'select': {
      const options = resolveOptions(field, values)
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? 'Selecione...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    case 'datalist': {
      const options = resolveOptions(field, values)
      const listId = `dl-${field.key}`
      return (
        <>
          <Input
            id={field.key}
            list={listId}
            value={(value as string) ?? ''}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id={listId}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        </>
      )
    }

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.key}
            type="color"
            value={(value as string) || '#6b7280'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-16 rounded border bg-transparent cursor-pointer disabled:cursor-not-allowed"
          />
          <Input
            value={(value as string) ?? ''}
            placeholder="#6b7280"
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          />
        </div>
      )

    case 'number':
      return (
        <Input
          id={field.key}
          type="number"
          value={(value as number) ?? ''}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )

    default:
      return (
        <Input
          id={field.key}
          type={field.type}
          value={(value as string) ?? ''}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function resolveOptions(field: ConfigField, values: Record<string, unknown>): readonly ConfigFieldOption[] {
  if (field.optionsFromField && field.optionsMap) {
    const dep = values[field.optionsFromField]
    return field.optionsMap[dep as string] ?? []
  }
  return field.options ?? []
}
