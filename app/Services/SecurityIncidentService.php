<?php

namespace App\Services;

use App\Enums\SecurityIncidentSeverityEnum;
use App\Enums\SecurityIncidentTypeEnum;
use App\Models\SecurityIncident;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

/**
 * Pontos de gravação de incidentes de segurança. Sempre fail-safe:
 * se a gravação falha, vai pro log mas nunca lança — não pode bloquear
 * a request principal (que provavelmente já está sendo rejeitada).
 *
 * Severidade high/critical dispara captura no Sentry quando configurado.
 */
class SecurityIncidentService
{
    public function record(
        SecurityIncidentTypeEnum $type,
        ?SecurityIncidentSeverityEnum $severity = null,
        array $metadata = [],
        ?string $tenantId = null,
        ?string $actorId = null,
        ?string $actorEmail = null,
    ): void {
        $severity ??= $type->defaultSeverity();
        $actor = auth()->user();

        try {
            SecurityIncident::create([
                'tenant_id' => $tenantId ?? $actor?->tenant_id,
                'actor_id' => $actorId ?? $actor?->id,
                'actor_email' => $actorEmail ?? $actor?->email,
                'type' => $type->value,
                'severity' => $severity->value,
                'ip' => Request::ip(),
                'user_agent' => substr((string) Request::userAgent(), 0, 500),
                'path' => substr((string) Request::path(), 0, 500),
                'metadata' => $metadata ?: null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to write SecurityIncident', [
                'type' => $type->value,
                'severity' => $severity->value,
                'error' => $e->getMessage(),
            ]);
        }

        // Log estruturado pra Sentry/observabilidade
        $logLevel = match ($severity) {
            SecurityIncidentSeverityEnum::CRITICAL => 'critical',
            SecurityIncidentSeverityEnum::HIGH => 'error',
            SecurityIncidentSeverityEnum::MEDIUM => 'warning',
            SecurityIncidentSeverityEnum::LOW => 'info',
        };

        Log::log($logLevel, "SecurityIncident: {$type->value}", [
            'severity' => $severity->value,
            'tenant_id' => $tenantId ?? $actor?->tenant_id,
            'actor_id' => $actorId ?? $actor?->id,
            'ip' => Request::ip(),
            'metadata' => $metadata,
        ]);

        // Notifica Sentry pra severidades altas (se package presente)
        if ($severity->shouldNotifySentry() && function_exists('\Sentry\captureMessage')) {
            \Sentry\captureMessage(
                "Security incident: {$type->value}",
                $severity === SecurityIncidentSeverityEnum::CRITICAL
                    ? \Sentry\Severity::fatal()
                    : \Sentry\Severity::error()
            );
        }
    }
}
