<?php

namespace App\Modules\Meta\Jobs;

use App\Modules\Meta\Services\MetaTokenService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RefreshMetaTokenJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número de dias antes da expiração para renovar.
     */
    protected int $daysThreshold;

    /**
     * Create a new job instance.
     */
    public function __construct(int $daysThreshold = 7)
    {
        $this->daysThreshold = $daysThreshold;
    }

    /**
     * Execute the job.
     */
    public function handle(MetaTokenService $tokenService): void
    {
        Log::info('RefreshMetaTokenJob started', [
            'days_threshold' => $this->daysThreshold,
        ]);

        try {
            $stats = $tokenService->refreshExpiringTokens($this->daysThreshold);

            Log::info('RefreshMetaTokenJob completed', $stats);

            // Se houver falhas, loga um warning
            if ($stats['failed'] > 0) {
                Log::warning('RefreshMetaTokenJob had failures', [
                    'failed_count' => $stats['failed'],
                    'total' => $stats['total'],
                ]);
            }

        } catch (\Exception $e) {
            Log::error('RefreshMetaTokenJob failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('RefreshMetaTokenJob failed completely', [
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<int, string>
     */
    public function tags(): array
    {
        return ['meta', 'token-refresh'];
    }
}
