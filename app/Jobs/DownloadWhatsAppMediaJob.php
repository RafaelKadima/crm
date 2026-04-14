<?php

namespace App\Jobs;

use App\Events\TicketMessageCreated;
use App\Models\Channel;
use App\Models\TicketMessage;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Baixa uma mídia do WhatsApp (áudio, imagem, vídeo, documento) de forma
 * assíncrona com retry.
 *
 * A URL retornada pela Meta expira em ~5 minutos, então o job roda em fila
 * dedicada com backoff curto para terminar antes desse TTL.
 *
 * Disparado por WhatsAppService::extractMediaMetadata quando o download
 * síncrono falha ou quando o payload é processado em lote.
 */
class DownloadWhatsAppMediaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;
    public int $timeout = 120;

    public function __construct(
        public string $ticketMessageId,
        public string $mediaId,
        public string $channelId,
    ) {
        $this->onQueue('whatsapp-media');
    }

    /**
     * Backoff: 10s, 30s, 90s — fica sob o TTL de 5min da URL Meta se
     * re-busca de URL for necessária. Após 4 tentativas, falha definitiva.
     */
    public function backoff(): array
    {
        return [10, 30, 90];
    }

    public function handle(WhatsAppService $service): void
    {
        $ticketMessage = TicketMessage::withoutGlobalScopes()->find($this->ticketMessageId);
        $channel = Channel::withoutGlobalScopes()->find($this->channelId);

        if (!$ticketMessage || !$channel) {
            Log::warning('DownloadWhatsAppMediaJob: message or channel missing', [
                'ticket_message_id' => $this->ticketMessageId,
                'channel_id' => $this->channelId,
            ]);
            return;
        }

        $metadata = $ticketMessage->metadata ?? [];

        // Já baixou com sucesso entre o agendamento e a execução
        if (!empty($metadata['media_url']) && empty($metadata['media_pending'])) {
            return;
        }

        $url = $service->fetchAndStoreMedia($this->mediaId, $channel);

        if (!$url) {
            Log::warning('DownloadWhatsAppMediaJob: fetch failed (will retry)', [
                'media_id' => $this->mediaId,
                'attempt' => $this->attempts(),
            ]);
            $this->release($this->backoff()[min($this->attempts() - 1, 2)] ?? 90);
            return;
        }

        $metadata['media_url'] = $url;
        $mediaType = $metadata['media_type'] ?? null;
        if ($mediaType) {
            $metadata["{$mediaType}_url"] = $url;
        }
        unset($metadata['media_pending']);

        $ticketMessage->update(['metadata' => $metadata]);

        // Notifica UI para substituir "carregando..." pelo player/imagem
        if ($ticketMessage->ticket) {
            event(new TicketMessageCreated($ticketMessage, $ticketMessage->ticket));
        }

        Log::info('DownloadWhatsAppMediaJob: media fetched', [
            'ticket_message_id' => $ticketMessage->id,
            'media_id' => $this->mediaId,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('DownloadWhatsAppMediaJob: permanent failure', [
            'ticket_message_id' => $this->ticketMessageId,
            'media_id' => $this->mediaId,
            'error' => $exception->getMessage(),
        ]);

        $ticketMessage = TicketMessage::withoutGlobalScopes()->find($this->ticketMessageId);
        if ($ticketMessage) {
            $metadata = $ticketMessage->metadata ?? [];
            $metadata['media_pending'] = false;
            $metadata['media_failed'] = true;
            $metadata['media_error'] = $exception->getMessage();
            $ticketMessage->update(['metadata' => $metadata]);
        }
    }
}
