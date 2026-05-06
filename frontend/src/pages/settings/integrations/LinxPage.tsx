import { Link } from 'react-router-dom'
import { Database, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { IntegrationsPage } from '@/pages/integrations/Integrations'

/**
 * Linx (ERP) — fonte única pra configuração da integração com Linx.
 *
 * IMPORTANTE: hoje o backend ainda tem campos `linx_*` em `users`
 * (ProfileSettingsPage) e `tenants` (CompanySettingsPage) — UI única
 * aqui é um stepping stone. Refactor do backend pra consolidar esses
 * campos virá em sprint futura.
 *
 * Por enquanto, esta página:
 *   1. Mostra banner explicando os 2 níveis de config
 *   2. Linka pras pages corretas (Profile/Company)
 *   3. Renderiza a página de Integrations (filtrada/destacada Linx)
 *      pra ativar/desativar a integração no nível do tenant
 */
export function LinxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          Linx (ERP)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Integração com o Linx ERP — sincroniza pedidos, clientes e produtos.
        </p>
      </div>

      {/* Banner explicando estrutura atual */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Configuração em 2 níveis
          </CardTitle>
          <CardDescription>
            Linx tem credenciais no nível da empresa (chaves de API, ambiente)
            e mapeamento por usuário (vendedor_id, empresa_id, loja_id).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
            <div>
              <p className="font-medium">Credenciais da empresa</p>
              <p className="text-xs text-muted-foreground">
                subscription key, ambiente (PRODUCAO/HOMOLOGACAO).
              </p>
            </div>
            <Link to="/settings/company/details">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ir pra Empresa › Dados
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
            <div>
              <p className="font-medium">Mapeamento por usuário</p>
              <p className="text-xs text-muted-foreground">
                vendedor_id, empresa_id, loja_id, showroom_id pra cada user.
              </p>
            </div>
            <Link to="/settings/company/team">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ir pra Empresa › Equipe
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Hub de integrations (mostra Linx + outros) */}
      <div>
        <h3 className="text-base font-medium mb-2">
          Status e ativação
        </h3>
        <IntegrationsPage />
      </div>
    </div>
  )
}
