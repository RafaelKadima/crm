<?php

namespace App\Traits;

use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Model;

/**
 * Aplica audit log automático em created/updated/deleted/restored.
 *
 * Models que usam o trait podem opcionalmente declarar:
 *   - `protected array $auditExclude` — campos que nunca vão pro before/after
 *     (default já remove password, *_token, *_secret, *_key)
 *   - `protected bool $auditUpdates = true` — desliga audit em updates se
 *     for muito barulhento (ex: timestamps, last_seen_at)
 */
trait Auditable
{
    /**
     * Campos sensíveis que nunca devem ir pro audit log.
     * Models podem estender via $auditExclude.
     */
    protected static array $auditDefaultExcludes = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'access_token',
        'refresh_token',
        'app_secret',
        'api_key',
        'webhook_secret',
    ];

    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            if (!self::shouldAudit($model, 'created')) return;
            app(AuditLogService::class)->record(
                action: 'created',
                model: $model,
                after: self::auditableAttributes($model, $model->getAttributes()),
            );
        });

        static::updated(function (Model $model) {
            if (!self::shouldAudit($model, 'updated')) return;

            $changes = $model->getChanges();
            // Skip se mudanças são só timestamps (ruído)
            $meaningfulChanges = array_diff_key($changes, array_flip(['updated_at', 'last_seen_at']));
            if (empty($meaningfulChanges)) return;

            $original = array_intersect_key($model->getOriginal(), $changes);
            $afterFiltered = self::auditableAttributes($model, $changes);
            $beforeFiltered = self::auditableAttributes($model, $original);

            // Se filtragem zerou as mudanças (eram só campos sensíveis),
            // ainda audita mas sem before/after detalhado.
            $hadSecretChange = count($changes) !== count($afterFiltered);

            app(AuditLogService::class)->record(
                action: 'updated',
                model: $model,
                before: $beforeFiltered ?: null,
                after: $afterFiltered ?: null,
                changes: array_keys($meaningfulChanges),
                metadata: $hadSecretChange ? ['secret_field_changed' => true] : [],
            );
        });

        static::deleted(function (Model $model) {
            if (!self::shouldAudit($model, 'deleted')) return;
            app(AuditLogService::class)->record(
                action: 'deleted',
                model: $model,
                before: self::auditableAttributes($model, $model->getOriginal()),
            );
        });

        // Soft-delete restore se model tem SoftDeletes
        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) {
                if (!self::shouldAudit($model, 'restored')) return;
                app(AuditLogService::class)->record(
                    action: 'restored',
                    model: $model,
                    after: self::auditableAttributes($model, $model->getAttributes()),
                );
            });
        }
    }

    protected static function shouldAudit(Model $model, string $action): bool
    {
        if ($action === 'updated' && property_exists($model, 'auditUpdates')) {
            return $model->auditUpdates !== false;
        }
        return true;
    }

    /**
     * Filtra atributos sensíveis antes de gravar.
     */
    protected static function auditableAttributes(Model $model, array $attributes): array
    {
        $excludes = array_merge(
            self::$auditDefaultExcludes,
            property_exists($model, 'auditExclude') && is_array($model->auditExclude)
                ? $model->auditExclude
                : []
        );

        return array_diff_key($attributes, array_flip($excludes));
    }
}
