# WhatsApp PTT (Voice Notes) - Correção de Áudio

## Problema Original

Áudios gravados no CRM funcionavam no **WhatsApp Web** mas **não funcionavam no WhatsApp Mobile**.

**Erro exibido no celular:** "Este áudio não está mais disponível"

## Análise do Problema

### Fluxo do Áudio

1. **Frontend (AudioRecorder.tsx):** Grava áudio usando MediaRecorder API
   - Chrome/Edge produzem `audio/webm;codecs=opus`
   - Safari pode produzir `audio/mp4`

2. **Upload:** Arquivo é enviado para Cloudflare R2 (S3-compatible)

3. **Backend (WhatsAppService.php):** Converte e envia para WhatsApp API
   - Conversão de WebM → OGG OPUS via FFmpeg
   - Upload para WhatsApp Media API
   - Envio da mensagem com `voice: true` (flag PTT)

### Causa Raiz

O **WhatsApp Mobile é muito mais restritivo** que o WhatsApp Web:

| Aspecto | WhatsApp Web | WhatsApp Mobile |
|---------|--------------|-----------------|
| Container WebM | ✅ Aceita | ❌ Rejeita |
| MIME `audio/ogg; codecs=opus` | ✅ Aceita | ❌ Rejeita |
| MIME `audio/ogg` | ✅ Aceita | ✅ Aceita |
| Bitrate alto (64k+) | ✅ Aceita | ❌ Pode rejeitar |

**O problema estava no MIME type!** Estávamos enviando `audio/ogg; codecs=opus` mas o WhatsApp Mobile **rejeita qualquer parâmetro no MIME type**.

## Solução Implementada

### 1. Conversão FFmpeg Correta

```php
// WhatsAppService.php - convertToOggOpus()
$command = sprintf(
    '"%s" -y -i "%s" -vn -map_metadata -1 -ac 1 -ar 16000 -c:a libopus -b:a 32k -vbr constrained -frame_duration 20 -application voip -f ogg "%s" 2>&1',
    $ffmpegPath,
    $inputFile,
    $outputFile
);
```

**Parâmetros críticos:**

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `-vn` | - | Remove qualquer stream de vídeo |
| `-map_metadata -1` | - | Remove todos os metadados (mobile rejeita tags extras) |
| `-ac 1` | mono | WhatsApp PTT é mono |
| `-ar 16000` | 16kHz | **CRÍTICO para iPhone:** WhatsApp usa 16kHz internamente para voice notes! |
| `-c:a libopus` | OPUS | Codec obrigatório para PTT |
| `-b:a 32k` | 32kbps | Bitrate típico do WhatsApp para voz |
| `-vbr constrained` | VBR limitado | Qualidade consistente sem picos de bitrate |
| `-frame_duration 20` | 20ms | **CRÍTICO:** Tamanho de frame padrão, mais compatível |
| `-application voip` | VoIP | Otimização para voz |
| `-f ogg` | OGG | Container obrigatório (WebM não funciona no mobile) |

### 2. MIME Type Correto

```php
// WhatsAppService.php - uploadMedia()

// ❌ ERRADO - Mobile rejeita
$normalizedMimeType = 'audio/ogg; codecs=opus';

// ✅ CORRETO - Funciona em Web e Mobile
$normalizedMimeType = 'audio/ogg';
```

### 3. Flag voice:true no Payload

```php
// WhatsAppService.php - sendMediaById()
if ($type === 'audio' && $voice) {
    $mediaPayload['voice'] = true; // Faz aparecer como "mensagem de voz"
}
```

## Arquivos Modificados

### Backend

1. **`app/Services/WhatsAppService.php`**
   - `uploadMedia()` - Lógica de upload com conversão
   - `convertToOggOpus()` - Conversão FFmpeg para OGG OPUS
   - `sendMediaById()` - Envio com flag `voice:true`
   - `findFfmpeg()` - Localiza executável FFmpeg
   - `findFfprobe()` - Localiza executável FFprobe (verificação)

2. **`app/Http/Controllers/WhatsAppController.php`**
   - `sendMedia()` - Endpoint que orquestra upload e envio

### Frontend

1. **`frontend/src/components/chat/AudioRecorder.tsx`**
   - Gravação de áudio com MediaRecorder API
   - Detecção de formato suportado pelo browser
   - Upload para presigned URL (S3/R2)

2. **`frontend/src/components/chat/FileUploadButton.tsx`**
   - Upload de arquivos genéricos
   - Integração com WhatsApp media API

3. **`frontend/src/components/chat/LeadChatModal.tsx`**
   - Exibição de mensagens de áudio
   - WebSocket para mensagens em tempo real

### Configuração

1. **`config/filesystems.php`**
   - Disk `media` para Cloudflare R2
   - Disk `media_local` para desenvolvimento local

## Requisitos do Servidor

### FFmpeg

O servidor precisa ter FFmpeg instalado com suporte a `libopus`:

```bash
# Verificar instalação
ffmpeg -version
ffmpeg -encoders | grep opus

# Deve mostrar:
# A....D libopus    libopus Opus
```

### Docker

No container PHP, FFmpeg deve estar disponível:

```dockerfile
# Exemplo de instalação no Dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

## Logs de Debug

Logs adicionados para troubleshooting (usar `Log::error` para aparecer sempre):

```php
[PTT DEBUG] Starting conversion - Início da conversão
[PTT DEBUG] FFmpeg path - Caminho do FFmpeg encontrado
[PTT DEBUG] Running FFmpeg - Comando sendo executado
[PTT DEBUG] FFmpeg output - Saída do FFmpeg
[PTT DEBUG] FFprobe verification - Verificação do formato de saída
[PTT DEBUG] Uploading media to WhatsApp - Upload para API
[SEND MEDIA DEBUG] sendMedia called - Controller recebeu requisição
[SEND MEDIA DEBUG] uploadMedia result - Resultado do upload
```

### Verificar logs no servidor:

```bash
docker compose logs php --tail=100 | grep "PTT DEBUG"
```

## Formato Final do Arquivo

Verificado com FFprobe:

```json
{
  "streams": [{
    "codec_name": "opus",
    "codec_type": "audio",
    "sample_fmt": "fltp",
    "sample_rate": "16000",
    "channels": 1
  }],
  "format": {
    "format_name": "ogg",
    "duration": "5.123000"
  }
}
```

## Deploy

### Comandos de deploy no VPS:

```bash
# SSH para o servidor
ssh root@crm.omnify.center

# Navegar para o projeto
cd /var/www/crm

# Pull das alterações
git pull origin main

# Limpar caches do Laravel
docker compose exec -T php php artisan optimize:clear
docker compose exec -T php php artisan config:clear

# Reiniciar containers
docker compose restart php queue

# Verificar logs
docker compose logs php --tail=50 | grep "PTT DEBUG"
```

## Checklist de Verificação

- [ ] FFmpeg instalado no container com libopus
- [ ] Arquivo convertido é OGG (não WebM)
- [ ] MIME type é exatamente `audio/ogg` (sem parâmetros)
- [ ] Flag `voice: true` presente no payload
- [ ] Sample rate é 16kHz (CRÍTICO para iPhone!)
- [ ] Bitrate é 32k
- [ ] Frame duration é 20ms
- [ ] VBR constrained habilitado
- [ ] Application mode é `voip`
- [ ] Metadados removidos (`-map_metadata -1`)

## Troubleshooting

### Áudio não toca no mobile

1. Verificar MIME type nos logs - deve ser `audio/ogg`
2. Verificar se FFmpeg está convertendo (procurar por "FFmpeg success")
3. Testar com novo áudio (não usar cache)

### FFmpeg não encontrado

1. Verificar se FFmpeg está no PATH do container
2. Adicionar caminho explícito em `findFfmpeg()`

### Upload falha

1. Verificar credenciais do Cloudflare R2
2. Verificar permissões de escrita no storage
3. Verificar tamanho máximo de upload no PHP/Nginx

## Referências

- [WhatsApp Cloud API - Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [WhatsApp Cloud API - Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [FFmpeg OPUS Documentation](https://trac.ffmpeg.org/wiki/Encode/HighQualityAudio)
- [Opus Codec](https://opus-codec.org/)

---

**Última atualização:** 2024-12-16

**Status:** ✅ Implementado e deployado
