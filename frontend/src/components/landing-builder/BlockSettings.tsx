import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Palette, Type, Layout, Plus, Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { type Block, type BlockType, type GlobalSettings } from '@/types/landing-page-builder'
import { useUploadLandingPageImage } from '@/hooks/useLandingPages'
import { useParams } from 'react-router-dom'

interface BlockSettingsProps {
  block: Block | null
  globalSettings: GlobalSettings
  onUpdateBlock: (settings: any) => void
  onUpdateGlobal: (settings: GlobalSettings) => void
  onClose: () => void
}

export function BlockSettings({
  block,
  globalSettings,
  onUpdateBlock,
  onUpdateGlobal,
  onClose,
}: BlockSettingsProps) {
  const [activeTab, setActiveTab] = useState<'block' | 'global'>('block')

  if (!block) {
    return (
      <div className="w-80 bg-background border-l flex flex-col h-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Configurações</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
          <p>Selecione um bloco para editar suas configurações</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-background border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Configurações</h3>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('block')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'block'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Layout className="h-4 w-4 inline mr-2" />
          Bloco
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
            activeTab === 'global'
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Palette className="h-4 w-4 inline mr-2" />
          Global
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'block' ? (
          <BlockSettingsContent block={block} onUpdate={onUpdateBlock} />
        ) : (
          <GlobalSettingsContent settings={globalSettings} onUpdate={onUpdateGlobal} />
        )}
      </div>
    </div>
  )
}

// Configurações específicas de cada bloco
function BlockSettingsContent({ block, onUpdate }: { block: Block; onUpdate: (settings: any) => void }) {
  const settings = block.settings as any

  const updateSetting = (key: string, value: any) => {
    onUpdate({ ...settings, [key]: value })
  }

  switch (block.type) {
    case 'hero':
      return <HeroSettings settings={settings} onChange={updateSetting} />
    case 'products':
      return <ProductsSettings settings={settings} onChange={updateSetting} />
    case 'form':
      return <FormSettings settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'testimonials':
      return <TestimonialsSettings settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'faq':
      return <FAQSettings settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'text':
      return <TextSettings settings={settings} onChange={updateSetting} />
    case 'cta':
      return <CTASettings settings={settings} onChange={updateSetting} />
    case 'features':
      return <FeaturesSettings settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'countdown':
      return <CountdownSettings settings={settings} onChange={updateSetting} />
    case 'header':
      return <HeaderSettings settings={settings} onChange={updateSetting} />
    case 'footer':
      return <FooterSettings settings={settings} onChange={updateSetting} />
    case 'divider':
      return <DividerSettings settings={settings} onChange={updateSetting} />
    case 'image':
      return <ImageSettingsComponent settings={settings} onChange={updateSetting} />
    case 'video':
      return <VideoSettings settings={settings} onChange={updateSetting} />
    case 'gallery':
      return <GallerySettings settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'columns':
      return <ColumnsSettingsComponent settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    case 'section':
      return <SectionSettingsComponent settings={settings} onChange={updateSetting} onUpdate={onUpdate} />
    default:
      return <GenericSettings settings={settings} onChange={updateSetting} />
  }
}

// Componentes de configuração individuais
function HeroSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Título principal"
          />
        </SettingField>
        <SettingField label="Subtítulo">
          <textarea
            value={settings.subtitle || ''}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="Subtítulo ou descrição"
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm min-h-[60px] resize-y"
          />
        </SettingField>
        <SettingField label="Texto do botão">
          <Input
            value={settings.ctaText || ''}
            onChange={(e) => onChange('ctaText', e.target.value)}
            placeholder="Ver produtos"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Tipo de fundo">
          <select
            value={settings.backgroundType || 'gradient'}
            onChange={(e) => onChange('backgroundType', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="color">Cor sólida</option>
            <option value="gradient">Gradiente</option>
            <option value="image">Imagem</option>
          </select>
        </SettingField>

        {settings.backgroundType === 'gradient' && (
          <div className="grid grid-cols-2 gap-2">
            <SettingField label="Cor 1">
              <ColorPicker value={settings.gradientFrom} onChange={(v) => onChange('gradientFrom', v)} />
            </SettingField>
            <SettingField label="Cor 2">
              <ColorPicker value={settings.gradientTo} onChange={(v) => onChange('gradientTo', v)} />
            </SettingField>
          </div>
        )}

        {settings.backgroundType === 'color' && (
          <SettingField label="Cor de fundo">
            <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
          </SettingField>
        )}

        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>

        <SettingField label="Cor do botão">
          <ColorPicker value={settings.ctaColor} onChange={(v) => onChange('ctaColor', v)} />
        </SettingField>

        <SettingField label="Alinhamento">
          <select
            value={settings.alignment || 'center'}
            onChange={(e) => onChange('alignment', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </SettingField>

        <SettingField label="Altura">
          <select
            value={settings.height || 'medium'}
            onChange={(e) => onChange('height', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="small">Pequena</option>
            <option value="medium">Média</option>
            <option value="large">Grande</option>
            <option value="full">Tela cheia</option>
          </select>
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function ProductsSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Nossos Produtos"
          />
        </SettingField>
        <SettingField label="Subtítulo">
          <Input
            value={settings.subtitle || ''}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="Escolha seu produto"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Layout">
        <SettingField label="Colunas">
          <select
            value={settings.columns || 3}
            onChange={(e) => onChange('columns', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value={2}>2 colunas</option>
            <option value={3}>3 colunas</option>
            <option value={4}>4 colunas</option>
          </select>
        </SettingField>

        <SettingField label="Estilo do card">
          <select
            value={settings.cardStyle || 'shadow'}
            onChange={(e) => onChange('cardStyle', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="minimal">Minimalista</option>
            <option value="bordered">Com borda</option>
            <option value="shadow">Com sombra</option>
          </select>
        </SettingField>

        <SettingField label="Mostrar descrição">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showDescription}
              onChange={(e) => onChange('showDescription', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Exibir descrição do produto</span>
          </label>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function FormSettings({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const addField = () => {
    const fields = settings.fields || []
    onUpdate({
      ...settings,
      fields: [...fields, { name: `field_${fields.length}`, label: 'Novo campo', type: 'text', required: false }],
    })
  }

  const removeField = (index: number) => {
    const fields = [...(settings.fields || [])]
    fields.splice(index, 1)
    onUpdate({ ...settings, fields })
  }

  const updateField = (index: number, key: string, value: any) => {
    const fields = [...(settings.fields || [])]
    fields[index] = { ...fields[index], [key]: value }
    onUpdate({ ...settings, fields })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Tenho interesse!"
          />
        </SettingField>
        <SettingField label="Subtítulo">
          <Input
            value={settings.subtitle || ''}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="Preencha seus dados"
          />
        </SettingField>
        <SettingField label="Texto do botão">
          <Input
            value={settings.buttonText || ''}
            onChange={(e) => onChange('buttonText', e.target.value)}
            placeholder="Enviar"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Campos">
        <div className="space-y-2">
          {(settings.fields || []).map((field: any, index: number) => (
            <div key={index} className="p-2 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1"
                />
                <button onClick={() => removeField(index)} className="p-1 ml-2 text-red-500 hover:bg-red-500/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, 'type', e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-sm bg-background"
                >
                  <option value="text">Texto</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="textarea">Área de texto</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, 'required', e.target.checked)}
                  />
                  Obrigatório
                </label>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addField} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar campo
          </Button>
        </div>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Cor do botão">
          <ColorPicker value={settings.buttonColor} onChange={(v) => onChange('buttonColor', v)} />
        </SettingField>
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function TestimonialsSettings({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const addItem = () => {
    const items = settings.items || []
    onUpdate({
      ...settings,
      items: [...items, { id: Date.now().toString(), name: '', role: '', content: '', rating: 5 }],
    })
  }

  const removeItem = (index: number) => {
    const items = [...(settings.items || [])]
    items.splice(index, 1)
    onUpdate({ ...settings, items })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Depoimentos">
        <div className="space-y-2">
          {(settings.items || []).map((item: any, index: number) => (
            <div key={item.id || index} className="p-2 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const items = [...settings.items]
                    items[index].name = e.target.value
                    onUpdate({ ...settings, items })
                  }}
                  placeholder="Nome"
                  className="flex-1"
                />
                <button onClick={() => removeItem(index)} className="p-1 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={item.content}
                onChange={(e) => {
                  const items = [...settings.items]
                  items[index].content = e.target.value
                  onUpdate({ ...settings, items })
                }}
                placeholder="Depoimento"
                className="w-full px-2 py-1 border rounded text-sm bg-background min-h-[60px]"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar depoimento
          </Button>
        </div>
      </SettingGroup>
    </div>
  )
}

function FAQSettings({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const addItem = () => {
    const items = settings.items || []
    onUpdate({
      ...settings,
      items: [...items, { id: Date.now().toString(), question: '', answer: '' }],
    })
  }

  const removeItem = (index: number) => {
    const items = [...(settings.items || [])]
    items.splice(index, 1)
    onUpdate({ ...settings, items })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Perguntas">
        <div className="space-y-2">
          {(settings.items || []).map((item: any, index: number) => (
            <div key={item.id || index} className="p-2 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={item.question}
                  onChange={(e) => {
                    const items = [...settings.items]
                    items[index].question = e.target.value
                    onUpdate({ ...settings, items })
                  }}
                  placeholder="Pergunta"
                  className="flex-1"
                />
                <button onClick={() => removeItem(index)} className="p-1 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={item.answer}
                onChange={(e) => {
                  const items = [...settings.items]
                  items[index].answer = e.target.value
                  onUpdate({ ...settings, items })
                }}
                placeholder="Resposta"
                className="w-full px-2 py-1 border rounded text-sm bg-background min-h-[60px]"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar pergunta
          </Button>
        </div>
      </SettingGroup>
    </div>
  )
}

function TextSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título (opcional)">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Título do bloco"
          />
        </SettingField>
        <SettingField label="Tipo do título">
          <select
            value={settings.titleTag || 'h2'}
            onChange={(e) => onChange('titleTag', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="h1">H1 - Título principal</option>
            <option value="h2">H2 - Subtítulo</option>
            <option value="h3">H3 - Seção</option>
            <option value="h4">H4 - Subseção</option>
            <option value="p">Parágrafo destacado</option>
          </select>
        </SettingField>
        <SettingField label="Texto">
          <textarea
            value={settings.content || ''}
            onChange={(e) => onChange('content', e.target.value)}
            placeholder="Digite o conteúdo do texto aqui..."
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm min-h-[100px] resize-y"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo do texto">
        <SettingField label="Alinhamento">
          <select
            value={settings.alignment || 'left'}
            onChange={(e) => onChange('alignment', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
            <option value="justify">Justificado</option>
          </select>
        </SettingField>
        <SettingField label="Tamanho da fonte">
          <select
            value={settings.fontSize || 'medium'}
            onChange={(e) => onChange('fontSize', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="xs">Extra pequeno</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="xl">Extra grande</option>
          </select>
        </SettingField>
        <SettingField label="Peso da fonte">
          <select
            value={settings.fontWeight || 'normal'}
            onChange={(e) => onChange('fontWeight', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="light">Leve</option>
            <option value="normal">Normal</option>
            <option value="medium">Médio</option>
            <option value="semibold">Semi-negrito</option>
            <option value="bold">Negrito</option>
          </select>
        </SettingField>
        <SettingField label="Espaçamento entre linhas">
          <select
            value={settings.lineHeight || 'normal'}
            onChange={(e) => onChange('lineHeight', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="tight">Apertado</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxado</option>
            <option value="loose">Solto</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Cores">
        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
        <SettingField label="Cor do título">
          <ColorPicker value={settings.titleColor} onChange={(v) => onChange('titleColor', v)} />
        </SettingField>
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Espaçamento">
        <SettingField label="Padding">
          <select
            value={settings.padding || 'medium'}
            onChange={(e) => onChange('padding', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="none">Nenhum</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </SettingField>
        <SettingField label="Largura máxima">
          <select
            value={settings.maxWidth || 'full'}
            onChange={(e) => onChange('maxWidth', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="full">100%</option>
            <option value="lg">Grande (1024px)</option>
            <option value="md">Médio (768px)</option>
            <option value="sm">Pequeno (640px)</option>
          </select>
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function CTASettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input value={settings.title || ''} onChange={(e) => onChange('title', e.target.value)} />
        </SettingField>
        <SettingField label="Subtítulo">
          <Input value={settings.subtitle || ''} onChange={(e) => onChange('subtitle', e.target.value)} />
        </SettingField>
        <SettingField label="Texto do botão">
          <Input value={settings.buttonText || ''} onChange={(e) => onChange('buttonText', e.target.value)} />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Cores">
        <SettingField label="Fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
        <SettingField label="Botão">
          <ColorPicker value={settings.buttonColor} onChange={(v) => onChange('buttonColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function FeaturesSettings({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const addItem = () => {
    const items = settings.items || []
    onUpdate({
      ...settings,
      items: [...items, { id: Date.now().toString(), icon: '✨', title: '', description: '' }],
    })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input value={settings.title || ''} onChange={(e) => onChange('title', e.target.value)} />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Recursos">
        <div className="space-y-2">
          {(settings.items || []).map((item: any, index: number) => (
            <div key={item.id || index} className="p-2 bg-muted rounded-lg space-y-2">
              <Input
                value={item.title}
                onChange={(e) => {
                  const items = [...settings.items]
                  items[index].title = e.target.value
                  onUpdate({ ...settings, items })
                }}
                placeholder="Título"
              />
              <textarea
                value={item.description}
                onChange={(e) => {
                  const items = [...settings.items]
                  items[index].description = e.target.value
                  onUpdate({ ...settings, items })
                }}
                placeholder="Descrição"
                className="w-full px-2 py-1 border rounded text-sm bg-background"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar recurso
          </Button>
        </div>
      </SettingGroup>
    </div>
  )
}

function CountdownSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Título">
          <Input value={settings.title || ''} onChange={(e) => onChange('title', e.target.value)} />
        </SettingField>
        <SettingField label="Data alvo">
          <Input
            type="datetime-local"
            value={settings.targetDate?.slice(0, 16) || ''}
            onChange={(e) => onChange('targetDate', new Date(e.target.value).toISOString())}
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Cores">
        <SettingField label="Fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function HeaderSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Logo">
        <SettingField label="Imagem do logo">
          <ImageUploader 
            value={settings.logo} 
            onChange={(v) => onChange('logo', v)} 
            placeholder="Adicione o logo da empresa"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Configurações">
        <SettingField label="Fixar no topo">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.sticky}
              onChange={(e) => onChange('sticky', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Manter fixo ao rolar</span>
          </label>
        </SettingField>
        <SettingField label="Mostrar menu">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showMenu}
              onChange={(e) => onChange('showMenu', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Exibir itens de navegação</span>
          </label>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Cores">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function FooterSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Conteúdo">
        <SettingField label="Copyright">
          <Input
            value={settings.copyright || ''}
            onChange={(e) => onChange('copyright', e.target.value)}
            placeholder="© 2024 Sua Empresa"
          />
        </SettingField>
        <SettingField label="Mostrar redes sociais">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showSocialLinks}
              onChange={(e) => onChange('showSocialLinks', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Exibir links de redes sociais</span>
          </label>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Layout">
        <SettingField label="Colunas">
          <select
            value={settings.columns || 1}
            onChange={(e) => onChange('columns', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value={1}>1 coluna</option>
            <option value={2}>2 colunas</option>
            <option value={3}>3 colunas</option>
            <option value={4}>4 colunas</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Cores">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function DividerSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Estilo">
        <SettingField label="Tipo">
          <select
            value={settings.style || 'line'}
            onChange={(e) => onChange('style', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="line">Linha</option>
            <option value="dots">Pontos</option>
            <option value="wave">Onda</option>
            <option value="none">Espaço em branco</option>
          </select>
        </SettingField>
        <SettingField label="Altura">
          <select
            value={settings.height || 'medium'}
            onChange={(e) => onChange('height', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="small">Pequena</option>
            <option value="medium">Média</option>
            <option value="large">Grande</option>
          </select>
        </SettingField>
        <SettingField label="Cor">
          <ColorPicker value={settings.color} onChange={(v) => onChange('color', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function ImageSettingsComponent({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Imagem">
        <SettingField label="Selecionar imagem">
          <ImageUploader 
            value={settings.src} 
            onChange={(v) => onChange('src', v)} 
            placeholder="Clique ou arraste uma imagem"
          />
        </SettingField>
        <SettingField label="Texto alternativo">
          <Input
            value={settings.alt || ''}
            onChange={(e) => onChange('alt', e.target.value)}
            placeholder="Descrição da imagem"
          />
        </SettingField>
        <SettingField label="Legenda">
          <Input
            value={settings.caption || ''}
            onChange={(e) => onChange('caption', e.target.value)}
            placeholder="Legenda opcional"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Layout">
        <SettingField label="Largura">
          <select
            value={settings.width || 'full'}
            onChange={(e) => onChange('width', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="auto">Automática</option>
            <option value="50%">50%</option>
            <option value="75%">75%</option>
            <option value="full">100%</option>
          </select>
        </SettingField>
        <SettingField label="Alinhamento">
          <select
            value={settings.alignment || 'center'}
            onChange={(e) => onChange('alignment', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </SettingField>
        <SettingField label="Borda arredondada">
          <select
            value={settings.borderRadius || 'medium'}
            onChange={(e) => onChange('borderRadius', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="none">Sem arredondamento</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="full">Totalmente arredondado</option>
          </select>
        </SettingField>
        <SettingField label="Sombra">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.shadow}
              onChange={(e) => onChange('shadow', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Aplicar sombra</span>
          </label>
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function VideoSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Vídeo">
        <SettingField label="URL do vídeo">
          <Input
            value={settings.url || ''}
            onChange={(e) => onChange('url', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </SettingField>
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Título do vídeo"
          />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Configurações">
        <SettingField label="Proporção">
          <select
            value={settings.aspectRatio || '16:9'}
            onChange={(e) => onChange('aspectRatio', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="16:9">16:9 (Widescreen)</option>
            <option value="4:3">4:3 (Tradicional)</option>
            <option value="1:1">1:1 (Quadrado)</option>
          </select>
        </SettingField>
        <SettingField label="Autoplay">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(e) => onChange('autoplay', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Reproduzir automaticamente</span>
          </label>
        </SettingField>
        <SettingField label="Controles">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.controls}
              onChange={(e) => onChange('controls', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Mostrar controles</span>
          </label>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
      </SettingGroup>
    </div>
  )
}

function GallerySettings({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const addImage = () => {
    const images = settings.images || []
    onUpdate({
      ...settings,
      images: [...images, { src: '', alt: '' }],
    })
  }

  const removeImage = (index: number) => {
    const images = [...(settings.images || [])]
    images.splice(index, 1)
    onUpdate({ ...settings, images })
  }

  const updateImage = (index: number, key: string, value: string) => {
    const images = [...(settings.images || [])]
    images[index] = { ...images[index], [key]: value }
    onUpdate({ ...settings, images })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Layout">
        <SettingField label="Colunas">
          <select
            value={settings.columns || 3}
            onChange={(e) => onChange('columns', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value={2}>2 colunas</option>
            <option value={3}>3 colunas</option>
            <option value={4}>4 colunas</option>
          </select>
        </SettingField>
        <SettingField label="Espaçamento">
          <select
            value={settings.gap || 'medium'}
            onChange={(e) => onChange('gap', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </SettingField>
        <SettingField label="Estilo">
          <select
            value={settings.style || 'grid'}
            onChange={(e) => onChange('style', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="grid">Grid</option>
            <option value="masonry">Masonry</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Imagens">
        <div className="space-y-2">
          {(settings.images || []).map((image: any, index: number) => (
            <div key={index} className="p-2 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Imagem {index + 1}</span>
                <button onClick={() => removeImage(index)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                value={image.src}
                onChange={(e) => updateImage(index, 'src', e.target.value)}
                placeholder="URL da imagem"
              />
              <Input
                value={image.alt}
                onChange={(e) => updateImage(index, 'alt', e.target.value)}
                placeholder="Texto alternativo"
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addImage} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar imagem
          </Button>
        </div>
      </SettingGroup>
    </div>
  )
}

function ColumnsSettingsComponent({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const columnCount = settings.columns || 2
  const contents = settings.columnContents || []

  const updateColumnContent = (index: number, key: string, value: any) => {
    const newContents = [...contents]
    if (!newContents[index]) {
      newContents[index] = { type: 'text', content: '', alignment: 'center' }
    }
    newContents[index] = { ...newContents[index], [key]: value }
    onUpdate({ ...settings, columnContents: newContents })
  }

  // Ajustar quantidade de colunas
  const handleColumnsChange = (newCount: number) => {
    const newContents = [...contents]
    while (newContents.length < newCount) {
      newContents.push({ type: 'text', content: `Coluna ${newContents.length + 1}`, alignment: 'center' })
    }
    onUpdate({ ...settings, columns: newCount, columnContents: newContents.slice(0, newCount) })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Layout">
        <SettingField label="Número de colunas">
          <select
            value={columnCount}
            onChange={(e) => handleColumnsChange(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value={2}>2 colunas</option>
            <option value={3}>3 colunas</option>
            <option value={4}>4 colunas</option>
          </select>
        </SettingField>
        <SettingField label="Espaçamento">
          <select
            value={settings.gap || 'medium'}
            onChange={(e) => onChange('gap', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </SettingField>
        <SettingField label="Alinhamento vertical">
          <select
            value={settings.alignment || 'top'}
            onChange={(e) => onChange('alignment', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="top">Topo</option>
            <option value="center">Centro</option>
            <option value="bottom">Base</option>
          </select>
        </SettingField>
        <SettingField label="Padding">
          <select
            value={settings.padding || 'medium'}
            onChange={(e) => onChange('padding', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="none">Nenhum</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Conteúdo das Colunas">
        {Array.from({ length: columnCount }).map((_, index) => (
          <div key={index} className="p-3 bg-muted rounded-lg space-y-2 mb-2">
            <h5 className="text-xs font-medium">Coluna {index + 1}</h5>
            <SettingField label="Tipo">
              <select
                value={contents[index]?.type || 'text'}
                onChange={(e) => updateColumnContent(index, 'type', e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm bg-background"
              >
                <option value="text">Texto</option>
                <option value="image">Imagem</option>
                <option value="button">Botão</option>
                <option value="icon">Ícone + Texto</option>
              </select>
            </SettingField>

            {contents[index]?.type === 'text' && (
              <>
                <SettingField label="Título">
                  <Input
                    value={contents[index]?.title || ''}
                    onChange={(e) => updateColumnContent(index, 'title', e.target.value)}
                    placeholder="Título"
                  />
                </SettingField>
                <SettingField label="Conteúdo">
                  <textarea
                    value={contents[index]?.content || ''}
                    onChange={(e) => updateColumnContent(index, 'content', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm bg-background min-h-[60px]"
                    placeholder="Conteúdo da coluna"
                  />
                </SettingField>
              </>
            )}

            {contents[index]?.type === 'image' && (
              <SettingField label="Imagem">
                <ImageUploader
                  value={contents[index]?.imageUrl}
                  onChange={(v) => updateColumnContent(index, 'imageUrl', v)}
                  placeholder="Selecione uma imagem"
                />
              </SettingField>
            )}

            {contents[index]?.type === 'button' && (
              <>
                <SettingField label="Texto do botão">
                  <Input
                    value={contents[index]?.buttonText || ''}
                    onChange={(e) => updateColumnContent(index, 'buttonText', e.target.value)}
                    placeholder="Clique aqui"
                  />
                </SettingField>
                <SettingField label="URL">
                  <Input
                    value={contents[index]?.buttonUrl || ''}
                    onChange={(e) => updateColumnContent(index, 'buttonUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </SettingField>
                <SettingField label="Cor do botão">
                  <ColorPicker
                    value={contents[index]?.buttonColor || '#3B82F6'}
                    onChange={(v) => updateColumnContent(index, 'buttonColor', v)}
                  />
                </SettingField>
              </>
            )}

            {contents[index]?.type === 'icon' && (
              <>
                <SettingField label="Ícone (emoji ou símbolo)">
                  <Input
                    value={contents[index]?.iconName || ''}
                    onChange={(e) => updateColumnContent(index, 'iconName', e.target.value)}
                    placeholder="✨ ou 🚀"
                  />
                </SettingField>
                <SettingField label="Título">
                  <Input
                    value={contents[index]?.title || ''}
                    onChange={(e) => updateColumnContent(index, 'title', e.target.value)}
                    placeholder="Título"
                  />
                </SettingField>
                <SettingField label="Descrição">
                  <textarea
                    value={contents[index]?.content || ''}
                    onChange={(e) => updateColumnContent(index, 'content', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm bg-background min-h-[40px]"
                    placeholder="Descrição"
                  />
                </SettingField>
              </>
            )}

            <SettingField label="Alinhamento">
              <select
                value={contents[index]?.alignment || 'center'}
                onChange={(e) => updateColumnContent(index, 'alignment', e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm bg-background"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </SettingField>
          </div>
        ))}
      </SettingGroup>
    </div>
  )
}

function SectionSettingsComponent({ settings, onChange, onUpdate }: { settings: any; onChange: (key: string, value: any) => void; onUpdate: (settings: any) => void }) {
  const elements = settings.elements || []

  const addElement = (type: string) => {
    const newElement = {
      id: `el-${Date.now()}`,
      type,
      settings: type === 'text' 
        ? { content: 'Novo texto', fontSize: 'medium' }
        : type === 'image'
        ? { src: '', alt: '' }
        : type === 'button'
        ? { text: 'Botão', url: '', color: '#3B82F6' }
        : type === 'spacer'
        ? { height: 'medium' }
        : { items: [] }
    }
    onUpdate({ ...settings, elements: [...elements, newElement] })
  }

  const updateElement = (index: number, newSettings: any) => {
    const newElements = [...elements]
    newElements[index] = { ...newElements[index], settings: newSettings }
    onUpdate({ ...settings, elements: newElements })
  }

  const removeElement = (index: number) => {
    const newElements = elements.filter((_: any, i: number) => i !== index)
    onUpdate({ ...settings, elements: newElements })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Cabeçalho da seção">
        <SettingField label="Título">
          <Input
            value={settings.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Título da seção"
          />
        </SettingField>
        <SettingField label="Subtítulo">
          <Input
            value={settings.subtitle || ''}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="Subtítulo opcional"
          />
        </SettingField>
        <SettingField label="Alinhamento">
          <select
            value={settings.alignment || 'center'}
            onChange={(e) => onChange('alignment', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Estilo">
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => onChange('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Imagem de fundo">
          <ImageUploader
            value={settings.backgroundImage}
            onChange={(v) => onChange('backgroundImage', v)}
            placeholder="Adicionar imagem de fundo"
          />
        </SettingField>
        {settings.backgroundImage && (
          <>
            <SettingField label="Overlay">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.backgroundOverlay}
                  onChange={(e) => onChange('backgroundOverlay', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Aplicar overlay escuro</span>
              </label>
            </SettingField>
            {settings.backgroundOverlay && (
              <SettingField label="Opacidade do overlay">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.overlayOpacity || 50}
                  onChange={(e) => onChange('overlayOpacity', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{settings.overlayOpacity || 50}%</span>
              </SettingField>
            )}
          </>
        )}
        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => onChange('textColor', v)} />
        </SettingField>
        <SettingField label="Padding">
          <select
            value={settings.padding || 'large'}
            onChange={(e) => onChange('padding', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="none">Nenhum</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="xl">Extra grande</option>
          </select>
        </SettingField>
        <SettingField label="Largura máxima">
          <select
            value={settings.maxWidth || 'lg'}
            onChange={(e) => onChange('maxWidth', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="full">100%</option>
            <option value="xl">Extra grande</option>
            <option value="lg">Grande</option>
            <option value="md">Médio</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Elementos">
        <div className="space-y-2">
          {elements.map((element: any, index: number) => (
            <div key={element.id} className="p-2 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{element.type}</span>
                <button onClick={() => removeElement(index)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {element.type === 'text' && (
                <textarea
                  value={element.settings.content || ''}
                  onChange={(e) => updateElement(index, { ...element.settings, content: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm bg-background min-h-[40px]"
                  placeholder="Texto"
                />
              )}

              {element.type === 'image' && (
                <ImageUploader
                  value={element.settings.src}
                  onChange={(v) => updateElement(index, { ...element.settings, src: v })}
                  placeholder="Selecione uma imagem"
                />
              )}

              {element.type === 'button' && (
                <>
                  <Input
                    value={element.settings.text || ''}
                    onChange={(e) => updateElement(index, { ...element.settings, text: e.target.value })}
                    placeholder="Texto do botão"
                  />
                  <Input
                    value={element.settings.url || ''}
                    onChange={(e) => updateElement(index, { ...element.settings, url: e.target.value })}
                    placeholder="URL"
                  />
                </>
              )}

              {element.type === 'spacer' && (
                <select
                  value={element.settings.height || 'medium'}
                  onChange={(e) => updateElement(index, { ...element.settings, height: e.target.value })}
                  className="w-full px-2 py-1 border rounded text-sm bg-background"
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </select>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" onClick={() => addElement('text')} className="flex-1">
              <Type className="h-3 w-3 mr-1" />
              Texto
            </Button>
            <Button variant="outline" size="sm" onClick={() => addElement('image')} className="flex-1">
              <ImageIcon className="h-3 w-3 mr-1" />
              Imagem
            </Button>
            <Button variant="outline" size="sm" onClick={() => addElement('button')} className="flex-1">
              <Plus className="h-3 w-3 mr-1" />
              Botão
            </Button>
            <Button variant="outline" size="sm" onClick={() => addElement('spacer')} className="flex-1">
              <Layout className="h-3 w-3 mr-1" />
              Espaço
            </Button>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}

function GenericSettings({ settings, onChange }: { settings: any; onChange: (key: string, value: any) => void }) {
  return (
    <div className="text-center text-muted-foreground p-4">
      Configurações não disponíveis para este bloco
    </div>
  )
}

// Configurações globais
function GlobalSettingsContent({ settings, onUpdate }: { settings: GlobalSettings; onUpdate: (settings: GlobalSettings) => void }) {
  const update = (key: keyof GlobalSettings, value: any) => {
    onUpdate({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-4">
      <SettingGroup title="Cores">
        <SettingField label="Cor primária">
          <ColorPicker value={settings.primaryColor} onChange={(v) => update('primaryColor', v)} />
        </SettingField>
        <SettingField label="Cor secundária">
          <ColorPicker value={settings.secondaryColor} onChange={(v) => update('secondaryColor', v)} />
        </SettingField>
        <SettingField label="Cor de destaque">
          <ColorPicker value={settings.accentColor} onChange={(v) => update('accentColor', v)} />
        </SettingField>
        <SettingField label="Cor de fundo">
          <ColorPicker value={settings.backgroundColor} onChange={(v) => update('backgroundColor', v)} />
        </SettingField>
        <SettingField label="Cor do texto">
          <ColorPicker value={settings.textColor} onChange={(v) => update('textColor', v)} />
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Tipografia">
        <SettingField label="Fonte">
          <select
            value={settings.fontFamily}
            onChange={(e) => update('fontFamily', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="Inter">Inter</option>
            <option value="Poppins">Poppins</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Lato">Lato</option>
          </select>
        </SettingField>
      </SettingGroup>

      <SettingGroup title="Layout">
        <SettingField label="Bordas arredondadas">
          <select
            value={settings.borderRadius}
            onChange={(e) => update('borderRadius', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="none">Sem arredondamento</option>
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="full">Totalmente arredondado</option>
          </select>
        </SettingField>
        <SettingField label="Espaçamento">
          <select
            value={settings.spacing}
            onChange={(e) => update('spacing', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
          >
            <option value="compact">Compacto</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxado</option>
          </select>
        </SettingField>
      </SettingGroup>
    </div>
  )
}

// Componentes auxiliares
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 rounded border cursor-pointer"
      />
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1"
      />
    </div>
  )
}

function ImageUploader({ 
  value, 
  onChange, 
  placeholder = 'Clique para selecionar ou arraste uma imagem',
  accept = 'image/*'
}: { 
  value: string | null | undefined
  onChange: (url: string) => void
  placeholder?: string
  accept?: string
}) {
  const { id } = useParams<{ id: string }>()
  const uploadMutation = useUploadLandingPageImage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleUpload = async (file: File) => {
    if (!id) return
    
    try {
      const result = await uploadMutation.mutateAsync({ 
        id, 
        file, 
        type: 'block' 
      })
      onChange(result.url)
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleUpload(file)
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          uploadMutation.isPending && "opacity-50 pointer-events-none"
        )}
      >
        {uploadMutation.isPending ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Enviando...</span>
          </div>
        ) : value ? (
          <div className="relative">
            <img src={value} alt="Preview" className="max-h-32 mx-auto rounded" />
            <p className="text-xs text-muted-foreground mt-2">Clique para trocar</p>
          </div>
        ) : (
          <div className="text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{placeholder}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">ou</span>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cole uma URL de imagem"
          className="flex-1 text-sm"
        />
      </div>
    </div>
  )
}

