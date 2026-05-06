<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

/**
 * Ponto único de gravação de audit logs. Resolve o ator (user logado /
 * sistema), captura IP e user-agent, e grava de forma silenciosa —
 * falhas de audit nunca devem quebrar a request principal.
 */
class AuditLogService
{
    /**
     * Registra um evento de mudança em modelo. Os arrays before/after
     * já vêm filtrados pelo Auditable trait (sem secrets).
     */
    public function record(
        string $action,
        Model $model,
        ?array $before = null,
        ?array $after = null,
        ?array $changes = null,
        array $metadata = [],
    ): void {
        try {
            $actor = auth()->user();

            AuditLog::create([
                'tenant_id' => $this->resolveTenantId($model, $actor),
                'actor_id' => $actor?->id,
                'actor_type' => $actor ? get_class($actor) : null,
                'actor_email' => $actor?->email,
                'actor_is_super_admin' => (bool) ($actor?->is_super_admin ?? false),
                'action' => $action,
                'model_type' => get_class($model),
                'model_id' => (string) $model->getKey(),
                'before' => $before,
                'after' => $after,
                'changes' => $changes,
                'ip' => Request::ip(),
                'user_agent' => substr((string) Request::userAgent(), 0, 500),
                'request_id' => Request::header('X-Request-ID'),
                'metadata' => $metadata ?: null,
            ]);
        } catch (\Throwable $e) {
            // Audit log nunca pode quebrar a operação principal.
            // Mas é importante saber que falhou — vai pra error log.
            Log::error('Failed to write audit log', [
                'action' => $action,
                'model_type' => get_class($model),
                'model_id' => $model->getKey(),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Registra evento custom (ex: login, password_change, 2fa_enabled)
     * onde não há um Eloquent::saving direto.
     */
    public function recordEvent(
        string $action,
        Model $subject,
        array $metadata = [],
    ): void {
        $this->record(
            action: $action,
            model: $subject,
            metadata: $metadata,
        );
    }

    protected function resolveTenantId(Model $model, $actor): ?string
    {
        if (isset($model->tenant_id)) {
            return $model->tenant_id;
        }

        return $actor?->tenant_id;
    }
}
