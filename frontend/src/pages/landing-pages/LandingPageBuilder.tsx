import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Save,
  Eye,
  Loader2,
  Smartphone,
  Monitor,
  Tablet,
  Undo,
  Redo,
  ExternalLink,
  Rocket,
  CheckCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BlocksSidebar } from '@/components/landing-builder/BlocksSidebar'
import { BlockPreview } from '@/components/landing-builder/BlockPreview'
import { BlockSettings } from '@/components/landing-builder/BlockSettings'
import { useLandingPage, useUpdateLandingPage } from '@/hooks/useLandingPages'
import { cn } from '@/lib/utils'
import { 
  AVAILABLE_BLOCKS,
  DEFAULT_GLOBAL_SETTINGS,
  type Block, 
  type BlockType, 
  type GlobalSettings,
} from '@/types/landing-page-builder'

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

export function LandingPageBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: landingPage, isLoading } = useLandingPage(id || '')
  const updateMutation = useUpdateLandingPage()

  const [blocks, setBlocks] = useState<Block[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#22C55E',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter',
    borderRadius: 'medium',
    spacing: 'normal',
  })
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Carregar dados da landing page
  useEffect(() => {
    if (landingPage) {
      if (landingPage.blocks && landingPage.blocks.length > 0) {
        setBlocks(landingPage.blocks)
      } else {
        // Blocos padrão se não tiver nenhum
        setBlocks([
          {
            id: 'default-hero',
            type: 'hero',
            order: 0,
            settings: {
              title: landingPage.title || 'Bem-vindo',
              subtitle: landingPage.description || '',
              backgroundType: 'gradient',
              gradientFrom: landingPage.primary_color || '#3B82F6',
              gradientTo: landingPage.secondary_color || '#8B5CF6',
              textColor: '#ffffff',
              ctaText: landingPage.cta_text || 'Ver produtos',
              ctaColor: '#22C55E',
              alignment: 'center',
              height: 'medium',
            },
          },
          {
            id: 'default-products',
            type: 'products',
            order: 1,
            isRequired: true,
            settings: {
              title: 'Nossos Produtos',
              subtitle: 'Escolha o produto de seu interesse',
              columns: 3,
              showDescription: true,
              cardStyle: 'shadow',
              backgroundColor: '#f9fafb',
            },
          },
          {
            id: 'default-form',
            type: 'form',
            order: 2,
            isRequired: true,
            settings: {
              title: 'Tenho interesse!',
              subtitle: 'Preencha seus dados',
              buttonText: 'Enviar',
              buttonColor: '#22C55E',
              fields: [
                { name: 'name', label: 'Nome', type: 'text', required: true },
                { name: 'phone', label: 'WhatsApp', type: 'phone', required: true },
                { name: 'email', label: 'E-mail', type: 'email', required: false },
              ],
              backgroundColor: '#ffffff',
              style: 'card',
            },
          },
        ])
      }

      if (landingPage.global_settings) {
        setGlobalSettings(landingPage.global_settings)
      } else {
        setGlobalSettings({
          primaryColor: landingPage.primary_color || '#3B82F6',
          secondaryColor: landingPage.secondary_color || '#8B5CF6',
          accentColor: '#22C55E',
          backgroundColor: '#ffffff',
          textColor: landingPage.text_color || '#1f2937',
          fontFamily: 'Inter',
          borderRadius: 'medium',
          spacing: 'normal',
        })
      }
    }
  }, [landingPage])

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null
  const usedBlocks = blocks.map(b => b.type)

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    // Se é um novo bloco sendo adicionado da sidebar
    if (String(active.id).startsWith('new-')) {
      const type = String(active.id).replace('new-', '') as BlockType
      
      // Verificar se bloco obrigatório já existe
      const isRequired = type === 'products' || type === 'form'
      if (isRequired && usedBlocks.includes(type)) {
        return // Não adicionar duplicado
      }

      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type,
        order: blocks.length,
        isRequired,
        settings: getDefaultSettings(type),
      }

      // Encontrar posição do over
      const overIndex = blocks.findIndex(b => b.id === over.id)
      const newBlocks = [...blocks]
      
      if (overIndex >= 0) {
        newBlocks.splice(overIndex, 0, newBlock)
      } else {
        newBlocks.push(newBlock)
      }

      // Reordenar
      newBlocks.forEach((b, i) => b.order = i)
      setBlocks(newBlocks)
      setSelectedBlockId(newBlock.id)
    } else {
      // Reordenando blocos existentes
      if (active.id !== over.id) {
        const oldIndex = blocks.findIndex(b => b.id === active.id)
        const newIndex = blocks.findIndex(b => b.id === over.id)
        
        const newBlocks = arrayMove(blocks, oldIndex, newIndex)
        newBlocks.forEach((b, i) => b.order = i)
        setBlocks(newBlocks)
      }
    }
  }

  const getDefaultSettings = (type: BlockType): any => {
    const blockDef = AVAILABLE_BLOCKS.find((b) => b.type === type)
    return blockDef?.defaultSettings || {}
  }

  // Block actions
  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId))
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const handleDuplicateBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (block && !block.isRequired) {
      const newBlock: Block = {
        ...block,
        id: `block-${Date.now()}`,
        order: block.order + 1,
      }
      const index = blocks.findIndex(b => b.id === blockId)
      const newBlocks = [...blocks]
      newBlocks.splice(index + 1, 0, newBlock)
      newBlocks.forEach((b, i) => b.order = i)
      setBlocks(newBlocks)
    }
  }

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newBlocks = arrayMove(blocks, index, newIndex)
    newBlocks.forEach((b, i) => b.order = i)
    setBlocks(newBlocks)
  }

  const handleUpdateBlockSettings = (settings: any) => {
    if (!selectedBlockId) return
    setBlocks(blocks.map(b =>
      b.id === selectedBlockId ? { ...b, settings } : b
    ))
  }

  // Show notification helper
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  // Save
  const handleSave = async () => {
    if (!id) return
    
    setIsSaving(true)
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          blocks,
          global_settings: globalSettings,
          primary_color: globalSettings.primaryColor,
          secondary_color: globalSettings.secondaryColor,
          text_color: globalSettings.textColor,
        },
      })
      showNotification('success', 'Landing page salva com sucesso!')
    } catch (error) {
      console.error('Error saving:', error)
      showNotification('error', 'Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={cn(
              "fixed top-4 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
              notification.type === 'success' 
                ? "bg-green-500 text-white" 
                : "bg-red-500 text-white"
            )}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-80"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-14 bg-background border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/landing-pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold truncate max-w-[200px]">
            {landingPage?.name || 'Landing Page'}
          </h1>
        </div>

        {/* Viewport Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewport('desktop')}
            className={cn(
              "p-2 rounded transition-colors",
              viewport === 'desktop' ? "bg-background shadow" : "hover:bg-background/50"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={cn(
              "p-2 rounded transition-colors",
              viewport === 'tablet' ? "bg-background shadow" : "hover:bg-background/50"
            )}
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={cn(
              "p-2 rounded transition-colors",
              viewport === 'mobile' ? "bg-background shadow" : "hover:bg-background/50"
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/lp/${landingPage?.slug}`, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Blocks Sidebar */}
          <BlocksSidebar usedBlocks={usedBlocks} />

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className={cn(
                "mx-auto bg-background rounded-lg shadow-lg min-h-full transition-all",
                viewport === 'desktop' && "max-w-full",
                viewport === 'tablet' && "max-w-[768px]",
                viewport === 'mobile' && "max-w-[375px]"
              )}
            >
              <SortableContext
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="p-4 space-y-4">
                  {blocks.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                      <p className="text-lg font-medium mb-2">Comece a criar sua landing page</p>
                      <p className="text-sm">Arraste os blocos da sidebar para cá</p>
                    </div>
                  ) : (
                    blocks
                      .sort((a, b) => a.order - b.order)
                      .map((block, index) => (
                        <BlockPreview
                          key={block.id}
                          block={block}
                          globalSettings={globalSettings}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onDuplicate={() => handleDuplicateBlock(block.id)}
                          onMoveUp={() => handleMoveBlock(block.id, 'up')}
                          onMoveDown={() => handleMoveBlock(block.id, 'down')}
                          isFirst={index === 0}
                          isLast={index === blocks.length - 1}
                        />
                      ))
                  )}
                </div>
              </SortableContext>
            </div>
          </div>

          {/* Settings Panel */}
          <BlockSettings
            block={selectedBlock}
            globalSettings={globalSettings}
            onUpdateBlock={handleUpdateBlockSettings}
            onUpdateGlobal={setGlobalSettings}
            onClose={() => setSelectedBlockId(null)}
          />
        </DndContext>
      </div>
    </div>
  )
}

