import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { 
  Palette, 
  Type, 
  Image, 
  Video, 
  Star, 
  HelpCircle,
  Layout,
  MousePointer,
  Clock,
  Minus,
  Package,
  FileText,
  Sparkles,
  Target,
  Columns,
  Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AVAILABLE_BLOCKS, type BlockType } from '@/types/landing-page-builder'

const blockIcons: Record<BlockType, React.ReactNode> = {
  header: <Layout className="h-5 w-5" />,
  hero: <Sparkles className="h-5 w-5" />,
  products: <Package className="h-5 w-5" />,
  form: <FileText className="h-5 w-5" />,
  testimonials: <Star className="h-5 w-5" />,
  faq: <HelpCircle className="h-5 w-5" />,
  text: <Type className="h-5 w-5" />,
  image: <Image className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  gallery: <Image className="h-5 w-5" />,
  countdown: <Clock className="h-5 w-5" />,
  features: <Sparkles className="h-5 w-5" />,
  cta: <Target className="h-5 w-5" />,
  divider: <Minus className="h-5 w-5" />,
  footer: <Layout className="h-5 w-5" />,
  columns: <Columns className="h-5 w-5" />,
  section: <Square className="h-5 w-5" />,
}

interface DraggableBlockProps {
  type: BlockType
  label: string
  description: string
  isRequired?: boolean
  isUsed?: boolean
}

function DraggableBlock({ type, label, description, isRequired, isUsed }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-${type}`,
    data: { type, isNew: true },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all",
        isDragging && "opacity-50 scale-95",
        isRequired && "border-green-500/30 bg-green-500/5",
        isUsed && isRequired && "opacity-50 cursor-not-allowed",
        !isRequired && "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isRequired ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
        )}>
          {blockIcons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {isRequired && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500 text-white">
                Obrigatório
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
    </div>
  )
}

interface BlocksSidebarProps {
  usedBlocks: BlockType[]
}

export function BlocksSidebar({ usedBlocks }: BlocksSidebarProps) {
  // Separar blocos obrigatórios dos opcionais
  const requiredBlocks = AVAILABLE_BLOCKS.filter(b => b.isRequired)
  const optionalBlocks = AVAILABLE_BLOCKS.filter(b => !b.isRequired)

  return (
    <div className="w-72 bg-background border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Blocos
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para adicionar à página
        </p>
      </div>

      {/* Blocks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Required Blocks */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Obrigatórios
          </h4>
          <div className="space-y-2">
            {requiredBlocks.map((block) => (
              <DraggableBlock
                key={block.type}
                type={block.type}
                label={block.label}
                description={block.description}
                isRequired={true}
                isUsed={usedBlocks.includes(block.type)}
              />
            ))}
          </div>
        </div>

        {/* Optional Blocks */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Opcionais
          </h4>
          <div className="space-y-2">
            {optionalBlocks.map((block) => (
              <DraggableBlock
                key={block.type}
                type={block.type}
                label={block.label}
                description={block.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

