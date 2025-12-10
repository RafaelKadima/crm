# 📱 Arquitetura de Integração WhatsApp para CRM Laravel + React

> Guia completo para implementar recebimento de mensagens do WhatsApp em tempo real, com processamento de arquivos, vídeos e áudios.

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estrutura de Diretórios](#estrutura-de-diretórios)
4. [Banco de Dados](#banco-de-dados)
5. [Microserviço Node.js para WhatsApp](#microserviço-nodejs-para-whatsapp)
6. [Backend Laravel](#backend-laravel)
7. [Frontend React](#frontend-react)
8. [Fluxo de Mensagens](#fluxo-de-mensagens)
9. [Processamento de Mídia](#processamento-de-mídia)
10. [Deploy e Escalabilidade](#deploy-e-escalabilidade)

---

## 🏗️ Visão Geral da Arquitetura

```markdown:docs/WHATSAPP_INTEGRATION_ARCHITECTURE.md
<code_block_to_apply_changes_from>
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ARQUITETURA                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌──────────────────┐     ┌─────────────────────┐     │
│  │ WhatsApp │────▶│  Node.js Service │────▶│       Redis         │     │
│  │   API    │     │  (Baileys/WAPI)  │     │   (Pub/Sub + Queue) │     │
│  └──────────┘     └──────────────────┘     └──────────┬──────────┘     │
│                            │                          │                 │
│                            ▼                          ▼                 │
│                   ┌──────────────────┐     ┌─────────────────────┐     │
│                   │   MinIO/S3       │     │   Laravel Backend   │     │
│                   │  (File Storage)  │     │   (API + Workers)   │     │
│                   └──────────────────┘     └──────────┬──────────┘     │
│                                                       │                 │
│                                                       ▼                 │
│                   ┌──────────────────┐     ┌─────────────────────┐     │
│                   │    PostgreSQL    │◀───▶│  Laravel Reverb/    │     │
│                   │    (Database)    │     │  Pusher (WebSocket) │     │
│                   └──────────────────┘     └──────────┬──────────┘     │
│                                                       │                 │
│                                                       ▼                 │
│                                            ┌─────────────────────┐     │
│                                            │   React Frontend    │     │
│                                            │   (Real-time UI)    │     │
│                                            └─────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Por que essa arquitetura?

| Componente | Motivo |
|------------|--------|
| **Node.js Service** | Baileys/whatsapp-web.js só rodam em Node.js |
| **Redis** | Comunicação ultra-rápida entre serviços + filas |
| **Laravel** | Lógica de negócio, autenticação, API REST |
| **WebSocket** | Mensagens em tempo real para o frontend |
| **MinIO/S3** | Armazenamento escalável de mídia |

---

## 🛠️ Stack Tecnológico

### Backend
- **Laravel 11** - API REST + Queue Workers
- **Laravel Reverb** ou **Pusher** - WebSocket Server
- **Laravel Horizon** - Monitoramento de filas
- **PostgreSQL** - Banco de dados principal
- **Redis** - Cache, filas e Pub/Sub

### Microserviço WhatsApp (Node.js)
- **@whiskeysockets/baileys** - Conexão WhatsApp (recomendado)
- **whatsapp-web.js** - Alternativa
- **Bull/BullMQ** - Filas de processamento
- **Sharp** - Processamento de imagens
- **FFmpeg** - Conversão de áudio/vídeo

### Frontend
- **React 18** + **TypeScript**
- **Socket.io-client** ou **Laravel Echo**
- **TanStack Query** - Cache e sincronização
- **Zustand** - Estado global

---

## 📁 Estrutura de Diretórios

### Backend Laravel
```
backend-laravel/
├── app/
│   ├── Events/
│   │   ├── MessageReceived.php
│   │   ├── MessageStatusUpdated.php
│   │   └── WhatsAppConnectionChanged.php
│   ├── Jobs/
│   │   ├── ProcessIncomingMessage.php
│   │   ├── ProcessMediaDownload.php
│   │   ├── SendWhatsAppMessage.php
│   │   └── SyncWhatsAppContacts.php
│   ├── Listeners/
│   │   └── BroadcastMessageToUser.php
│   ├── Models/
│   │   ├── Message.php
│   │   ├── Contact.php
│   │   ├── Conversation.php
│   │   ├── WhatsAppSession.php
│   │   └── MediaFile.php
│   ├── Services/
│   │   ├── WhatsApp/
│   │   │   ├── WhatsAppService.php
│   │   │   ├── MessageProcessor.php
│   │   │   └── MediaHandler.php
│   │   └── Redis/
│   │       └── WhatsAppBridge.php
│   └── Http/
│       ├── Controllers/
│       │   ├── Api/
│       │   │   ├── MessageController.php
│       │   │   ├── ConversationController.php
│       │   │   ├── ContactController.php
│       │   │   └── WhatsAppController.php
│       └── Resources/
│           ├── MessageResource.php
│           └── ConversationResource.php
├── config/
│   ├── whatsapp.php
│   └── broadcasting.php
├── database/
│   └── migrations/
│       ├── create_messages_table.php
│       ├── create_contacts_table.php
│       ├── create_conversations_table.php
│       └── create_whatsapp_sessions_table.php
└── routes/
    ├── api.php
    └── channels.php
```

### Microserviço Node.js
```
whatsapp-service/
├── src/
│   ├── index.ts
│   ├── config/
│   │   └── index.ts
│   ├── services/
│   │   ├── BaileysService.ts
│   │   ├── MessageHandler.ts
│   │   ├── MediaProcessor.ts
│   │   └── RedisPublisher.ts
│   ├── utils/
│   │   ├── mediaDownloader.ts
│   │   ├── audioConverter.ts
│   │   └── logger.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Frontend React
```
frontend-react/
├── src/
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MediaPreview.tsx
│   │   └── Sidebar/
│   │       └── ConversationList.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useMessages.ts
│   │   └── useConversations.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   └── messageService.ts
│   ├── stores/
│   │   ├── chatStore.ts
│   │   └── connectionStore.ts
│   └── types/
│       └── index.ts
└── package.json
```

---

## 🗄️ Banco de Dados

### Migrations Laravel

```php
// database/migrations/xxxx_create_contacts_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('whatsapp_id')->unique(); // 5511999999999@s.whatsapp.net
            $table->string('phone_number');
            $table->string('name')->nullable();
            $table->string('push_name')->nullable();
            $table->string('profile_picture')->nullable();
            $table->boolean('is_business')->default(false);
            $table->boolean('is_blocked')->default(false);
            $table->json('metadata')->nullable();
            $table->foreignId('tenant_id')->constrained();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'phone_number']);
        });
    }
};
```

```php
// database/migrations/xxxx_create_conversations_table.php
<?php

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('contact_id')->constrained();
            $table->foreignId('tenant_id')->constrained();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users');
            $table->foreignId('whatsapp_session_id')->constrained();
            $table->enum('status', ['pending', 'open', 'resolved', 'closed'])->default('pending');
            $table->text('last_message')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->integer('unread_count')->default(0);
            $table->boolean('is_group')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'last_message_at']);
        });
    }
};
```

```php
// database/migrations/xxxx_create_messages_table.php
<?php

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('whatsapp_message_id')->unique();
            $table->foreignId('conversation_id')->constrained();
            $table->foreignId('contact_id')->nullable()->constrained();
            $table->foreignId('user_id')->nullable()->constrained(); // Se enviada pelo sistema
            $table->foreignId('tenant_id')->constrained();
            
            // Conteúdo
            $table->text('body')->nullable();
            $table->enum('type', [
                'text', 'image', 'video', 'audio', 'document', 
                'sticker', 'location', 'contact', 'reaction'
            ])->default('text');
            
            // Mídia
            $table->string('media_url')->nullable();
            $table->string('media_mime_type')->nullable();
            $table->string('media_filename')->nullable();
            $table->integer('media_size')->nullable();
            $table->integer('media_duration')->nullable(); // Para áudio/vídeo
            
            // Status
            $table->boolean('from_me')->default(false);
            $table->boolean('is_read')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->enum('status', ['pending', 'sent', 'delivered', 'read', 'failed'])->default('pending');
            
            // Referências
            $table->string('quoted_message_id')->nullable();
            $table->bigInteger('timestamp');
            
            // Metadata
            $table->json('raw_data')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['conversation_id', 'created_at']);
            $table->index(['tenant_id', 'created_at']);
            $table->index('whatsapp_message_id');
        });
    }
};
```

```php
// database/migrations/xxxx_create_whatsapp_sessions_table.php
<?php

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('tenant_id')->constrained();
            $table->string('name');
            $table->string('phone_number')->nullable();
            $table->enum('status', ['disconnected', 'connecting', 'qr_code', 'connected'])->default('disconnected');
            $table->text('qr_code')->nullable();
            $table->json('session_data')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('disconnected_at')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
        });
    }
};
```

---

## 🟢 Microserviço Node.js para WhatsApp

### package.json
```json
{
  "name": "whatsapp-service",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "ioredis": "^5.3.2",
    "bullmq": "^5.1.0",
    "sharp": "^0.33.2",
    "fluent-ffmpeg": "^2.1.2",
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "pino": "^8.17.2",
    "uuid": "^9.0.1",
    "mime-types": "^2.1.35",
    "axios": "^1.6.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/fluent-ffmpeg": "^2.1.24",
    "@types/mime-types": "^2.1.4",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

### src/index.ts
```typescript
import { createServer } from 'http';
import Redis from 'ioredis';
import { BaileysService } from './services/BaileysService';
import { config } from './config';
import { logger } from './utils/logger';

const redis = new Redis(config.redis.url);
const redisPublisher = new Redis(config.redis.url);
const redisSubscriber = new Redis(config.redis.url);

// Armazena instâncias ativas
const sessions = new Map<string, BaileysService>();

// Escuta comandos do Laravel via Redis
redisSubscriber.subscribe('whatsapp:commands', (err) => {
  if (err) {
    logger.error('Erro ao subscrever no Redis:', err);
    return;
  }
  logger.info('Subscrito no canal whatsapp:commands');
});

redisSubscriber.on('message', async (channel, message) => {
  try {
    const command = JSON.parse(message);
    
    switch (command.action) {
      case 'START_SESSION':
        await startSession(command.sessionId, command.tenantId);
        break;
      case 'STOP_SESSION':
        await stopSession(command.sessionId);
        break;
      case 'SEND_MESSAGE':
        await sendMessage(command);
        break;
      case 'SEND_MEDIA':
        await sendMedia(command);
        break;
    }
  } catch (error) {
    logger.error('Erro ao processar comando:', error);
  }
});

async function startSession(sessionId: string, tenantId: number) {
  if (sessions.has(sessionId)) {
    logger.warn(`Sessão ${sessionId} já está ativa`);
    return;
  }

  const service = new BaileysService({
    sessionId,
    tenantId,
    redis: redisPublisher,
    onQRCode: (qr) => publishEvent('whatsapp:qr', { sessionId, qr }),
    onConnected: (info) => publishEvent('whatsapp:connected', { sessionId, info }),
    onDisconnected: (reason) => publishEvent('whatsapp:disconnected', { sessionId, reason }),
    onMessage: (message) => publishEvent('whatsapp:message', { sessionId, message }),
    onMessageStatus: (status) => publishEvent('whatsapp:status', { sessionId, status }),
  });

  await service.start();
  sessions.set(sessionId, service);
}

async function stopSession(sessionId: string) {
  const service = sessions.get(sessionId);
  if (service) {
    await service.stop();
    sessions.delete(sessionId);
  }
}

async function sendMessage(command: any) {
  const service = sessions.get(command.sessionId);
  if (!service) {
    publishEvent('whatsapp:error', { 
      sessionId: command.sessionId, 
      error: 'Sessão não encontrada' 
    });
    return;
  }
  
  await service.sendTextMessage(command.to, command.text, command.messageId);
}

async function sendMedia(command: any) {
  const service = sessions.get(command.sessionId);
  if (!service) {
    publishEvent('whatsapp:error', { 
      sessionId: command.sessionId, 
      error: 'Sessão não encontrada' 
    });
    return;
  }
  
  await service.sendMediaMessage(command.to, command.media, command.messageId);
}

function publishEvent(channel: string, data: any) {
  redisPublisher.publish(channel, JSON.stringify({
    ...data,
    timestamp: Date.now(),
  }));
}

// Health check HTTP
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      sessions: sessions.size,
      uptime: process.uptime()
    }));
  }
});

server.listen(config.port, () => {
  logger.info(`WhatsApp Service rodando na porta ${config.port}`);
});
```

### src/services/BaileysService.ts
```typescript
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
  WASocket,
  proto,
  downloadMediaMessage,
  getContentType,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { MediaProcessor } from './MediaProcessor';
import { config } from '../config';

interface BaileysServiceOptions {
  sessionId: string;
  tenantId: number;
  redis: Redis;
  onQRCode: (qr: string) => void;
  onConnected: (info: any) => void;
  onDisconnected: (reason: string) => void;
  onMessage: (message: any) => void;
  onMessageStatus: (status: any) => void;
}

export class BaileysService {
  private socket: WASocket | null = null;
  private store: ReturnType<typeof makeInMemoryStore>;
  private mediaProcessor: MediaProcessor;
  private options: BaileysServiceOptions;
  private isRunning = false;

  constructor(options: BaileysServiceOptions) {
    this.options = options;
    this.store = makeInMemoryStore({ logger });
    this.mediaProcessor = new MediaProcessor(options.tenantId);
  }

  async start() {
    const sessionPath = path.join(config.sessionsPath, this.options.sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['CRM WhatsApp', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    this.store.bind(this.socket.ev);

    // Eventos de conexão
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.options.onQRCode(qr);
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        
        if (reason === DisconnectReason.loggedOut) {
          this.options.onDisconnected('logged_out');
          await this.cleanup();
        } else if (this.isRunning) {
          // Reconectar automaticamente
          logger.info(`Reconectando sessão ${this.options.sessionId}...`);
          setTimeout(() => this.start(), 3000);
        }
      } else if (connection === 'open') {
        this.isRunning = true;
        const user = this.socket?.user;
        this.options.onConnected({
          id: user?.id,
          name: user?.name,
          phone: user?.id?.split(':')[0],
        });
      }
    });

    // Salvar credenciais
    this.socket.ev.on('creds.update', saveCreds);

    // Receber mensagens
    this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages) {
        await this.processIncomingMessage(message);
      }
    });

    // Status de mensagens
    this.socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        this.options.onMessageStatus({
          messageId: update.key.id,
          remoteJid: update.key.remoteJid,
          status: this.mapMessageStatus(update.update?.status),
        });
      }
    });
  }

  private async processIncomingMessage(message: proto.IWebMessageInfo) {
    try {
      const messageType = getContentType(message.message!);
      
      if (!messageType || message.key.fromMe) return; // Ignorar mensagens enviadas

      const jid = message.key.remoteJid!;
      const isGroup = jid.endsWith('@g.us');
      
      let processedMessage: any = {
        id: message.key.id,
        remoteJid: jid,
        fromMe: message.key.fromMe,
        timestamp: message.messageTimestamp,
        pushName: message.pushName,
        isGroup,
        participant: isGroup ? message.key.participant : null,
        type: this.getSimpleType(messageType),
        body: null,
        media: null,
        quotedMessage: null,
      };

      // Extrair corpo da mensagem
      switch (messageType) {
        case 'conversation':
          processedMessage.body = message.message?.conversation;
          break;
        case 'extendedTextMessage':
          processedMessage.body = message.message?.extendedTextMessage?.text;
          processedMessage.quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          break;
        case 'imageMessage':
        case 'videoMessage':
        case 'audioMessage':
        case 'documentMessage':
        case 'stickerMessage':
          processedMessage = await this.processMediaMessage(message, processedMessage);
          break;
        case 'locationMessage':
          const loc = message.message?.locationMessage;
          processedMessage.body = `📍 Localização: ${loc?.degreesLatitude}, ${loc?.degreesLongitude}`;
          processedMessage.metadata = {
            latitude: loc?.degreesLatitude,
            longitude: loc?.degreesLongitude,
          };
          break;
        case 'contactMessage':
          processedMessage.body = message.message?.contactMessage?.displayName;
          processedMessage.metadata = {
            vcard: message.message?.contactMessage?.vcard,
          };
          break;
      }

      // Enviar para Laravel via Redis
      this.options.onMessage(processedMessage);
      
    } catch (error) {
      logger.error('Erro ao processar mensagem:', error);
    }
  }

  private async processMediaMessage(message: proto.IWebMessageInfo, processedMessage: any) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        { 
          logger,
          reuploadRequest: this.socket!.updateMediaMessage 
        }
      );

      const messageType = getContentType(message.message!);
      const mediaMsg = (message.message as any)[messageType!];
      
      // Processar e salvar mídia
      const mediaResult = await this.mediaProcessor.process({
        buffer: buffer as Buffer,
        mimetype: mediaMsg.mimetype,
        filename: mediaMsg.fileName || `${Date.now()}.${this.getExtension(mediaMsg.mimetype)}`,
        type: this.getSimpleType(messageType!),
      });

      processedMessage.body = mediaMsg.caption || mediaMsg.fileName || `[${this.getSimpleType(messageType!)}]`;
      processedMessage.media = {
        url: mediaResult.url,
        path: mediaResult.path,
        mimetype: mediaMsg.mimetype,
        filename: mediaResult.filename,
        size: buffer.length,
        duration: mediaMsg.seconds || null,
      };

    } catch (error) {
      logger.error('Erro ao processar mídia:', error);
      processedMessage.body = '[Erro ao baixar mídia]';
    }

    return processedMessage;
  }

  async sendTextMessage(to: string, text: string, messageId?: string) {
    if (!this.socket) throw new Error('Socket não conectado');
    
    const jid = this.formatJid(to);
    const result = await this.socket.sendMessage(jid, { text });
    
    return {
      id: result?.key?.id,
      status: 'sent',
    };
  }

  async sendMediaMessage(to: string, media: any, messageId?: string) {
    if (!this.socket) throw new Error('Socket não conectado');
    
    const jid = this.formatJid(to);
    let messageContent: any;

    switch (media.type) {
      case 'image':
        messageContent = { 
          image: { url: media.url },
          caption: media.caption,
        };
        break;
      case 'video':
        messageContent = { 
          video: { url: media.url },
          caption: media.caption,
        };
        break;
      case 'audio':
        messageContent = { 
          audio: { url: media.url },
          ptt: media.ptt || false,
        };
        break;
      case 'document':
        messageContent = { 
          document: { url: media.url },
          fileName: media.filename,
          mimetype: media.mimetype,
        };
        break;
    }

    const result = await this.socket.sendMessage(jid, messageContent);
    
    return {
      id: result?.key?.id,
      status: 'sent',
    };
  }

  async stop() {
    this.isRunning = false;
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
  }

  private async cleanup() {
    const sessionPath = path.join(config.sessionsPath, this.options.sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
    }
  }

  private formatJid(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
  }

  private getSimpleType(messageType: string): string {
    const typeMap: Record<string, string> = {
      'conversation': 'text',
      'extendedTextMessage': 'text',
      'imageMessage': 'image',
      'videoMessage': 'video',
      'audioMessage': 'audio',
      'documentMessage': 'document',
      'stickerMessage': 'sticker',
      'locationMessage': 'location',
      'contactMessage': 'contact',
    };
    return typeMap[messageType] || 'text';
  }

  private getExtension(mimetype: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'audio/ogg; codecs=opus': 'ogg',
      'audio/mpeg': 'mp3',
      'application/pdf': 'pdf',
    };
    return mimeMap[mimetype] || 'bin';
  }

  private mapMessageStatus(status?: number): string {
    const statusMap: Record<number, string> = {
      0: 'pending',
      1: 'sent',
      2: 'delivered',
      3: 'read',
      4: 'read',
    };
    return statusMap[status || 0] || 'pending';
  }
}
```

### src/services/MediaProcessor.ts
```typescript
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

ffmpeg.setFfmpegPath(ffmpegPath);

interface MediaInput {
  buffer: Buffer;
  mimetype: string;
  filename: string;
  type: string;
}

interface MediaResult {
  url: string;
  path: string;
  filename: string;
  thumbnail?: string;
}

export class MediaProcessor {
  private tenantId: number;
  private basePath: string;
  private baseUrl: string;

  constructor(tenantId: number) {
    this.tenantId = tenantId;
    this.basePath = path.join(config.mediaPath, String(tenantId));
    this.baseUrl = `${config.mediaBaseUrl}/${tenantId}`;
    
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async process(input: MediaInput): Promise<MediaResult> {
    const uniqueFilename = `${Date.now()}_${uuidv4().substring(0, 8)}_${input.filename}`;
    const filePath = path.join(this.basePath, uniqueFilename);

    // Salvar arquivo original
    fs.writeFileSync(filePath, input.buffer);

    // Processar baseado no tipo
    switch (input.type) {
      case 'image':
        await this.processImage(filePath);
        break;
      case 'audio':
        if (input.mimetype.includes('ogg')) {
          await this.convertOggToMp3(filePath);
        }
        break;
      case 'video':
        await this.generateVideoThumbnail(filePath);
        break;
    }

    return {
      url: `${this.baseUrl}/${uniqueFilename}`,
      path: filePath,
      filename: uniqueFilename,
    };
  }

  private async processImage(filePath: string): Promise<void> {
    try {
      // Otimizar imagem
      const optimized = await sharp(filePath)
        .resize(1920, 1920, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      fs.writeFileSync(filePath, optimized);
      
      // Gerar thumbnail
      const thumbPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      await sharp(filePath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbPath);
        
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
    }
  }

  private async convertOggToMp3(filePath: string): Promise<string> {
    const mp3Path = filePath.replace(/\.[^.]+$/, '.mp3');
    
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .toFormat('mp3')
        .on('end', () => resolve(mp3Path))
        .on('error', reject)
        .save(mp3Path);
    });
  }

  private async generateVideoThumbnail(filePath: string): Promise<void> {
    const thumbPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
    
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(thumbPath),
          folder: path.dirname(thumbPath),
          size: '320x240',
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }
}
```

---

## 🐘 Backend Laravel

### config/whatsapp.php
```php
<?php

return [
    'redis' => [
        'prefix' => 'whatsapp:',
        'commands_channel' => 'whatsapp:commands',
        'events_channels' => [
            'qr' => 'whatsapp:qr',
            'connected' => 'whatsapp:connected',
            'disconnected' => 'whatsapp:disconnected',
            'message' => 'whatsapp:message',
            'status' => 'whatsapp:status',
            'error' => 'whatsapp:error',
        ],
    ],
    
    'media' => [
        'disk' => env('WHATSAPP_MEDIA_DISK', 'public'),
        'path' => 'whatsapp-media',
        'max_size' => 50 * 1024 * 1024, // 50MB
        'allowed_types' => [
            'image' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            'video' => ['mp4', 'mov', 'avi', 'mkv'],
            'audio' => ['mp3', 'ogg', 'wav', 'm4a'],
            'document' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
        ],
    ],
];
```

### app/Services/WhatsApp/WhatsAppBridge.php
```php
<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Redis;
use App\Models\WhatsAppSession;

class WhatsAppBridge
{
    protected string $commandsChannel;
    
    public function __construct()
    {
        $this->commandsChannel = config('whatsapp.redis.commands_channel');
    }
    
    /**
     * Iniciar sessão do WhatsApp
     */
    public function startSession(WhatsAppSession $session): void
    {
        $this->publishCommand([
            'action' => 'START_SESSION',
            'sessionId' => $session->uuid,
            'tenantId' => $session->tenant_id,
        ]);
        
        $session->update(['status' => 'connecting']);
    }
    
    /**
     * Parar sessão do WhatsApp
     */
    public function stopSession(WhatsAppSession $session): void
    {
        $this->publishCommand([
            'action' => 'STOP_SESSION',
            'sessionId' => $session->uuid,
        ]);
        
        $session->update([
            'status' => 'disconnected',
            'disconnected_at' => now(),
        ]);
    }
    
    /**
     * Enviar mensagem de texto
     */
    public function sendTextMessage(
        WhatsAppSession $session,
        string $to,
        string $text,
        ?string $messageId = null
    ): void {
        $this->publishCommand([
            'action' => 'SEND_MESSAGE',
            'sessionId' => $session->uuid,
            'to' => $to,
            'text' => $text,
            'messageId' => $messageId,
        ]);
    }
    
    /**
     * Enviar mídia
     */
    public function sendMedia(
        WhatsAppSession $session,
        string $to,
        array $media,
        ?string $messageId = null
    ): void {
        $this->publishCommand([
            'action' => 'SEND_MEDIA',
            'sessionId' => $session->uuid,
            'to' => $to,
            'media' => $media,
            'messageId' => $messageId,
        ]);
    }
    
    protected function publishCommand(array $command): void
    {
        Redis::publish($this->commandsChannel, json_encode($command));
    }
}
```

### app/Services/WhatsApp/MessageProcessor.php
```php
<?php

namespace App\Services\WhatsApp;

use App\Models\Message;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\WhatsAppSession;
use App\Events\MessageReceived;
use Illuminate\Support\Facades\DB;

class MessageProcessor
{
    /**
     * Processar mensagem recebida do Node.js
     */
    public function processIncoming(array $data, WhatsAppSession $session): Message
    {
        return DB::transaction(function () use ($data, $session) {
            // 1. Criar ou atualizar contato
            $contact = $this->findOrCreateContact($data, $session);
            
            // 2. Criar ou atualizar conversa
            $conversation = $this->findOrCreateConversation($contact, $session);
            
            // 3. Criar mensagem
            $message = Message::create([
                'uuid' => \Str::uuid(),
                'whatsapp_message_id' => $data['id'],
                'conversation_id' => $conversation->id,
                'contact_id' => $contact->id,
                'tenant_id' => $session->tenant_id,
                'body' => $data['body'],
                'type' => $data['type'],
                'from_me' => $data['fromMe'] ?? false,
                'timestamp' => $data['timestamp'],
                'media_url' => $data['media']['url'] ?? null,
                'media_mime_type' => $data['media']['mimetype'] ?? null,
                'media_filename' => $data['media']['filename'] ?? null,
                'media_size' => $data['media']['size'] ?? null,
                'media_duration' => $data['media']['duration'] ?? null,
                'raw_data' => $data,
            ]);
            
            // 4. Atualizar conversa
            $conversation->update([
                'last_message' => \Str::limit($data['body'], 100),
                'last_message_at' => now(),
                'unread_count' => DB::raw('unread_count + 1'),
            ]);
            
            // 5. Broadcast para frontend
            broadcast(new MessageReceived($message))->toOthers();
            
            return $message;
        });
    }
    
    protected function findOrCreateContact(array $data, WhatsAppSession $session): Contact
    {
        $phoneNumber = $this->extractPhoneNumber($data['remoteJid']);
        
        return Contact::updateOrCreate(
            [
                'whatsapp_id' => $data['remoteJid'],
                'tenant_id' => $session->tenant_id,
            ],
            [
                'uuid' => \Str::uuid(),
                'phone_number' => $phoneNumber,
                'push_name' => $data['pushName'] ?? null,
            ]
        );
    }
    
    protected function findOrCreateConversation(Contact $contact, WhatsAppSession $session): Conversation
    {
        return Conversation::firstOrCreate(
            [
                'contact_id' => $contact->id,
                'whatsapp_session_id' => $session->id,
            ],
            [
                'uuid' => \Str::uuid(),
                'tenant_id' => $session->tenant_id,
                'status' => 'pending',
            ]
        );
    }
    
    protected function extractPhoneNumber(string $jid): string
    {
        return explode('@', $jid)[0];
    }
}
```

### app/Console/Commands/WhatsAppListener.php
```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;
use App\Services\WhatsApp\MessageProcessor;
use App\Models\WhatsAppSession;

class WhatsAppListener extends Command
{
    protected $signature = 'whatsapp:listen';
    protected $description = 'Escuta eventos do WhatsApp via Redis';
    
    protected MessageProcessor $messageProcessor;
    
    public function __construct(MessageProcessor $messageProcessor)
    {
        parent::__construct();
        $this->messageProcessor = $messageProcessor;
    }
    
    public function handle(): void
    {
        $this->info('Iniciando listener do WhatsApp...');
        
        $channels = config('whatsapp.redis.events_channels');
        
        Redis::subscribe(array_values($channels), function ($message, $channel) use ($channels) {
            $data = json_decode($message, true);
            
            $this->info("Evento recebido: {$channel}");
            
            match ($channel) {
                $channels['qr'] => $this->handleQRCode($data),
                $channels['connected'] => $this->handleConnected($data),
                $channels['disconnected'] => $this->handleDisconnected($data),
                $channels['message'] => $this->handleMessage($data),
                $channels['status'] => $this->handleStatus($data),
                default => null,
            };
        });
    }
    
    protected function handleQRCode(array $data): void
    {
        WhatsAppSession::where('uuid', $data['sessionId'])
            ->update([
                'status' => 'qr_code',
                'qr_code' => $data['qr'],
            ]);
            
        // Broadcast QR Code para o frontend
        broadcast(new \App\Events\WhatsAppQRCode($data['sessionId'], $data['qr']));
    }
    
    protected function handleConnected(array $data): void
    {
        WhatsAppSession::where('uuid', $data['sessionId'])
            ->update([
                'status' => 'connected',
                'phone_number' => $data['info']['phone'] ?? null,
                'qr_code' => null,
                'connected_at' => now(),
            ]);
            
        broadcast(new \App\Events\WhatsAppConnected($data['sessionId'], $data['info']));
    }
    
    protected function handleDisconnected(array $data): void
    {
        WhatsAppSession::where('uuid', $data['sessionId'])
            ->update([
                'status' => 'disconnected',
                'disconnected_at' => now(),
            ]);
            
        broadcast(new \App\Events\WhatsAppDisconnected($data['sessionId'], $data['reason']));
    }
    
    protected function handleMessage(array $data): void
    {
        $session = WhatsAppSession::where('uuid', $data['sessionId'])->first();
        
        if ($session) {
            $this->messageProcessor->processIncoming($data['message'], $session);
        }
    }
    
    protected function handleStatus(array $data): void
    {
        \App\Models\Message::where('whatsapp_message_id', $data['status']['messageId'])
            ->update(['status' => $data['status']['status']]);
            
        broadcast(new \App\Events\MessageStatusUpdated($data['status']));
    }
}
```

### app/Events/MessageReceived.php
```php
<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use App\Http\Resources\MessageResource;

class MessageReceived implements ShouldBroadcastNow
{
    public Message $message;
    
    public function __construct(Message $message)
    {
        $this->message = $message->load(['contact', 'conversation']);
    }
    
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tenant.{$this->message->tenant_id}"),
            new PrivateChannel("conversation.{$this->message->conversation_id}"),
        ];
    }
    
    public function broadcastAs(): string
    {
        return 'message.received';
    }
    
    public function broadcastWith(): array
    {
        return [
            'message' => new MessageResource($this->message),
        ];
    }
}
```

### routes/channels.php
```php
<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}', function ($user, $tenantId) {
    return $user->tenant_id === (int) $tenantId;
});

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    return $user->conversations()->where('id', $conversationId)->exists();
});
```

---

## ⚛️ Frontend React

### src/hooks/useWebSocket.ts
```typescript
import { useEffect, useRef, useCallback } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useChatStore } from '../stores/chatStore';
import { Message, Conversation } from '../types';

// Configurar Echo global
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

export function useWebSocket(tenantId: number) {
  const echoRef = useRef<Echo | null>(null);
  const { addMessage, updateMessageStatus, updateConversation } = useChatStore();

  useEffect(() => {
    // Inicializar Echo
    echoRef.current = new Echo({
      broadcaster: 'reverb', // ou 'pusher'
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: import.meta.env.VITE_REVERB_PORT,
      wssPort: import.meta.env.VITE_REVERB_PORT,
      forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: '/api/broadcasting/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      },
    });

    // Subscrever no canal do tenant
    const channel = echoRef.current.private(`tenant.${tenantId}`);

    channel
      .listen('.message.received', (e: { message: Message }) => {
        console.log('Nova mensagem:', e.message);
        addMessage(e.message);
      })
      .listen('.message.status', (e: { messageId: string; status: string }) => {
        updateMessageStatus(e.messageId, e.status);
      })
      .listen('.whatsapp.qr', (e: { sessionId: string; qr: string }) => {
        // Atualizar QR code no estado
      })
      .listen('.whatsapp.connected', (e: { sessionId: string }) => {
        // Atualizar status da sessão
      });

    return () => {
      echoRef.current?.leave(`tenant.${tenantId}`);
      echoRef.current?.disconnect();
    };
  }, [tenantId, addMessage, updateMessageStatus]);

  // Subscrever em conversa específica
  const subscribeToConversation = useCallback((conversationId: number) => {
    if (!echoRef.current) return;

    echoRef.current
      .private(`conversation.${conversationId}`)
      .listen('.message.received', (e: { message: Message }) => {
        addMessage(e.message);
      })
      .listen('.typing', (e: { userId: number }) => {
        // Indicador de digitação
      });
  }, [addMessage]);

  const unsubscribeFromConversation = useCallback((conversationId: number) => {
    echoRef.current?.leave(`conversation.${conversationId}`);
  }, []);

  return {
    subscribeToConversation,
    unsubscribeFromConversation,
  };
}
```

### src/stores/chatStore.ts
```typescript
import { create } from 'zustand';
import { Message, Conversation } from '../types';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Record<number, Message[]>;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  updateConversation: (conversationId: number, updates: Partial<Conversation>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: {},
  
  setConversations: (conversations) => set({ conversations }),
  
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  
  addMessage: (message) => {
    const { messages, conversations } = get();
    const conversationId = message.conversation_id;
    
    // Adicionar mensagem
    const conversationMessages = messages[conversationId] || [];
    const exists = conversationMessages.some(m => m.id === message.id);
    
    if (!exists) {
      set({
        messages: {
          ...messages,
          [conversationId]: [...conversationMessages, message],
        },
      });
    }
    
    // Atualizar conversa
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          last_message: message.body,
          last_message_at: message.created_at,
          unread_count: message.from_me ? conv.unread_count : conv.unread_count + 1,
        };
      }
      return conv;
    });
    
    // Reordenar por última mensagem
    updatedConversations.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
    
    set({ conversations: updatedConversations });
  },
  
  setMessages: (conversationId, msgs) => {
    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: msgs,
      },
    }));
  },
  
  updateMessageStatus: (messageId, status) => {
    set(state => {
      const newMessages = { ...state.messages };
      
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].map(msg => 
          msg.whatsapp_message_id === messageId 
            ? { ...msg, status } 
            : msg
        );
      }
      
      return { messages: newMessages };
    });
  },
  
  updateConversation: (conversationId, updates) => {
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, ...updates } : conv
      ),
    }));
  },
}));
```

### src/components/Chat/ChatWindow.tsx
```tsx
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '../../stores/chatStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { messageService } from '../../services/messageService';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ConversationHeader } from './ConversationHeader';

export function ChatWindow() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentConversation, messages, setMessages, setCurrentConversation } = useChatStore();
  const { subscribeToConversation, unsubscribeFromConversation } = useWebSocket(1); // tenantId

  // Carregar mensagens
  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messageService.getMessages(Number(conversationId)),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (data?.data) {
      setMessages(Number(conversationId), data.data);
    }
  }, [data, conversationId, setMessages]);

  // WebSocket subscription
  useEffect(() => {
    if (conversationId) {
      subscribeToConversation(Number(conversationId));
      return () => unsubscribeFromConversation(Number(conversationId));
    }
  }, [conversationId, subscribeToConversation, unsubscribeFromConversation]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[Number(conversationId!)]]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Selecione uma conversa</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ConversationHeader conversation={currentConversation} />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner" />
          </div>
        ) : (
          <>
            <MessageList messages={messages[Number(conversationId)] || []} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <MessageInput conversationId={Number(conversationId)} />
    </div>
  );
}
```

### src/components/Chat/MessageItem.tsx
```tsx
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Message } from '../../types';
import { MediaPreview } from './MediaPreview';
import { CheckIcon, CheckCheckIcon, ClockIcon } from './icons';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isFromMe = message.from_me;
  
  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] rounded-lg p-3 
          ${isFromMe 
            ? 'bg-green-100 rounded-br-none' 
            : 'bg-white shadow rounded-bl-none'
          }
        `}
      >
        {/* Mídia */}
        {message.media_url && (
          <MediaPreview
            type={message.type}
            url={message.media_url}
            filename={message.media_filename}
            mimetype={message.media_mime_type}
          />
        )}
        
        {/* Texto */}
        {message.body && (
          <p className="text-gray-800 whitespace-pre-wrap break-words">
            {message.body}
          </p>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs text-gray-500">
            {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
          </span>
          
          {isFromMe && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <ClockIcon className="w-4 h-4 text-gray-400" />;
    case 'sent':
      return <CheckIcon className="w-4 h-4 text-gray-400" />;
    case 'delivered':
      return <CheckCheckIcon className="w-4 h-4 text-gray-400" />;
    case 'read':
      return <CheckCheckIcon className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
}
```

### src/components/Chat/MediaPreview.tsx
```tsx
import React, { useState } from 'react';
import { PlayIcon, DocumentIcon, DownloadIcon } from './icons';

interface MediaPreviewProps {
  type: string;
  url: string;
  filename?: string;
  mimetype?: string;
}

export function MediaPreview({ type, url, filename, mimetype }: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  switch (type) {
    case 'image':
      return (
        <div className="mb-2">
          <img
            src={url}
            alt="Imagem"
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => window.open(url, '_blank')}
          />
        </div>
      );

    case 'video':
      return (
        <div className="mb-2 relative">
          <video
            src={url}
            controls
            className="max-w-full rounded-lg"
            preload="metadata"
          />
        </div>
      );

    case 'audio':
      return (
        <div className="mb-2">
          <audio
            src={url}
            controls
            className="w-full"
          />
        </div>
      );

    case 'document':
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 mb-2"
        >
          <DocumentIcon className="w-10 h-10 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {filename || 'Documento'}
            </p>
            <p className="text-xs text-gray-500">
              {mimetype?.split('/')[1]?.toUpperCase()}
            </p>
          </div>
          <DownloadIcon className="w-5 h-5 text-gray-400" />
        </a>
      );

    case 'sticker':
      return (
        <div className="mb-2">
          <img
            src={url}
            alt="Sticker"
            className="w-32 h-32 object-contain"
          />
        </div>
      );

    default:
      return null;
  }
}
```

---

## 🔄 Fluxo de Mensagens

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RECEBIMENTO                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. WhatsApp                                                         │
│     │                                                                │
│     ▼                                                                │
│  2. Node.js (Baileys) ─────► Download & Processa Mídia              │
│     │                                                                │
│     ▼                                                                │
│  3. Redis Publish ──────────► whatsapp:message                      │
│     │                                                                │
│     ▼                                                                │
│  4. Laravel Listener ───────► ProcessIncomingMessage Job            │
│     │                                                                │
│     ├──► Cria/Atualiza Contact                                      │
│     ├──► Cria/Atualiza Conversation                                 │
│     ├──► Cria Message no DB                                         │
│     │                                                                │
│     ▼                                                                │
│  5. Broadcast Event ────────► MessageReceived                       │
│     │                                                                │
│     ▼                                                                │
│  6. Laravel Reverb/Pusher ──► WebSocket                             │
│     │                                                                │
│     ▼                                                                │
│  7. React (Echo) ───────────► Atualiza UI em tempo real             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE ENVIO                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. React ──────────────────► POST /api/messages                     │
│     │                                                                │
│     ▼                                                                │
│  2. Laravel Controller ─────► Valida + Cria Message (pending)       │
│     │                                                                │
│     ▼                                                                │
│  3. Redis Publish ──────────► whatsapp:commands                     │
│     │                                                                │
│     ▼                                                                │
│  4. Node.js ────────────────► Envia via Baileys                     │
│     │                                                                │
│     ▼                                                                │
│  5. Callback Status ────────► Redis Publish (whatsapp:status)       │
│     │                                                                │
│     ▼                                                                │
│  6. Laravel Listener ───────► Atualiza status da Message            │
│     │                                                                │
│     ▼                                                                │
│  7. Broadcast ──────────────► MessageStatusUpdated                  │
│     │                                                                │
│     ▼                                                                │
│  8. React ──────────────────► Atualiza ícone de status              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deploy e Escalabilidade

### Docker Compose
```yaml
version: '3.8'

services:
  # Laravel Backend
  laravel:
    build:
      context: ./backend-laravel
      dockerfile: Dockerfile
    volumes:
      - ./backend-laravel:/var/www/html
    depends_on:
      - postgres
      - redis
    environment:
      - DB_CONNECTION=pgsql
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - REVERB_HOST=reverb

  # Laravel Queue Worker
  laravel-worker:
    build:
      context: ./backend-laravel
    command: php artisan queue:work --tries=3
    depends_on:
      - laravel
      - redis
    deploy:
      replicas: 2

  # Laravel WhatsApp Listener
  laravel-whatsapp:
    build:
      context: ./backend-laravel
    command: php artisan whatsapp:listen
    depends_on:
      - laravel
      - redis
    restart: always

  # Laravel Reverb (WebSocket)
  reverb:
    build:
      context: ./backend-laravel
    command: php artisan reverb:start --host=0.0.0.0
    ports:
      - "8080:8080"
    depends_on:
      - laravel
      - redis

  # Node.js WhatsApp Service
  whatsapp-service:
    build:
      context: ./whatsapp-service
    volumes:
      - ./whatsapp-service/sessions:/app/sessions
      - ./storage/media:/app/media
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 1  # Apenas 1 por sessão WhatsApp

  # React Frontend
  frontend:
    build:
      context: ./frontend-react
    ports:
      - "3000:80"
    depends_on:
      - laravel

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crm
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # MinIO (Armazenamento de mídia)
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  # Nginx (Proxy)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - laravel
      - frontend
      - reverb

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Escalabilidade

| Componente | Estratégia |
|------------|------------|
| **Laravel API** | Horizontal (múltiplas instâncias atrás do Nginx) |
| **Queue Workers** | Horizontal (múltiplos workers) |
| **WhatsApp Service** | 1 instância por número de WhatsApp |
| **Redis** | Redis Cluster ou Redis Sentinel |
| **PostgreSQL** | Read replicas + Connection pooling (PgBouncer) |
| **WebSocket** | Laravel Reverb com Redis para sync |
| **Mídia** | MinIO/S3 + CDN (CloudFront/Cloudflare) |

---

## 📝 Comandos Úteis

```bash
# Backend Laravel
composer install
php artisan migrate
php artisan queue:work
php artisan whatsapp:listen
php artisan reverb:start

# WhatsApp Service
npm install
npm run dev      # Desenvolvimento
npm run build    # Produção
npm start

# Frontend React
npm install
npm run dev      # Desenvolvimento
npm run build    # Produção

# Docker
docker-compose up -d
docker-compose logs -f whatsapp-service
docker-compose exec laravel php artisan migrate
```

---

## ✅ Checklist de Implementação

- [ ] Configurar PostgreSQL e Redis
- [ ] Criar migrations do banco
- [ ] Implementar microserviço Node.js
- [ ] Configurar comunicação Redis Pub/Sub
- [ ] Implementar Laravel Listener
- [ ] Configurar Laravel Reverb/Pusher
- [ ] Implementar frontend com Echo
- [ ] Configurar armazenamento de mídia
- [ ] Testar fluxo completo de mensagens
- [ ] Configurar Docker para produção
- [ ] Implementar monitoramento (Horizon, logs)

---

## 🔗 Referências

- [Laravel Reverb](https://laravel.com/docs/reverb)
- [Baileys WhatsApp](https://github.com/WhiskeySockets/Baileys)
- [Laravel Echo](https://laravel.com/docs/broadcasting)
- [BullMQ](https://docs.bullmq.io/)
- [TanStack Query](https://tanstack.com/query)
```

---

Este documento pode ser salvo como `WHATSAPP_INTEGRATION_ARCHITECTURE.md` no seu projeto. Para criar o arquivo, você precisa alternar para o **modo Agent** ou criar manualmente copiando o conteúdo acima.

Quer que eu detalhe mais alguma parte específica da arquitetura?
