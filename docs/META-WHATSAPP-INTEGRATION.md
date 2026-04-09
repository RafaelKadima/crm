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
| `app/Modules/Meta/Services/MetaProfileService.php` | Gerenciamento de perfil WhatsApp Business |
| `app/Modules/Meta/Jobs/RefreshMetaTokenJob.php` | Job diario para renovar tokens |
| `app/Models/MetaIntegration.php` | Model Eloquent com token criptografado |
| `app/Enums/MetaIntegrationStatusEnum.php` | Status: ACTIVE, EXPIRED, REAUTH_REQUIRED |
| `routes/meta.php` | Rotas da API Meta |
| `config/services.php` | Configuracoes (app_id, app_secret, config_id) |

### Frontend (React)

| Arquivo | Descricao |
|---------|-----------|
| `frontend/src/components/integrations/MetaWhatsAppCard.tsx` | Card de conexao WhatsApp |
| `frontend/src/components/integrations/WhatsAppProfileEditor.tsx` | Modal para editar perfil do WhatsApp |
| `frontend/src/hooks/useMetaIntegrations.ts` | Hooks para API (CRUD, status) |
| `frontend/src/hooks/useMetaEmbeddedSignup.ts` | Hook para Embedded Signup + Facebook SDK |
| `frontend/src/hooks/useMetaProfile.ts` | Hooks para edicao de perfil WhatsApp Business |

### Database

| Arquivo | Descricao |
|---------|-----------|
| `database/migrations/2026_01_08_233418_create_meta_integrations_table.php` | Tabela meta_integrations |

---

## Configuracao

### Variaveis de Ambiente (.env)

```env
# Meta WhatsApp Cloud API
# App "antigo" usado para OAuth tradicional (nao mexer se ja em uso)
META_APP_ID=2299534190553658
META_APP_SECRET=40405637f8ae4ae073380ca83e90d440
META_API_VERSION=v24.0
META_VERIFY_TOKEN=crm_omnify_webhook_verify_2024
META_REDIRECT_URI=https://crm.omnify.center/api/meta/callback

# Embedded Signup (app dedicado a coexistencia/onboarding via popup)
# CRITICO: o META_CONFIG_ID precisa pertencer ao META_EMBEDDED_APP_ID,
# senao o popup do Facebook retorna "Recurso indisponivel"
META_CONFIG_ID=1704805793989081
META_EMBEDDED_APP_ID=1404825308002840
META_EMBEDDED_APP_SECRET=40f5a27f7f8370f92a89204cb7d88bc3
```

> **REGRA DE OURO:** sempre que adicionar/trocar variaveis META no `.env`,
> rodar `docker compose exec -T php php artisan config:clear && config:cache`
> e `docker compose restart php` (para limpar OPcache). Sem isso o backend
> continua servindo os valores antigos do `bootstrap/cache/config.php`.

### Por que dois apps?

- **App OAuth tradicional** (`META_APP_ID`): usado quando o cliente ja tem
  uma WABA propria e cola token manualmente (legado).
- **App Embedded Signup** (`META_EMBEDDED_APP_ID`): usado pelo `FB.login()`
  popup do fluxo Embedded Signup. Tem `Configuration ID` separado, permissoes
  especificas, e e o app que aparece como subscriber nos webhooks da WABA.

O `services.php` faz fallback de `embedded_app_id` para `app_id` quando a
variavel nao existe — mas em producao SEMPRE defina os dois separados.

### Meta Developer Console

1. **App Settings > Basic** (no app `META_EMBEDDED_APP_ID`)
   - App Domains: `crm.omnify.center`
   - App Mode: **Live** (em Development so admins/testers conseguem logar)

2. **Facebook Login for Business > Settings**
   - Valid OAuth Redirect URIs: `https://crm.omnify.center/api/meta/callback`
   - Allowed Domains for JavaScript SDK: `crm.omnify.center`

3. **Facebook Login for Business > Configurations**
   - Criar configuracao com template "WhatsApp Embedded Signup"
   - Permissoes: `whatsapp_business_management`, `whatsapp_business_messaging`
   - Copiar Configuration ID para `META_CONFIG_ID`
   - **Para suportar coexistencia:** marcar a opcao
     `whatsapp_business_app_onboarding` na configuracao

4. **Webhook (WhatsApp > Configuration)**
   - Callback URL: `https://crm.omnify.center/api/webhooks/whatsapp`
   - Verify Token: igual ao `META_VERIFY_TOKEN` do `.env`
   - Campos assinados: `messages`, `account_alerts`, `account_review_update`,
     `account_settings_update` (todos)
   - Webhook fields version: `v25.0` (independente da `META_API_VERSION`)

5. **Business Verification**
   - O Business Manager dono do app PRECISA estar Verificado para conectar
     mais de 1-2 numeros em coexistencia. Verificar em
     `business.facebook.com/settings/security`.

---

## Fluxos

### 1. OAuth Tradicional (Redirect)

```
1. Usuario clica "Conectar WhatsApp"
2. GET /api/meta/connect
3. Redirect para facebook.com/vXX.X/dialog/oauth
4. Usuario autoriza
5. Meta redireciona para /api/meta/callback?code=XXX&state=YYY
6. Backend troca code por token
7. Backend descobre WABA e phone_number_id
8. Cria MetaIntegration
9. >>> POST {WABA_ID}/subscribed_apps (CRITICO - sem isso webhook nao chega)
10. Redirect para frontend com sucesso
```

### 2. Embedded Signup (Popup)

```
1. Usuario clica "Conectar WhatsApp"
2. Frontend carrega Facebook SDK com META_EMBEDDED_APP_ID
3. FB.login({config_id}, {extras: {sessionInfoVersion: '3', setup: {} }})
4. Popup abre em facebook.com/vXX.X/dialog/oauth?app_id=EMBEDDED_APP_ID
5. Usuario autoriza no popup
6. Popup retorna code (ou access_token) via callback
7. Frontend POST /api/meta/embedded-signup { code | access_token, waba_id, phone_number_id, is_coexistence }
8. Backend troca code por token usando META_EMBEDDED_APP_ID/SECRET
9. Backend exchange para long-lived token (60+ dias)
10. Backend descobre WABA e phone_number_id (se nao recebeu)
11. Cria MetaIntegration
12. >>> POST {WABA_ID}/subscribed_apps (CRITICO - automatico desde caecec1)
13. Auto-cria Channel WhatsApp ligado ao phone_number_id
14. Frontend recebe resposta JSON
```

**Coexistencia (`is_coexistence: true`):**

- O `extras` do `FB.login()` deve enviar `featureType: 'whatsapp_business_app_onboarding'`
  e **OMITIR** `setup` (passar `setup: {}` ou objeto preenchido faz a Meta rejeitar)
- O numero precisa estar ativo no WhatsApp Business App ha pelo menos **7 dias**
- Em coexistencia, a Meta pode criar um `phone_number_id` "shadow" diferente do
  ID original do WhatsApp Business App. O webhook chega com o ID que esta na
  WABA — sempre o mesmo que o `discoverWhatsAppBusiness()` retorna, entao bate.

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

### Perfil do WhatsApp Business

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/meta/integrations/{id}/profile` | Obtem perfil atual |
| PUT | `/api/meta/integrations/{id}/profile` | Atualiza perfil |
| POST | `/api/meta/integrations/{id}/profile/photo` | Upload de foto de perfil |
| GET | `/api/meta/profile/categories` | Lista categorias de negocio disponiveis |

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
handleCallback($code, $state)     // Processa callback OAuth (chama subscribeAppToWaba)
processEmbeddedSignup($tenantId, $code, $wabaId, $phoneNumberId, $isCoexistence, $pageUrl)
processEmbeddedSignupWithToken($tenantId, $accessToken, $wabaId, $phoneNumberId, $isCoexistence)
subscribeAppToWaba($wabaId, $accessToken)  // POST {WABA}/subscribed_apps
discoverWhatsAppBusiness($token)  // Descobre WABA + phone_number_id automaticamente
isConfigured()                    // Verifica se OAuth esta configurado
isEmbeddedSignupConfigured()      // Verifica se Embedded Signup esta configurado
getConfigId()                     // Retorna META_CONFIG_ID
```

> **`subscribeAppToWaba()`** e chamado automaticamente nas 3 funcoes de signup
> (`handleCallback`, `processEmbeddedSignup`, `processEmbeddedSignupWithToken`).
> Sem essa chamada, a Meta nao envia webhook nenhum para a WABA recem-conectada.
> O metodo loga warning em vez de lancar exception se falhar — assim o signup
> nao quebra por causa de erro transiente do Graph API.

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

### MetaProfileService

```php
// Metodos publicos
getProfile($integration)          // Obtem perfil do WhatsApp Business
updateProfile($integration, $data)// Atualiza perfil (about, address, description, email, websites, vertical)
uploadProfilePhoto($integration, $filePath) // Upload de foto de perfil via arquivo
uploadProfilePhotoFromBase64($integration, $base64, $mimeType) // Upload via base64
getAvailableCategories()          // Lista categorias de negocio disponiveis

// Campos editaveis do perfil:
// - about: string (max 139 chars) - Status/sobre
// - address: string (max 256 chars) - Endereco
// - description: string (max 512 chars) - Descricao do negocio
// - email: string (max 128 chars) - Email de contato
// - websites: array (max 2 URLs) - Sites do negocio
// - vertical: string - Categoria do negocio
// - profile_picture_handle: string - Handle da foto (obtido via upload)
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

### useMetaProfile.ts

```typescript
// Hooks disponiveis
useMetaProfile(integrationId)       // GET perfil
useUpdateMetaProfile()              // PUT atualizar perfil
useUploadMetaProfilePhoto()         // POST upload foto via File
useUploadMetaProfilePhotoBase64()   // POST upload foto via base64
useMetaProfileCategories()          // GET categorias disponiveis

// Uso
const { data: profile, isLoading } = useMetaProfile(integrationId)
const updateMutation = useUpdateMetaProfile()
const uploadMutation = useUploadMetaProfilePhoto()

// Atualizar perfil
updateMutation.mutate({
  integrationId,
  data: { about: 'Novo status', email: 'novo@email.com' }
})

// Upload de foto
uploadMutation.mutate({
  integrationId,
  file: selectedFile
})
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

### Checklist rapido pos-deploy

Sempre que fizer deploy de mudanca relacionada a Meta:

```bash
# Na VPS
cd /var/www/crm
git pull origin main

# Se mudou algo no frontend (hooks, components):
cd frontend && npm install --legacy-peer-deps && npm run build && cd ..

# SEMPRE rodar apos qualquer mudanca em config/services.php ou .env:
docker compose exec -T php php artisan config:clear
docker compose exec -T php php artisan config:cache
docker compose restart php   # mata OPcache

# Verificar config carregada (deve mostrar embedded_app_id correto):
docker compose exec -T php php -r 'print_r((require "/var/www/crm/bootstrap/cache/config.php")["services"]["meta"]);'

# Verificar saude:
curl -sI https://crm.omnify.center/ | head -3   # deve dar HTTP 200
```

---

### Popup do Facebook mostra "Recurso indisponivel"

**Causa #1 (mais comum) — `app_id` no popup nao bate com o `config_id`**

O popup do `FB.login()` usa o `app_id` retornado pelo backend em
`/api/meta/status`. Se o `META_EMBEDDED_APP_ID` no `.env` estiver ausente
ou apontando pro app errado, a Meta abre o popup com credenciais que nao
contem o `META_CONFIG_ID` esperado.

**Como diagnosticar:**

1. Abrir DevTools (F12) > Network > recarregar pagina
2. Procurar a chamada `GET /api/meta/status` > aba Response
3. O JSON deve ter `app_id` IGUAL ao `META_EMBEDDED_APP_ID` do `.env`
4. Quando o popup abrir, a URL dele deve ser
   `facebook.com/vXX.X/dialog/oauth?app_id=<MESMO_APP_ID>&...`

Se nao baterem:

```bash
# Verificar variavel no .env
grep META_EMBEDDED_APP_ID /var/www/crm/.env

# Verificar o que o config carrega
docker compose exec -T php php -r 'echo config("services.meta.embedded_app_id");'

# Forcar reload
docker compose exec -T php php artisan config:clear
docker compose exec -T php php artisan config:cache
docker compose restart php
```

**Causa #2 — `config/services.php` desatualizado na VPS**

Se as chaves `embedded_app_id` / `embedded_app_secret` nao existem no
`config/services.php`, o backend usa `services.meta.app_id` (legacy) e o
popup abre com o app errado. Verificar:

```bash
grep -A2 "embedded_app_id" /var/www/crm/config/services.php
```

Tem que ter:
```php
'embedded_app_id' => env('META_EMBEDDED_APP_ID', env('META_APP_ID')),
'embedded_app_secret' => env('META_EMBEDDED_APP_SECRET', env('META_APP_SECRET')),
```

**Causa #3 — `extras` do FB.login com formato errado**

O `useMetaEmbeddedSignup.ts` deve enviar (e nao mais nada):

```js
// Padrao (numero novo)
extras: { sessionInfoVersion: '3', setup: {} }

// Coexistencia
extras: { sessionInfoVersion: '3', featureType: 'whatsapp_business_app_onboarding' }
```

**NUNCA** mandar:
- `version: 'v3'` (errado, nao existe)
- `setup` com objetos preenchidos com `null` (Meta rejeita)
- `setup` em coexistencia (Meta rejeita)

**Causa #4 — App em modo Development**

App nao publicado: so admins/testers conseguem logar. Solucao:
Meta Developer Console > Settings > Basic > **App Mode: Live**.

**Causa #5 — Business Manager nao verificado**

BM nao verificado tem limites baixos (1-2 numeros em coexistencia). Verificar:
`business.facebook.com/settings/security` > "Verificacao da empresa".

---

### Mensagens nao chegam apos conectar (webhook silencioso)

**Esse e o bug mais perigoso porque a UI mostra tudo verde mas nada funciona.**

**Causa raiz:** a WABA nao tem nenhum app inscrito para receber webhooks
(`POST /{WABA_ID}/subscribed_apps` nao foi chamado).

Desde o commit `caecec1`, isso e feito automaticamente em todo signup. Mas
se alguma WABA antiga ficou sem subscribe, ou o subscribe falhou silenciosamente,
nenhuma mensagem chega.

**Diagnostico:**

```bash
# 1. Ver se webhook esta chegando (provavel: NAO esta)
grep -a "$(date +%Y-%m-%d)" /var/www/crm/storage/logs/laravel.log | grep -i webhook | tail -10

# 2. Verificar quais apps estao subscritos numa WABA especifica
docker compose exec -T php php artisan tinker --execute="
\$i = \App\Models\MetaIntegration::where('display_phone_number', '+55 22 99226-4211')->first();
\$resp = file_get_contents('https://graph.facebook.com/v24.0/' . \$i->waba_id . '/subscribed_apps?access_token=' . \$i->access_token);
echo \$resp;
"
# Se retornar {"data":[]} a WABA nao tem subscriber e essa e a causa
```

**Solucao manual (re-subscribe):**

```bash
docker compose exec -T php php artisan tinker
# Dentro do tinker:
$svc = app(\App\Modules\Meta\Services\MetaOAuthService::class);
$i = \App\Models\MetaIntegration::where('display_phone_number', '+55 22 99226-4211')->first();
$svc->subscribeAppToWaba($i->waba_id, $i->access_token);
# Retorna true se ok
```

Ou para subscrever TODAS as integracoes ativas:

```bash
docker compose exec -T php php artisan tinker --execute="
\$svc = app(\App\Modules\Meta\Services\MetaOAuthService::class);
foreach (\App\Models\MetaIntegration::withoutGlobalScopes()->get() as \$i) {
    echo \$i->display_phone_number . ': ';
    echo \$svc->subscribeAppToWaba(\$i->waba_id, \$i->access_token) ? 'OK' : 'FAIL';
    echo PHP_EOL;
}
"
```

---

### "channel not found" nos logs

Webhook esta chegando mas nao acha o `Channel` correspondente.

**Causa:** o `phone_number_id` no payload nao bate com nenhum
`channels.config->phone_number_id` no banco.

**Diagnostico:**

```bash
# Pegar phone_number_id que esta chegando no webhook
grep "channel not found" /var/www/crm/storage/logs/laravel.log | tail -5

# Ver canais existentes
docker compose exec -T php php artisan tinker --execute="
foreach (\App\Models\Channel::where('type', 'whatsapp')->get() as \$c) {
    echo \$c->name . ' | ' . (\$c->config['phone_number_id'] ?? 'null') . PHP_EOL;
}
"
```

Se o `phone_number_id` do webhook nao existe em nenhum channel, alguem
deletou o channel mas a WABA continua subscrita. Solucoes:
1. Reconectar o numero no CRM (cria novo channel)
2. Ou unsubscribe da WABA orfa via Graph API

---

### "Configuracao necessaria" no card

- Verificar se `META_APP_ID` e `META_APP_SECRET` estao no `.env`
- Verificar se `META_EMBEDDED_APP_ID` esta no `.env` (se for usar Embedded Signup)
- Rodar `php artisan config:clear && config:cache`
- Restartar PHP container para limpar OPcache

---

### "Class env does not exist" / 500 generico apos editar services.php

**Nao usar `throw new ...` dentro de `env()` em `config/services.php`.**

Codigos como:
```php
'verify_token' => env('META_VERIFY_TOKEN') ?: (app()->environment('production') ? throw new \RuntimeException(...) : 'fallback'),
```

quebram porque o Laravel chama `app()->environment()` durante o boot do
config, antes do container ter o binding `env` resolvido. Resultado: 500
em **todas** as rotas, incluindo as que nem leem essa config.

Usar sempre fallback simples:
```php
'verify_token' => env('META_VERIFY_TOKEN', 'fallback_value'),
```

Se quebrar e o site ficar 500, rollback rapido:
```bash
cd /var/www/crm
git checkout HEAD~1 -- config/services.php
docker compose exec -T php php artisan config:clear
docker compose exec -T php php artisan config:cache
```

---

### Token expirando

- O job roda automaticamente as 03:00
- Para renovar manualmente: POST `/api/meta/integrations/{id}/refresh-token`
- Se falhar, usuario precisa reconectar

---

## Historico de Bugs Corrigidos (2026-04-09)

Sessao de debugging que descobriu 4 bugs encadeados — registrar aqui pra
nao repetir os mesmos erros.

### Bug 1 — `FB.login` extras com formato errado (commit `86c3246`)

**Sintoma:** popup do Facebook abria mas mostrava "Recurso indisponivel".

**Causa:** o codigo enviava `extras: { version: 'v3', setup: { business: { id: null, ... } } }`.
A Meta espera `sessionInfoVersion: '3'` (nao `version: 'v3'`) e rejeita
qualquer `setup` com campos `null` preenchidos.

**Fix:** [useMetaEmbeddedSignup.ts](frontend/src/hooks/useMetaEmbeddedSignup.ts) — passar apenas
`{ sessionInfoVersion: '3', setup: {} }` ou (em coexistencia)
`{ sessionInfoVersion: '3', featureType: 'whatsapp_business_app_onboarding' }`.

### Bug 2 — `embedded_app_id` ausente em config/services.php (commit `22bca2d` + `6196ff2`)

**Sintoma:** mesmo apos o Bug 1 corrigido, o popup continuava com "Recurso
indisponivel". A URL do popup mostrava `app_id=2299534190553658` (app antigo)
mas o `META_CONFIG_ID` so existia no app `1404825308002840`.

**Causa:** o arquivo `config/services.php` na VPS nao tinha as chaves
`embedded_app_id` e `embedded_app_secret`. O `MetaAuthController::status()`
faz `config('services.meta.embedded_app_id', config('services.meta.app_id'))` —
sem a chave, caia no fallback retornando o app legacy.

Pior: o arquivo local tinha as chaves, mas estavam **modificadas e nao
commitadas** ha varias semanas. Por isso o GitHub e a VPS estavam desatualizados.

**Fix:** commitar `config/services.php` com as chaves embedded.

**Subbug que descobrimos:** uma das mudancas locais nao commitadas era
`'verify_token' => env('META_VERIFY_TOKEN') ?: (app()->environment('production') ? throw new \RuntimeException(...) : ...)`.
Esse `throw` dentro de `env()` quebra durante config:cache porque Laravel
chama `app()->environment()` antes do binding `env` existir, gerando
"Target class [env] does not exist" e derrubando o site inteiro. Revertido
no commit `6196ff2`.

### Bug 3 — `metadata.app_id` salvava o app errado (commit `caecec1`)

**Sintoma:** integracoes salvavam `metadata: {"app_id": "2299534190553658"}`
mesmo quando o signup era do app `1404825308002840`. Confundia debug.

**Causa:** `processEmbeddedSignup` e `processEmbeddedSignupWithToken`
gravavam `'app_id' => $this->appId` em vez de `$this->embeddedAppId`.

**Fix:** trocar para `$this->embeddedAppId` nas duas funcoes.

### Bug 4 — `subscribed_apps` nunca era chamado (commit `caecec1`) **CRITICO**

**Sintoma:** numero conectava com sucesso, UI mostrava verde, channel
auto-criado, mas **nenhuma mensagem chegava no CRM**. Logs do Laravel
nao mostravam webhook nenhum daquela WABA.

**Causa raiz:** o codigo nunca chamava
`POST /{WABA_ID}/subscribed_apps` apos o signup. Sem essa chamada, a Meta
**nao envia webhook** para o app, mesmo com tudo configurado corretamente
no Developer Console (callback URL, verify token, fields assinados).

A `WABA.subscribed_apps` retornava `{"data":[]}` para todas as WABAs
recem-conectadas via Embedded Signup. Numeros antigos so funcionavam por
sorte — alguem deve ter rodado o subscribe manualmente em algum momento.

**Fix:** adicionado metodo `subscribeAppToWaba()` em `MetaOAuthService` e
chamado nas 3 funcoes de signup (`handleCallback`, `processEmbeddedSignup`,
`processEmbeddedSignupWithToken`) logo apos salvar a integracao.

**Para WABAs antigas que ficaram sem subscribe:** ver secao "Mensagens nao
chegam apos conectar" no Troubleshooting.

---

## Referencias

- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Embedded Signup](https://developers.facebook.com/docs/whatsapp/embedded-signup)
- [Embedded Signup — subscribed_apps step](https://developers.facebook.com/docs/whatsapp/embedded-signup/steps#step-3)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/reference)
- [WABA subscribed_apps endpoint](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/subscribed_apps)
