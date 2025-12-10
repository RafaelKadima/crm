<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SuperAdminLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'action',
        'target_tenant_id',
        'target_user_id',
        'data',
        'ip_address',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    /**
     * Super admin que realizou a ação.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Tenant alvo da ação.
     */
    public function targetTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'target_tenant_id');
    }

    /**
     * Usuário alvo da ação.
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Registra uma ação do super admin.
     */
    public static function log(
        string $action,
        ?string $targetTenantId = null,
        ?string $targetUserId = null,
        array $data = []
    ): self {
        return static::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'target_tenant_id' => $targetTenantId,
            'target_user_id' => $targetUserId,
            'data' => $data,
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Tipos de ações disponíveis.
     */
    public static function getActionTypes(): array
    {
        return [
            'tenant.create' => 'Criar empresa',
            'tenant.update' => 'Atualizar empresa',
            'tenant.disable' => 'Desativar empresa',
            'tenant.enable' => 'Ativar empresa',
            'tenant.delete' => 'Excluir empresa',
            'user.create' => 'Criar usuário',
            'user.update' => 'Atualizar usuário',
            'user.disable' => 'Desativar usuário',
            'user.enable' => 'Ativar usuário',
            'user.delete' => 'Excluir usuário',
            'feature.enable' => 'Ativar feature',
            'feature.disable' => 'Desativar feature',
            'plan.change' => 'Alterar plano',
        ];
    }
}

