<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Registro append-only de auditoria. NUNCA editar diretamente —
 * o model não tem updated_at por design.
 *
 * Multi-tenant: tenant_id pode ser null pra eventos system-wide
 * (super admin agindo cross-tenant). Quando setado, segue o
 * pattern de scoping da app.
 */
class AuditLog extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'actor_id',
        'actor_type',
        'actor_email',
        'actor_is_super_admin',
        'action',
        'model_type',
        'model_id',
        'before',
        'after',
        'changes',
        'ip',
        'user_agent',
        'request_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'changes' => 'array',
            'metadata' => 'array',
            'actor_is_super_admin' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function actor(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Resolve o model auditado, se ainda existir.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo(name: 'model', type: 'model_type', id: 'model_id');
    }
}
