<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotifyLearningSystemJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public array $payload
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $aiServiceUrl = config('services.ai.url', 'http://localhost:8001');
        $aiServiceKey = config('services.ai.key', '');

        $type = $this->payload['type'] ?? 'unknown';
        $endpoint = $this->getEndpointForType($type);

        if (!$endpoint) {
            Log::warning('Unknown learning notification type', ['type' => $type]);
            return;
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Internal-Key' => $aiServiceKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$aiServiceUrl}{$endpoint}", $this->payload);

            if ($response->successful()) {
                Log::info('Learning system notified', [
                    'type' => $type,
                    'tenant_id' => $this->payload['tenant_id'] ?? null,
                    'status' => $response->status(),
                ]);
            } else {
                Log::warning('Learning system notification failed', [
                    'type' => $type,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                // Re-tenta se for erro do servidor
                if ($response->serverError()) {
                    $this->release(60);
                }
            }
        } catch (\Exception $e) {
            Log::error('Learning system notification error', [
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Retorna o endpoint apropriado para o tipo de notificação
     */
    protected function getEndpointForType(string $type): ?string
    {
        return match ($type) {
            'ads_conversion' => '/learning/ads/conversion',
            'campaign_feedback' => '/learning/ads/feedback',
            'pattern_detected' => '/learning/ads/pattern',
            'sdr_feedback' => '/learning/feedback',
            default => null,
        };
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('NotifyLearningSystemJob failed permanently', [
            'type' => $this->payload['type'] ?? 'unknown',
            'tenant_id' => $this->payload['tenant_id'] ?? null,
            'error' => $exception->getMessage(),
        ]);
    }
}

