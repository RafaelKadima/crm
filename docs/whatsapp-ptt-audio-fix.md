# WhatsApp PTT (Voice Notes) - Solução Final

## Problema Original

Áudios gravados no CRM funcionavam no **WhatsApp Web** mas **não funcionavam no WhatsApp Mobile (iPhone)**.

**Erro exibido no celular:** "Este áudio não está mais disponível" ou áudio não tocava.

## Causa Raiz

Após **múltiplas tentativas** com OGG OPUS, descobrimos que:

1. **OGG OPUS** - Funciona no Android e Web, mas **falha no iPhone** mesmo com parâmetros corretos
2. **MP3 via URL pública** - Funciona em todos, mas **não aparece como mensagem de voz (PTT)**
3. **MP3 via upload + voice:true** - ✅ **FUNCIONA EM TODOS + aparece como PTT**

## Solução Final (Funcionando)

### Fluxo Completo

```
Frontend (WebM) → Upload S3/R2 → Backend (FFmpeg: WebM→MP3) → Upload WhatsApp API → Envio com voice:true
```

### 1. Frontend - Gravação (AudioRecorder.tsx)

O frontend grava em WebM (formato nativo do Chrome) e envia para o backend:

```typescript
// Grava em WebM (Chrome/Edge)
const mimeType = 'audio/webm;codecs=opus'
const mediaRecorder = new MediaRecorder(stream, { mimeType })

// Envia para o backend (sem conversão no frontend)
await fetch(upload_url, {
  method: 'PUT',
  body: audioBlob,
  headers: { 'Content-Type': mimeType },
})

// Backend faz a conversão e envio
await api.post(`/whatsapp/tickets/${ticketId}/media`, {
  attachment_id: attachment_id,
  voice: true,
})
```

### 2. Backend - Conversão para MP3 (WhatsAppService.php)

```php
// convertToMp3() - Conversão FFmpeg para MP3
$command = sprintf(
    '"%s" -y -i "%s" -vn -ac 1 -ar 44100 -b:a 128k -f mp3 "%s" 2>&1',
    $ffmpegPath,
    $inputFile,
    $outputFile
);
```

**Parâmetros:**

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `-vn` | - | Remove streams de vídeo |
| `-ac 1` | mono | Voz é mono |
| `-ar 44100` | 44.1kHz | Sample rate padrão MP3 |
| `-b:a 128k` | 128kbps | Boa qualidade, tamanho pequeno |
| `-f mp3` | MP3 | Formato universalmente compatível |

### 3. Backend - Upload para WhatsApp API + voice:true

```php
// sendVoiceNoteMP3() - Upload e envio com PTT

// Step 1: Upload do MP3 para WhatsApp Media API
$uploadResponse = Http::withToken($this->accessToken)
    ->attach('file', $fileContents, $fileName, ['Content-Type' => 'audio/mpeg'])
    ->post("{$this->baseUrl}/{$this->phoneNumberId}/media", [
        'messaging_product' => 'whatsapp',
        'type' => 'audio/mpeg',
    ]);

$mediaId = $uploadResponse->json()['id'];

// Step 2: Enviar com voice:true (CRÍTICO para aparecer como PTT!)
$sendPayload = [
    'messaging_product' => 'whatsapp',
    'recipient_type' => 'individual',
    'to' => $phoneNumber,
    'type' => 'audio',
    'audio' => [
        'id' => $mediaId,      // Usar media_id (não link!)
        'voice' => true,        // CRÍTICO: faz aparecer como bolinha de voz
    ],
];

$sendResponse = Http::withToken($this->accessToken)
    ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", $sendPayload);
```

## Por que MP3 + Upload + voice:true?

| Método | iOS | Android | Web | PTT (bolinha) |
|--------|-----|---------|-----|---------------|
| OGG via media_id + voice:true | ❌ | ✅ | ✅ | ✅ |
| MP3 via link (URL pública) | ✅ | ✅ | ✅ | ❌ |
| **MP3 via media_id + voice:true** | ✅ | ✅ | ✅ | ✅ |

**A chave é:**
- `voice: true` só funciona com `id:` (upload), não com `link:` (URL)
- MP3 é universalmente compatível (iOS aceita)
- OGG OPUS não funciona no iOS mesmo com parâmetros corretos

## Arquivos Modificados

### Backend

1. **`app/Services/WhatsAppService.php`**
   - `convertToMp3()` - Conversão FFmpeg WebM → MP3
   - `sendVoiceNoteMP3()` - Upload + envio com voice:true
   - `findFfmpeg()` - Localiza executável FFmpeg

2. **`app/Http/Controllers/WhatsAppController.php`**
   - `sendMedia()` - Detecta áudio e usa `sendVoiceNoteMP3()`

### Frontend

1. **`frontend/src/components/chat/AudioRecorder.tsx`**
   - Gravação em WebM (formato nativo)
   - Upload para S3/R2
   - Chamada ao endpoint `/whatsapp/tickets/{id}/media`

## Requisitos do Servidor

### FFmpeg

```bash
# Verificar instalação
ffmpeg -version

# Verificar suporte a MP3
ffmpeg -encoders | grep mp3
# Deve mostrar: libmp3lame
```

### Docker

```dockerfile
# No Dockerfile do PHP
RUN apt-get update && apt-get install -y ffmpeg
```

## Logs de Debug

```php
[PTT MP3] convertToMp3 called
[PTT MP3] Running FFmpeg
[PTT MP3] FFmpeg success
[PTT MP3 VOICE] Starting voice note send
[PTT MP3 VOICE] Uploading to WhatsApp
[PTT MP3 VOICE] Upload successful, sending message
[PTT MP3 VOICE] Success!
```

### Verificar logs:

```bash
docker compose logs php --tail=100 | grep "PTT MP3"
```

## Deploy

```bash
# SSH para o servidor
ssh root@212.85.20.129

# Pull e restart
cd /var/www/crm
git pull origin main
docker compose exec -T php php artisan config:clear
docker compose restart php

# Verificar logs
docker compose logs php --tail=50 | grep "PTT MP3"
```

## Checklist de Verificação

- [x] FFmpeg instalado no container
- [x] Conversão WebM → MP3 funcionando
- [x] Upload para WhatsApp Media API retorna media_id
- [x] Envio com `audio.id` (não `audio.link`)
- [x] Flag `voice: true` no payload
- [x] Áudio toca no iPhone
- [x] Áudio aparece como bolinha de voz (PTT)

## Tentativas Anteriores (Não Funcionaram no iOS)

### 1. OGG OPUS com parâmetros WhatsApp
```php
// ❌ NÃO FUNCIONA NO iOS
$command = '... -ar 16000 -c:a libopus -b:a 32k -f ogg ...';
```

### 2. MP3 via URL pública (link)
```php
// ❌ Funciona mas NÃO aparece como PTT
'audio' => ['link' => $mediaUrl]
```

### 3. Conversão no Frontend (lamejs)
```typescript
// ❌ Erro: MPEGMode is not defined (incompatível com Vite)
import lamejs from 'lamejs'
```

## Referências

- [WhatsApp Cloud API - Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [WhatsApp Cloud API - Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [FFmpeg MP3 Encoding](https://trac.ffmpeg.org/wiki/Encode/MP3)

---

**Última atualização:** 2024-12-16

**Status:** ✅ **FUNCIONANDO** - iOS + Android + Web + PTT (bolinha de voz)
