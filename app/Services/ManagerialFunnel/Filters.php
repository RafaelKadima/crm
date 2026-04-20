<?php

namespace App\Services\ManagerialFunnel;

/**
 * DTO imutável dos filtros aplicáveis aos relatórios gerenciais.
 * Todos os filtros são opcionais; ausência = sem restrição naquela dimensão.
 */
class Filters
{
    public function __construct(
        public readonly ?string $dateFrom = null,
        public readonly ?string $dateTo = null,
        public readonly ?string $pipelineId = null,
        public readonly ?string $channelId = null,
        public readonly ?string $ownerId = null,
        public readonly ?string $queueId = null,
    ) {
    }

    public static function fromRequest(\Illuminate\Http\Request $request): self
    {
        return new self(
            dateFrom: $request->input('date_from'),
            dateTo: $request->input('date_to'),
            pipelineId: $request->input('pipeline_id'),
            channelId: $request->input('channel_id'),
            ownerId: $request->input('owner_id'),
            queueId: $request->input('queue_id'),
        );
    }

    public function withDates(?string $dateFrom, ?string $dateTo): self
    {
        return new self(
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            pipelineId: $this->pipelineId,
            channelId: $this->channelId,
            ownerId: $this->ownerId,
            queueId: $this->queueId,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'date_from' => $this->dateFrom,
            'date_to' => $this->dateTo,
            'pipeline_id' => $this->pipelineId,
            'channel_id' => $this->channelId,
            'owner_id' => $this->ownerId,
            'queue_id' => $this->queueId,
        ]);
    }
}
