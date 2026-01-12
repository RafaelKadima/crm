# WhatsApp API - Whatsmeow

API REST para WhatsApp multi-sessão usando Whatsmeow.

## 🚀 Setup

### 1. Configurar ambiente

```bash
cp .env.example .env
# Editar .env com suas configurações
```

### 2. Rodar com Docker

```bash
# Se usar mesma network do Laravel
docker-compose up -d

# Ou criar network separada
docker network create app-network
docker-compose up -d
```

### 3. Verificar se está rodando

```bash
curl http://localhost:3000/health
```

---

## 📚 Endpoints da API

### Autenticação

Todas as rotas (exceto `/health`) requerem header:
```
X-API-Key: sua-chave-aqui
```

---

### Sessões

#### Listar todas as sessões
```http
GET /api/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "client_id": "cliente-123",
      "phone_number": "5511999999999",
      "connected": true
    }
  ],
  "total": 1
}
```

#### Criar sessão
```http
POST /api/sessions
Content-Type: application/json

{
  "client_id": "cliente-123"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "client_id": "cliente-123",
  "status": "created"
}
```

#### Status da sessão
```http
GET /api/sessions/:sessionId
```

#### Deletar sessão
```http
DELETE /api/sessions/:sessionId
```

---

### Conexão

#### Conectar (gera QR code)
```http
POST /api/sessions/:sessionId/connect
```

**Response:**
```json
{
  "status": "qr_ready",
  "qr_code": "base64-png-image"
}
```

#### Obter QR code
```http
GET /api/sessions/:sessionId/qr
```

#### Desconectar
```http
POST /api/sessions/:sessionId/disconnect
```

---

### Mensagens

#### Enviar texto
```http
POST /api/sessions/:sessionId/send/text
Content-Type: application/json

{
  "to": "5511999999999",
  "text": "Olá, tudo bem?"
}
```

**Response:**
```json
{
  "status": "sent",
  "message_id": "ABC123"
}
```

#### Enviar imagem (multipart)
```http
POST /api/sessions/:sessionId/send/image
Content-Type: multipart/form-data

to: 5511999999999
caption: Veja essa imagem
image: [arquivo]
```

#### Enviar imagem (base64)
```http
POST /api/sessions/:sessionId/send/image
Content-Type: application/json

{
  "to": "5511999999999",
  "image": "base64-encoded-image",
  "caption": "Veja essa imagem",
  "mime_type": "image/jpeg"
}
```

#### Enviar documento
```http
POST /api/sessions/:sessionId/send/document
Content-Type: multipart/form-data

to: 5511999999999
caption: Segue o documento
filename: relatorio.pdf
document: [arquivo]
```

---

## 📨 Webhooks

A API envia eventos para a URL configurada em `WEBHOOK_URL`.

### Headers enviados
```
Content-Type: application/json
X-API-Key: sua-chave
X-Webhook-Event: message|status|connection
```

### Evento: message
```json
{
  "type": "message",
  "session_id": "uuid",
  "client_id": "cliente-123",
  "timestamp": 1234567890,
  "data": {
    "message_id": "ABC123",
    "from": "5511999999999",
    "to": "5511888888888",
    "body": "Texto da mensagem",
    "type": "text",
    "is_from_me": false,
    "is_group": false,
    "push_name": "João"
  }
}
```

### Evento: status
```json
{
  "type": "status",
  "session_id": "uuid",
  "client_id": "cliente-123",
  "timestamp": 1234567890,
  "data": {
    "message_id": "ABC123",
    "status": "delivered",
    "to": "5511999999999"
  }
}
```

Status possíveis: `sent`, `delivered`, `read`

### Evento: connection
```json
{
  "type": "connection",
  "session_id": "uuid",
  "client_id": "cliente-123",
  "timestamp": 1234567890,
  "data": {
    "status": "connected",
    "phone_number": "5511999999999"
  }
}
```

Status possíveis: `connected`, `disconnected`, `logged_out`, `qr_ready`

---

## 🔧 Integração com Laravel

### Controller para Webhook

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WhatsAppMessage;

class WhatsAppWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $apiKey = $request->header('X-API-Key');
        
        if ($apiKey !== config('services.whatsapp.api_key')) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $event = $request->header('X-Webhook-Event');
        $payload = $request->all();

        switch ($event) {
            case 'message':
                $this->handleMessage($payload);
                break;
            case 'status':
                $this->handleStatus($payload);
                break;
            case 'connection':
                $this->handleConnection($payload);
                break;
        }

        return response()->json(['status' => 'ok']);
    }

    private function handleMessage($payload)
    {
        $data = $payload['data'];
        
        WhatsAppMessage::create([
            'session_id' => $payload['session_id'],
            'client_id' => $payload['client_id'],
            'message_id' => $data['message_id'],
            'from' => $data['from'],
            'to' => $data['to'],
            'body' => $data['body'],
            'type' => $data['type'],
            'is_from_me' => $data['is_from_me'],
        ]);
        
        // Disparar evento, notificação, etc.
    }

    private function handleStatus($payload)
    {
        $data = $payload['data'];
        
        WhatsAppMessage::where('message_id', $data['message_id'])
            ->update(['status' => $data['status']]);
    }

    private function handleConnection($payload)
    {
        // Atualizar status da conexão no CRM
    }
}
```

### Service para enviar mensagens

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.url');
        $this->apiKey = config('services.whatsapp.api_key');
    }

    public function createSession(string $clientId): array
    {
        return $this->post('/api/sessions', [
            'client_id' => $clientId,
        ]);
    }

    public function connect(string $sessionId): array
    {
        return $this->post("/api/sessions/{$sessionId}/connect");
    }

    public function sendText(string $sessionId, string $to, string $text): array
    {
        return $this->post("/api/sessions/{$sessionId}/send/text", [
            'to' => $to,
            'text' => $text,
        ]);
    }

    public function sendImage(string $sessionId, string $to, string $imagePath, string $caption = ''): array
    {
        return Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->attach('image', file_get_contents($imagePath), basename($imagePath))
            ->post("{$this->baseUrl}/api/sessions/{$sessionId}/send/image", [
                'to' => $to,
                'caption' => $caption,
            ])
            ->json();
    }

    private function post(string $endpoint, array $data = []): array
    {
        return Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->post("{$this->baseUrl}{$endpoint}", $data)
            ->json();
    }
}
```

### Config (config/services.php)

```php
'whatsapp' => [
    'url' => env('WHATSAPP_API_URL', 'http://whatsapp-api:3000'),
    'api_key' => env('WHATSAPP_API_KEY'),
],
```

---

## ⚠️ Cuidados Importantes

1. **Rate Limiting**: WhatsApp bane números que enviam muitas mensagens rápido. Implemente filas no Laravel.

2. **Backup**: O volume `./data` contém as sessões. Faça backup regularmente.

3. **Números**: Use números dedicados para automação, não seu número pessoal.

4. **Termos**: Respeite os termos de uso do WhatsApp Business.

---

## 📁 Estrutura

```
whatsapp-api/
├── cmd/server/main.go      # Entrada
├── internal/
│   ├── api/                # Handlers HTTP
│   ├── config/             # Configurações
│   ├── store/              # PostgreSQL
│   ├── webhook/            # Envio de webhooks
│   └── whatsapp/           # Cliente Whatsmeow
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
