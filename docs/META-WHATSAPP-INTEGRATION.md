# Meta WhatsApp Cloud API Integration

Documentacao da integracao com WhatsApp Business API via Meta Cloud API, incluindo OAuth e Embedded Signup.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  MetaWhatsAppCard.tsx  ←→  useMetaIntegrations.ts               │
│         ↓                  useMetaEmbeddedSignup.ts             │
│  Facebook SDK (popup)                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  routes/meta.php  →  MetaAuthController.php                     │
│                           ↓                                      │
│  MetaOAuthService.php  ←→  MetaTokenService.php                 │
│  MetaMessageService.php    MetaTemplateService.php              │
│                           ↓                                      │
│              MetaIntegration (Model)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      META GRAPH API                              │
│  graph.facebook.com/v19.0                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos

### Backend (Laravel)

| Arquivo | Descricao |
|---------|-----------|
| `app/Modules/Meta/MetaServiceProvider.php` | Registra services e carrega rotas |
| `app/Modules/Meta/Controllers/MetaAuthController.php` | Controller principal (OAuth, CRUD, templates) |
| `app/Modules/Meta/Services/MetaOAuthService.php` | OAuth flow e Embedded Signup |
| `app/Modules/Meta/Services/MetaTokenService.php` | Renovacao automatica de tokens |
| `app/Modules/Meta/Services/MetaMessageService.php` | Envio de mensagens via API |
| `app/Modules/Meta/Services/MetaTemplateService.php` | CRUD de templates WhatsApp |
| `app/Modules/Meta/Jobs/RefreshMetaTokenJob.php` | Job diario para renovar tokens |
| `app/Models/MetaIntegration.php` | Model Eloquent com token criptografado |
| `app/Enums/MetaIntegrationStatusEnum.php` | Status: ACTIVE, EXPIRED, REAUTH_REQUIRED |
| `routes/meta.php` | Rotas da API Meta |
| `config/services.php` | Configuracoes (app_id, app_secret, config_id) |

### Frontend (React)

| Arquivo | Descricao |
|---------|-----------|
| `frontend/src/components/integrations/MetaWhatsAppCard.tsx` | Card de conexao WhatsApp |
| `frontend/src/hooks/useMetaIntegrations.ts` | Hooks para API (CRUD, status) |
| `frontend/src/hooks/useMetaEmbeddedSignup.ts` | Hook para Embedded Signup + Facebook SDK |

### Database

| Arquivo | Descricao |
|---------|-----------|
| `database/migrations/2026_01_08_233418_create_meta_integrations_table.php` | Tabela meta_integrations |

---

## Configuracao

### Variaveis de Ambiente (.env)

```env
# Meta WhatsApp Cloud API
META_APP_ID=2299534190553658
META_APP_SECRET=40405637f8ae4ae073380ca83e90d440
META_API_VERSION=v19.0
META_VERIFY_TOKEN=crm_meta_verify_token
META_REDIRECT_URI=https://crm.omnify.center/api/meta/callback
META_CONFIG_ID=1388207333035427
```

### Meta Developer Console

1. **App Settings > Basic**
   - App Domains: `crm.omnify.center`

2. **Facebook Login for Business > Settings**
   - Valid OAuth Redirect URIs: `https://crm.omnify.center/api/meta/callback`
   - Allowed Domains for JavaScript SDK: `crm.omnify.center`

3. **Facebook Login for Business > Configurations**
   - Criar configuracao com template "WhatsApp Embedded Signup"
   - Permissoes: `whatsapp_business_management`, `whatsapp_business_messaging`
   - Copiar Configuration ID para `META_CONFIG_ID`

---

## Fluxos

### 1. OAuth Tradicional (Redirect)

```
1. Usuario clica "Conectar WhatsApp"
2. GET /api/meta/connect
3. Redirect para facebook.com/v19.0/dialog/oauth
4. Usuario autoriza
5. Meta redireciona para /api/meta/callback?code=XXX&state=YYY
6. Backend troca code por token
7. Backend descobre WABA e phone_number_id
8. Cria MetaIntegration
9. Redirect para frontend com sucesso
```

### 2. Embedded Signup (Popup)

```
1. Usuario clica "Conectar WhatsApp"
2. Frontend carrega Facebook SDK
3. FB.login() abre popup
4. Usuario autoriza no popup
5. Popup retorna code via callback
6. Frontend POST /api/meta/embedded-signup {code}
7. Backend troca code por token
8. Backend descobre WABA e phone_number_id
9. Cria MetaIntegration
10. Frontend recebe resposta JSON
```

### 3. Renovacao Automatica de Token

```
1. RefreshMetaTokenJob roda diariamente as 03:00
2. Busca tokens que expiram em < 7 dias
3. Para cada token, chama fb_exchange_token
4. Atualiza expires_at no banco
5. Se falhar, marca como REAUTH_REQUIRED
```

---

## API Endpoints

### Autenticacao

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/meta/status` | Status da configuracao |
| GET | `/api/meta/connect` | Inicia OAuth (redirect) |
| GET | `/api/meta/callback` | Callback do OAuth |
| POST | `/api/meta/embedded-signup` | Callback do Embedded Signup |

### Integracoes

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/meta/integrations` | Lista integracoes do tenant |
| GET | `/api/meta/integrations/{id}` | Detalhes de uma integracao |
| DELETE | `/api/meta/integrations/{id}` | Remove integracao |
| POST | `/api/meta/integrations/{id}/refresh-token` | Renova token manualmente |

### Templates

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/meta/integrations/{id}/templates` | Lista templates |
| POST | `/api/meta/integrations/{id}/templates/sync` | Sincroniza templates da Meta |

---

## Model: MetaIntegration

```php
// Campos
id              // UUID
tenant_id       // UUID (foreign)
business_id     // Meta Business ID
waba_id         // WhatsApp Business Account ID
phone_number_id // Phone Number ID (indexed)
display_phone_number // Ex: +55 11 99999-9999
verified_name   // Nome verificado do business
access_token    // Token criptografado (encrypted cast)
expires_at      // Data de expiracao do token
status          // Enum: active, expired, reauth_required
scopes          // JSON array de permissoes
metadata        // JSON com dados extras
created_at
updated_at

// Metodos
isExpiringSoon()      // true se expira em < 7 dias
isExpired()           // true se ja expirou
needsReauth()         // true se precisa reautorizar
daysUntilExpiration() // dias ate expirar
isActive()            // true se status == ACTIVE

// Static
findActiveByPhoneNumberId($phoneNumberId) // Busca sem tenant scope (para webhook)
```

---

## Services

### MetaOAuthService

```php
// Metodos publicos
getAuthorizationUrl($tenantId)    // Gera URL OAuth
handleCallback($code, $state)     // Processa callback OAuth
processEmbeddedSignup($tenantId, $code, $wabaId, $phoneNumberId) // Embedded Signup
discoverAllPhoneNumbers($token)   // Lista todos os phones disponiveis
isConfigured()                    // Verifica se OAuth esta configurado
isEmbeddedSignupConfigured()      // Verifica se Embedded Signup esta configurado
getConfigId()                     // Retorna META_CONFIG_ID
```

### MetaTokenService

```php
// Metodos publicos
refreshToken($integration)        // Renova token de uma integracao
refreshExpiringTokens()           // Renova todos os tokens expirando
validateToken($integration)       // Valida se token ainda funciona
getTokenInfo($integration)        // Retorna info debug do token
isConfigured()                    // Verifica configuracao
```

### MetaMessageService

```php
// Metodos publicos
sendText($integration, $to, $text)
sendTemplate($integration, $to, $templateName, $components)
sendMedia($integration, $to, $mediaType, $mediaUrl, $caption)
sendVoiceNote($integration, $to, $audioUrl)
sendInteractiveButtons($integration, $to, $body, $buttons)
sendInteractiveList($integration, $to, $body, $sections)
sendReaction($integration, $to, $messageId, $emoji)
markAsRead($integration, $messageId)
uploadMedia($integration, $filePath, $mimeType)
```

### MetaTemplateService

```php
// Metodos publicos
list($integration, $status)       // Lista templates por status
listApproved($integration)        // Lista apenas aprovados
create($integration, $data)       // Cria template
update($integration, $templateId, $data)
delete($integration, $templateId)
sync($integration)                // Sincroniza com Meta
```

---

## Frontend Hooks

### useMetaIntegrations.ts

```typescript
// Hooks disponiveis
useMetaStatus()           // GET /api/meta/status
useMetaIntegrations()     // GET /api/meta/integrations
useConnectMeta()          // GET /api/meta/connect (redirect)
useDisconnectMeta()       // DELETE /api/meta/integrations/{id}
useRefreshMetaToken()     // POST /api/meta/integrations/{id}/refresh-token
useMetaTemplates(id)      // GET /api/meta/integrations/{id}/templates
useSyncMetaTemplates()    // POST /api/meta/integrations/{id}/templates/sync
```

### useMetaEmbeddedSignup.ts

```typescript
// Hooks disponiveis
useFacebookSDK(appId)     // Carrega Facebook SDK
useMetaEmbeddedSignup()   // Gerencia fluxo Embedded Signup

// Uso
const { isLoaded } = useFacebookSDK(appId)
const { startEmbeddedSignup, isProcessing } = useMetaEmbeddedSignup()

startEmbeddedSignup({ appId, configId })
```

---

## Webhook

O webhook existente em `app/Http/Controllers/MetaWebhookController.php` foi adaptado para:

1. Primeiro buscar `MetaIntegration` por `phone_number_id`
2. Se encontrar, usar novo sistema
3. Se nao encontrar, fallback para sistema legado (`Channel`)

```php
// MetaWebhookController.php
protected function handleWhatsApp(array $payload): JsonResponse
{
    $phoneNumberId = $payload['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'];

    // 1. Tenta MetaIntegration (novo)
    $metaIntegration = MetaIntegration::findActiveByPhoneNumberId($phoneNumberId);
    if ($metaIntegration) {
        return $this->processWithMetaIntegration($payload, $metaIntegration);
    }

    // 2. Fallback: Channel (legado)
    // ...
}
```

---

## Scheduler

O job de renovacao de tokens esta configurado em `routes/console.php`:

```php
use App\Modules\Meta\Jobs\RefreshMetaTokenJob;

Schedule::job(new RefreshMetaTokenJob)
    ->dailyAt('03:00')
    ->withoutOverlapping();
```

---

## Troubleshooting

### "Configuracao necessaria" no card

- Verificar se `META_APP_ID` e `META_APP_SECRET` estao no `.env`
- Rodar `php artisan config:cache`

### Popup nao abre (Embedded Signup)

- Verificar se `META_CONFIG_ID` esta configurado
- Verificar se dominio esta em "Allowed Domains for JavaScript SDK"
- Verificar console do browser para erros do SDK

### "Nao e possivel carregar a URL"

- Adicionar dominio em "App Domains" no Meta App
- Adicionar redirect URI em "Valid OAuth Redirect URIs"

### Token expirando

- O job roda automaticamente as 03:00
- Para renovar manualmente: POST `/api/meta/integrations/{id}/refresh-token`
- Se falhar, usuario precisa reconectar

---

## Referencias

- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/reference)
