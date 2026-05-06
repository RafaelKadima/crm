import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Tag as TagIcon, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

interface Tag {
  id: string
  tenant_id: string
  name: string
  slug: string
  color: string
  created_at: string
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#6b7280',
]

export function TagsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Tag | null>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery<{ data: Tag[] }>({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/tags')).data,
  })

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Excluir tag "${tag.name}"?`)) return
    try {
      await api.delete(`/tags/${tag.id}`)
      toast.success('Tag excluída.')
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TagIcon className="h-5 w-5 text-muted-foreground" />
            Tags
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Categorize tickets e leads com tags coloridas. Usadas pra
            filtros, relatórios e segmentação.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova tag
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tags do tenant</CardTitle>
          <CardDescription>
            Tags são compartilhadas com toda a equipe e podem ser anexadas a
            tickets e leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
          ) : !data?.data?.length ? (
            <div className="rounded-lg border-2 border-dashed bg-muted/30 px-6 py-12 text-center">
              <TagIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-3">
                Nenhuma tag criada.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.data.map((tag) => (
                <div
                  key={tag.id}
                  className="group inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
                  style={{ borderColor: tag.color + '60' }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                  <div className="hidden group-hover:flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => setEditing(tag)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Editar"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(editing || creating) && (
        <TagEditorDialog
          tag={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['tags'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function TagEditorDialog({
  tag,
  onClose,
  onSaved,
}: {
  tag: Tag | null
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !tag
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? PRESET_COLORS[12])
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        await api.post('/tags', { name: name.trim(), color })
        toast.success('Tag criada.')
      } else {
        await api.put(`/tags/${tag.id}`, { name: name.trim(), color })
        toast.success('Tag atualizada.')
      }
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nova tag' : `Editar: ${tag.name}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Nome *</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: VIP, Urgente, Reclamação"
              maxLength={64}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    color === c ? 'scale-110 border-foreground' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-12 rounded border bg-transparent cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 font-mono text-xs"
                placeholder="#6b7280"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div
              className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
              style={{ borderColor: color + '60' }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span className="font-medium">{name || 'Nome da tag'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isNew ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
