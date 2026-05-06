import { Instagram, Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

/**
 * Placeholder — Instagram Direct compartilha o webhook Meta unificado
 * (Sprint 1 backend já cobre HMAC). UI específica de gerenciamento de
 * conta IG fica diferida pra sprint futura.
 */
export function InstagramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Instagram className="h-5 w-5 text-muted-foreground" />
          Instagram Direct
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Atendimento via Instagram Direct Messages, integrado pelo mesmo
          OAuth da Meta.
        </p>
      </div>

      <Card>
        <CardContent className="px-6 py-12 text-center">
          <Construction className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-3">
            Em breve. Backend já está preparado (webhook Meta unificado processa
            tanto WhatsApp quanto Instagram). UI de gerenciamento específica
            será adicionada numa próxima sprint.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            Por enquanto, conexões de IG são feitas via OAuth Meta no painel
            Business.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
