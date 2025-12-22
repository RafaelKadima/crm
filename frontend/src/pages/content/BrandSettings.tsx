import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Palette,
  Users,
  Package,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import { brandLayersApi } from '@/api/brandLayers'
import { toast } from 'sonner'

// Types defined locally to avoid Vite HMR issues
interface BrandEditorialProfile {
  id: string
  name: string
  brand_voice: {
    personality_traits?: string[]
    tone_descriptors?: string[]
    vocabulary_style?: string
  }
  brand_identity: {
    mission?: string
    values?: string[]
    unique_proposition?: string
  }
  beliefs_and_enemies: {
    core_beliefs?: string[]
    industry_enemies?: string[]
    contrarian_views?: string[]
  }
  content_pillars: Array<{
    name: string
    description: string
    example_topics?: string[]
  }>
  created_at: string
  updated_at: string
}

interface AudienceProfile {
  id: string
  name: string
  demographics: {
    age_range?: string
    gender?: string
    location?: string
    income_level?: string
    education?: string
  }
  psychographics: {
    pains?: string[]
    desires?: string[]
    fears?: string[]
    dreams?: string[]
  }
  objections: {
    common_objections?: string[]
    trust_barriers?: string[]
  }
  language_patterns: {
    slang_terms?: string[]
    phrases_they_use?: string[]
    tone_preference?: string
  }
  created_at: string
  updated_at: string
}

interface ProductPositioning {
  id: string
  name: string
  transformation: {
    before_state?: string
    after_state?: string
    journey_description?: string
  }
  mechanism: {
    how_it_works?: string
    unique_method?: string
    differentiator?: string
  }
  promises: {
    main_promise?: string
    secondary_promises?: string[]
    proof_points?: string[]
  }
  objection_handling: Array<{
    objection: string
    response: string
    proof?: string
  }>
  created_at: string
  updated_at: string
}

// ==================== Tag Input Component ====================

function TagInput({
  value = [],
  onChange,
  placeholder = 'Digite e pressione Enter',
}: {
  value?: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()])
      }
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== Brand Profile Form ====================

function BrandProfileForm({
  profile,
  onSave,
  onCancel,
  isLoading,
}: {
  profile?: BrandEditorialProfile | null
  onSave: (data: Partial<BrandEditorialProfile>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    brand_voice: {
      personality_traits: profile?.brand_voice?.personality_traits || [],
      tone_descriptors: profile?.brand_voice?.tone_descriptors || [],
      vocabulary_style: profile?.brand_voice?.vocabulary_style || '',
    },
    brand_identity: {
      mission: profile?.brand_identity?.mission || '',
      values: profile?.brand_identity?.values || [],
      unique_proposition: profile?.brand_identity?.unique_proposition || '',
    },
    beliefs_and_enemies: {
      core_beliefs: profile?.beliefs_and_enemies?.core_beliefs || [],
      industry_enemies: profile?.beliefs_and_enemies?.industry_enemies || [],
      contrarian_views: profile?.beliefs_and_enemies?.contrarian_views || [],
    },
    content_pillars: profile?.content_pillars || [],
  })

  const addPillar = () => {
    setFormData(prev => ({
      ...prev,
      content_pillars: [...prev.content_pillars, { name: '', description: '', example_topics: [] }],
    }))
  }

  const removePillar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content_pillars: prev.content_pillars.filter((_, i) => i !== index),
    }))
  }

  const updatePillar = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      content_pillars: prev.content_pillars.map((pillar, i) =>
        i === index ? { ...pillar, [field]: value } : pillar
      ),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Perfil *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Marca Principal, Produto X..."
        />
      </div>

      <Accordion type="multiple" defaultValue={['voice', 'identity']}>
        <AccordionItem value="voice">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Voz da Marca
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tracos de Personalidade</Label>
              <TagInput
                value={formData.brand_voice.personality_traits}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  brand_voice: { ...prev.brand_voice, personality_traits: tags },
                }))}
                placeholder="Ex: Ousado, Inovador, Amigavel..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descritores de Tom</Label>
              <TagInput
                value={formData.brand_voice.tone_descriptors}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  brand_voice: { ...prev.brand_voice, tone_descriptors: tags },
                }))}
                placeholder="Ex: Provocativo, Educativo, Inspirador..."
              />
            </div>

            <div className="space-y-2">
              <Label>Estilo de Vocabulario</Label>
              <Textarea
                value={formData.brand_voice.vocabulary_style}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_voice: { ...prev.brand_voice, vocabulary_style: e.target.value },
                }))}
                placeholder="Descreva o estilo de vocabulario: formal/informal, tecnico/simples..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="identity">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Identidade da Marca
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Missao</Label>
              <Textarea
                value={formData.brand_identity.mission}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_identity: { ...prev.brand_identity, mission: e.target.value },
                }))}
                placeholder="Qual e a missao da marca?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Valores</Label>
              <TagInput
                value={formData.brand_identity.values}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  brand_identity: { ...prev.brand_identity, values: tags },
                }))}
                placeholder="Ex: Transparencia, Inovacao, Qualidade..."
              />
            </div>

            <div className="space-y-2">
              <Label>Proposicao Unica (USP)</Label>
              <Textarea
                value={formData.brand_identity.unique_proposition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  brand_identity: { ...prev.brand_identity, unique_proposition: e.target.value },
                }))}
                placeholder="O que torna sua marca unica?"
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="beliefs">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4" />
              Crencas e Posicionamentos
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Crencas Centrais</Label>
              <TagInput
                value={formData.beliefs_and_enemies.core_beliefs}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  beliefs_and_enemies: { ...prev.beliefs_and_enemies, core_beliefs: tags },
                }))}
                placeholder="Ex: Qualidade sobre quantidade, Resultados importam..."
              />
            </div>

            <div className="space-y-2">
              <Label>Inimigos da Industria</Label>
              <TagInput
                value={formData.beliefs_and_enemies.industry_enemies}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  beliefs_and_enemies: { ...prev.beliefs_and_enemies, industry_enemies: tags },
                }))}
                placeholder="Ex: Promessas vazias, Falta de transparencia..."
              />
            </div>

            <div className="space-y-2">
              <Label>Visoes Contrarias</Label>
              <TagInput
                value={formData.beliefs_and_enemies.contrarian_views}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  beliefs_and_enemies: { ...prev.beliefs_and_enemies, contrarian_views: tags },
                }))}
                placeholder="Ex: Menos e mais, Velocidade nao e tudo..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pillars">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Pilares de Conteudo
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {formData.content_pillars.map((pillar, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pilar {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePillar(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={pillar.name}
                    onChange={(e) => updatePillar(index, 'name', e.target.value)}
                    placeholder="Nome do pilar"
                  />
                  <Textarea
                    value={pillar.description}
                    onChange={(e) => updatePillar(index, 'description', e.target.value)}
                    placeholder="Descricao do pilar"
                    rows={2}
                  />
                  <TagInput
                    value={pillar.example_topics || []}
                    onChange={(tags) => updatePillar(index, 'example_topics', tags)}
                    placeholder="Topicos de exemplo"
                  />
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addPillar} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pilar
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isLoading || !formData.name}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}

// ==================== Audience Profile Form ====================

function AudienceProfileForm({
  profile,
  onSave,
  onCancel,
  isLoading,
}: {
  profile?: AudienceProfile | null
  onSave: (data: Partial<AudienceProfile>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    demographics: {
      age_range: profile?.demographics?.age_range || '',
      gender: profile?.demographics?.gender || '',
      location: profile?.demographics?.location || '',
      income_level: profile?.demographics?.income_level || '',
      education: profile?.demographics?.education || '',
    },
    psychographics: {
      pains: profile?.psychographics?.pains || [],
      desires: profile?.psychographics?.desires || [],
      fears: profile?.psychographics?.fears || [],
      dreams: profile?.psychographics?.dreams || [],
    },
    objections: {
      common_objections: profile?.objections?.common_objections || [],
      trust_barriers: profile?.objections?.trust_barriers || [],
    },
    language_patterns: {
      slang_terms: profile?.language_patterns?.slang_terms || [],
      phrases_they_use: profile?.language_patterns?.phrases_they_use || [],
      tone_preference: profile?.language_patterns?.tone_preference || '',
    },
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Perfil *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Empreendedores, Profissionais de Marketing..."
        />
      </div>

      <Accordion type="multiple" defaultValue={['demographics', 'psychographics']}>
        <AccordionItem value="demographics">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Demografia
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Faixa Etaria</Label>
                <Input
                  value={formData.demographics.age_range}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics, age_range: e.target.value },
                  }))}
                  placeholder="Ex: 25-45 anos"
                />
              </div>
              <div className="space-y-2">
                <Label>Genero</Label>
                <Input
                  value={formData.demographics.gender}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics, gender: e.target.value },
                  }))}
                  placeholder="Ex: Misto, Masculino, Feminino"
                />
              </div>
              <div className="space-y-2">
                <Label>Localizacao</Label>
                <Input
                  value={formData.demographics.location}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics, location: e.target.value },
                  }))}
                  placeholder="Ex: Brasil, Grandes centros"
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel de Renda</Label>
                <Input
                  value={formData.demographics.income_level}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics, income_level: e.target.value },
                  }))}
                  placeholder="Ex: Classe B, R$5k-15k/mes"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Educacao</Label>
                <Input
                  value={formData.demographics.education}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    demographics: { ...prev.demographics, education: e.target.value },
                  }))}
                  placeholder="Ex: Superior completo"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="psychographics">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Psicografia
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Dores (problemas que enfrentam)</Label>
              <TagInput
                value={formData.psychographics.pains}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  psychographics: { ...prev.psychographics, pains: tags },
                }))}
                placeholder="Ex: Falta de tempo, Dificuldade em escalar..."
              />
            </div>
            <div className="space-y-2">
              <Label>Desejos (o que querem alcancar)</Label>
              <TagInput
                value={formData.psychographics.desires}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  psychographics: { ...prev.psychographics, desires: tags },
                }))}
                placeholder="Ex: Liberdade financeira, Reconhecimento..."
              />
            </div>
            <div className="space-y-2">
              <Label>Medos (o que temem)</Label>
              <TagInput
                value={formData.psychographics.fears}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  psychographics: { ...prev.psychographics, fears: tags },
                }))}
                placeholder="Ex: Perder dinheiro, Ficar para tras..."
              />
            </div>
            <div className="space-y-2">
              <Label>Sonhos (aspiracoes)</Label>
              <TagInput
                value={formData.psychographics.dreams}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  psychographics: { ...prev.psychographics, dreams: tags },
                }))}
                placeholder="Ex: Viajar o mundo, Ter um negocio..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="objections">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4" />
              Objecoes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Objecoes Comuns</Label>
              <TagInput
                value={formData.objections.common_objections}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  objections: { ...prev.objections, common_objections: tags },
                }))}
                placeholder="Ex: E muito caro, Nao tenho tempo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Barreiras de Confianca</Label>
              <TagInput
                value={formData.objections.trust_barriers}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  objections: { ...prev.objections, trust_barriers: tags },
                }))}
                placeholder="Ex: Ja fui enganado antes, Como sei que funciona..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="language">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Padroes de Linguagem
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Girias/Termos que Usam</Label>
              <TagInput
                value={formData.language_patterns.slang_terms}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  language_patterns: { ...prev.language_patterns, slang_terms: tags },
                }))}
                placeholder="Ex: escalar, growth, ROI..."
              />
            </div>
            <div className="space-y-2">
              <Label>Frases Comuns</Label>
              <TagInput
                value={formData.language_patterns.phrases_they_use}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  language_patterns: { ...prev.language_patterns, phrases_they_use: tags },
                }))}
                placeholder="Ex: Preciso de resultados rapidos..."
              />
            </div>
            <div className="space-y-2">
              <Label>Preferencia de Tom</Label>
              <Textarea
                value={formData.language_patterns.tone_preference}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  language_patterns: { ...prev.language_patterns, tone_preference: e.target.value },
                }))}
                placeholder="Ex: Direto ao ponto, sem enrolacao..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isLoading || !formData.name}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}

// ==================== Product Positioning Form ====================

function ProductPositioningForm({
  positioning,
  onSave,
  onCancel,
  isLoading,
}: {
  positioning?: ProductPositioning | null
  onSave: (data: Partial<ProductPositioning>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    name: positioning?.name || '',
    transformation: {
      before_state: positioning?.transformation?.before_state || '',
      after_state: positioning?.transformation?.after_state || '',
      journey_description: positioning?.transformation?.journey_description || '',
    },
    mechanism: {
      how_it_works: positioning?.mechanism?.how_it_works || '',
      unique_method: positioning?.mechanism?.unique_method || '',
      differentiator: positioning?.mechanism?.differentiator || '',
    },
    promises: {
      main_promise: positioning?.promises?.main_promise || '',
      secondary_promises: positioning?.promises?.secondary_promises || [],
      proof_points: positioning?.promises?.proof_points || [],
    },
    objection_handling: positioning?.objection_handling || [],
  })

  const addObjectionHandler = () => {
    setFormData(prev => ({
      ...prev,
      objection_handling: [...prev.objection_handling, { objection: '', response: '', proof: '' }],
    }))
  }

  const removeObjectionHandler = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objection_handling: prev.objection_handling.filter((_, i) => i !== index),
    }))
  }

  const updateObjectionHandler = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      objection_handling: prev.objection_handling.map((handler, i) =>
        i === index ? { ...handler, [field]: value } : handler
      ),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Posicionamento *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Produto Principal, Servico Premium..."
        />
      </div>

      <Accordion type="multiple" defaultValue={['transformation', 'promises']}>
        <AccordionItem value="transformation">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Transformacao
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Estado ANTES (situacao atual do cliente)</Label>
              <Textarea
                value={formData.transformation.before_state}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  transformation: { ...prev.transformation, before_state: e.target.value },
                }))}
                placeholder="Descreva como o cliente esta ANTES de usar seu produto..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado DEPOIS (resultado esperado)</Label>
              <Textarea
                value={formData.transformation.after_state}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  transformation: { ...prev.transformation, after_state: e.target.value },
                }))}
                placeholder="Descreva como o cliente estara DEPOIS de usar seu produto..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao da Jornada</Label>
              <Textarea
                value={formData.transformation.journey_description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  transformation: { ...prev.transformation, journey_description: e.target.value },
                }))}
                placeholder="Como acontece essa transformacao..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mechanism">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Mecanismo
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Como Funciona</Label>
              <Textarea
                value={formData.mechanism.how_it_works}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  mechanism: { ...prev.mechanism, how_it_works: e.target.value },
                }))}
                placeholder="Explique como seu produto/servico funciona..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo Unico</Label>
              <Textarea
                value={formData.mechanism.unique_method}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  mechanism: { ...prev.mechanism, unique_method: e.target.value },
                }))}
                placeholder="O que torna seu metodo unico..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Diferenciador</Label>
              <Textarea
                value={formData.mechanism.differentiator}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  mechanism: { ...prev.mechanism, differentiator: e.target.value },
                }))}
                placeholder="O que diferencia voce da concorrencia..."
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="promises">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronUp className="h-4 w-4" />
              Promessas
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Promessa Principal</Label>
              <Textarea
                value={formData.promises.main_promise}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  promises: { ...prev.promises, main_promise: e.target.value },
                }))}
                placeholder="Qual e a promessa principal do seu produto..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Promessas Secundarias</Label>
              <TagInput
                value={formData.promises.secondary_promises}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  promises: { ...prev.promises, secondary_promises: tags },
                }))}
                placeholder="Ex: Suporte 24h, Garantia de 30 dias..."
              />
            </div>
            <div className="space-y-2">
              <Label>Provas/Resultados</Label>
              <TagInput
                value={formData.promises.proof_points}
                onChange={(tags) => setFormData(prev => ({
                  ...prev,
                  promises: { ...prev.promises, proof_points: tags },
                }))}
                placeholder="Ex: +500 clientes satisfeitos, 98% de aprovacao..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="objection_handling">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4" />
              Tratamento de Objecoes
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {formData.objection_handling.map((handler, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Objecao {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObjectionHandler(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={handler.objection}
                    onChange={(e) => updateObjectionHandler(index, 'objection', e.target.value)}
                    placeholder="A objecao do cliente..."
                  />
                  <Textarea
                    value={handler.response}
                    onChange={(e) => updateObjectionHandler(index, 'response', e.target.value)}
                    placeholder="Sua resposta para essa objecao..."
                    rows={2}
                  />
                  <Input
                    value={handler.proof || ''}
                    onChange={(e) => updateObjectionHandler(index, 'proof', e.target.value)}
                    placeholder="Prova ou evidencia (opcional)"
                  />
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addObjectionHandler} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Objecao
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isLoading || !formData.name}>
          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function BrandSettings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('brand')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null)

  // Queries
  const { data: brandProfilesData, isLoading: loadingBrand } = useQuery({
    queryKey: ['brand-profiles'],
    queryFn: () => brandLayersApi.listBrandProfiles(),
  })

  const { data: audienceProfilesData, isLoading: loadingAudience } = useQuery({
    queryKey: ['audience-profiles'],
    queryFn: () => brandLayersApi.listAudienceProfiles(),
  })

  const { data: productPositioningsData, isLoading: loadingProduct } = useQuery({
    queryKey: ['product-positionings'],
    queryFn: () => brandLayersApi.listProductPositionings(),
  })

  // Mutations
  const createBrandMutation = useMutation({
    mutationFn: brandLayersApi.createBrandProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-profiles'] })
      setShowForm(false)
      toast.success('Perfil de marca criado!')
    },
    onError: () => toast.error('Erro ao criar perfil'),
  })

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => brandLayersApi.updateBrandProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-profiles'] })
      setShowForm(false)
      setEditingItem(null)
      toast.success('Perfil atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  })

  const deleteBrandMutation = useMutation({
    mutationFn: brandLayersApi.deleteBrandProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-profiles'] })
      toast.success('Perfil deletado!')
    },
    onError: () => toast.error('Erro ao deletar perfil'),
  })

  const createAudienceMutation = useMutation({
    mutationFn: brandLayersApi.createAudienceProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-profiles'] })
      setShowForm(false)
      toast.success('Perfil de audiencia criado!')
    },
    onError: () => toast.error('Erro ao criar perfil'),
  })

  const updateAudienceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => brandLayersApi.updateAudienceProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-profiles'] })
      setShowForm(false)
      setEditingItem(null)
      toast.success('Perfil atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  })

  const deleteAudienceMutation = useMutation({
    mutationFn: brandLayersApi.deleteAudienceProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-profiles'] })
      toast.success('Perfil deletado!')
    },
    onError: () => toast.error('Erro ao deletar perfil'),
  })

  const createProductMutation = useMutation({
    mutationFn: brandLayersApi.createProductPositioning,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-positionings'] })
      setShowForm(false)
      toast.success('Posicionamento criado!')
    },
    onError: () => toast.error('Erro ao criar posicionamento'),
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => brandLayersApi.updateProductPositioning(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-positionings'] })
      setShowForm(false)
      setEditingItem(null)
      toast.success('Posicionamento atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar posicionamento'),
  })

  const deleteProductMutation = useMutation({
    mutationFn: brandLayersApi.deleteProductPositioning,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-positionings'] })
      toast.success('Posicionamento deletado!')
    },
    onError: () => toast.error('Erro ao deletar posicionamento'),
  })

  const handleSave = (data: any) => {
    if (activeTab === 'brand') {
      if (editingItem) {
        updateBrandMutation.mutate({ id: editingItem.id, data })
      } else {
        createBrandMutation.mutate(data)
      }
    } else if (activeTab === 'audience') {
      if (editingItem) {
        updateAudienceMutation.mutate({ id: editingItem.id, data })
      } else {
        createAudienceMutation.mutate(data)
      }
    } else if (activeTab === 'product') {
      if (editingItem) {
        updateProductMutation.mutate({ id: editingItem.id, data })
      } else {
        createProductMutation.mutate(data)
      }
    }
  }

  const handleDelete = () => {
    if (!deleteConfirm) return

    if (deleteConfirm.type === 'brand') {
      deleteBrandMutation.mutate(deleteConfirm.id)
    } else if (deleteConfirm.type === 'audience') {
      deleteAudienceMutation.mutate(deleteConfirm.id)
    } else if (deleteConfirm.type === 'product') {
      deleteProductMutation.mutate(deleteConfirm.id)
    }

    setDeleteConfirm(null)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const brandProfiles = brandProfilesData?.data?.profiles || []
  const audienceProfiles = audienceProfilesData?.data?.profiles || []
  const productPositionings = productPositioningsData?.data?.positionings || []

  const isLoading = createBrandMutation.isPending || updateBrandMutation.isPending ||
    createAudienceMutation.isPending || updateAudienceMutation.isPending ||
    createProductMutation.isPending || updateProductMutation.isPending

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Palette className="h-8 w-8 text-purple-500" />
          Configuracoes de Marca
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o DNA da marca, perfil do publico e posicionamento do produto para conteudo alinhado
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setShowForm(false); setEditingItem(null); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brand" className="gap-2">
            <Palette className="h-4 w-4" />
            DNA da Marca
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-2">
            <Users className="h-4 w-4" />
            Publico-Alvo
          </TabsTrigger>
          <TabsTrigger value="product" className="gap-2">
            <Package className="h-4 w-4" />
            Produto
          </TabsTrigger>
        </TabsList>

        {/* Brand Profiles Tab */}
        <TabsContent value="brand" className="space-y-4">
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingItem ? 'Editar' : 'Novo'} Perfil Editorial</CardTitle>
                <CardDescription>
                  Defina a voz, identidade e posicionamento da sua marca
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandProfileForm
                  profile={editingItem}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </div>

              {loadingBrand ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : brandProfiles.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum perfil de marca</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Crie um perfil para definir a voz e identidade da sua marca
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Perfil
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {brandProfiles.map((profile: BrandEditorialProfile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{profile.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {profile.brand_voice?.personality_traits?.slice(0, 3).map((trait, i) => (
                                <Badge key={i} variant="secondary">{trait}</Badge>
                              ))}
                              {profile.brand_identity?.mission && (
                                <Badge variant="outline">Missao definida</Badge>
                              )}
                              {(profile.content_pillars?.length || 0) > 0 && (
                                <Badge variant="outline">{profile.content_pillars.length} pilares</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteConfirm({ type: 'brand', id: profile.id, name: profile.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Audience Profiles Tab */}
        <TabsContent value="audience" className="space-y-4">
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingItem ? 'Editar' : 'Novo'} Perfil de Audiencia</CardTitle>
                <CardDescription>
                  Defina quem e seu publico-alvo, suas dores e desejos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudienceProfileForm
                  profile={editingItem}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </div>

              {loadingAudience ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : audienceProfiles.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum perfil de audiencia</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Crie um perfil para definir quem e seu publico-alvo
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Perfil
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {audienceProfiles.map((profile: AudienceProfile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{profile.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {profile.demographics?.age_range && (
                                <Badge variant="secondary">{profile.demographics.age_range}</Badge>
                              )}
                              {(profile.psychographics?.pains?.length || 0) > 0 && (
                                <Badge variant="outline">{profile.psychographics.pains?.length} dores</Badge>
                              )}
                              {(profile.psychographics?.desires?.length || 0) > 0 && (
                                <Badge variant="outline">{profile.psychographics.desires?.length} desejos</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteConfirm({ type: 'audience', id: profile.id, name: profile.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Product Positionings Tab */}
        <TabsContent value="product" className="space-y-4">
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingItem ? 'Editar' : 'Novo'} Posicionamento</CardTitle>
                <CardDescription>
                  Defina a transformacao, promessas e diferenciais do produto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductPositioningForm
                  positioning={editingItem}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Posicionamento
                </Button>
              </div>

              {loadingProduct ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : productPositionings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum posicionamento</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Crie um posicionamento para definir como apresentar seu produto
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Posicionamento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {productPositionings.map((positioning: ProductPositioning) => (
                    <Card key={positioning.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{positioning.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {positioning.promises?.main_promise && (
                                <Badge variant="secondary">Promessa definida</Badge>
                              )}
                              {positioning.transformation?.before_state && (
                                <Badge variant="outline">Transformacao</Badge>
                              )}
                              {(positioning.objection_handling?.length || 0) > 0 && (
                                <Badge variant="outline">{positioning.objection_handling.length} objecoes</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(positioning)}>
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteConfirm({ type: 'product', id: positioning.id, name: positioning.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteConfirm?.name}"? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default BrandSettings
