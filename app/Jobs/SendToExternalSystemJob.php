<?php

namespace App\Jobs;

use App\Services\ExternalIntegrationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendToExternalSystemJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array
     */
    public $backoff = [60, 300, 900]; // 1min, 5min, 15min

    /**
     * Create a new job instance.
     *
     * @param Model $model O modelo a ser sincronizado
     * @param string $tenantId ID do tenant
     * @param string|null $triggerEvent Evento que disparou
     * @param string|null $stageId ID do estagio (para lead_stage_changed)
     */
    public function __construct(
        public Model $model,
        public string $tenantId,
        public ?string $triggerEvent = null,
        public ?string $stageId = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ExternalIntegrationService $service): void
    {
        $service->syncModel($this->model, $this->tenantId, $this->triggerEvent, $this->stageId);
    }

    /**
     * Get the tags that should be assigned to the job.
     *
     * @return array<int, string>
     */
    public function tags(): array
    {
        return [
            'external-sync',
            'tenant:' . $this->tenantId,
            'model:' . class_basename($this->model),
        ];
    }
}


