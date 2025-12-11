<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pipeline extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'is_default',
        'is_public',
        'sdr_agent_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_public' => 'boolean',
        ];
    }

    /**
     * Estágios do pipeline.
     */
    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->orderBy('order');
    }

    /**
     * Leads neste pipeline.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Agente SDR associado a este pipeline.
     */
    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    /**
     * Verifica se este pipeline tem um agente SDR configurado.
     */
    public function hasSdrAgent(): bool
    {
        return $this->sdr_agent_id !== null;
    }

    /**
     * Primeiro estágio do pipeline.
     */
    public function firstStage(): ?PipelineStage
    {
        return $this->stages()->orderBy('order')->first();
    }

    /**
     * Último estágio do pipeline.
     */
    public function lastStage(): ?PipelineStage
    {
        return $this->stages()->orderByDesc('order')->first();
    }

    /**
     * Define este pipeline como padrão (remove de outros).
     */
    public function setAsDefault(): void
    {
        // Remove o padrão dos outros pipelines do tenant
        static::where('tenant_id', $this->tenant_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        $this->update(['is_default' => true]);
    }

    /**
     * Usuários com acesso a este pipeline.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pipeline_user')
            ->withPivot(['can_view', 'can_edit', 'can_delete', 'can_manage_leads'])
            ->withTimestamps();
    }

    /**
     * Verifica se um usuário tem acesso a este pipeline.
     */
    public function userHasAccess(?User $user): bool
    {
        if (!$user) return false;
        
        // Admin e gestor sempre têm acesso
        if (in_array($user->role->value, ['admin', 'gestor']) || $user->is_super_admin) {
            return true;
        }

        // Pipeline público
        if ($this->is_public) {
            return true;
        }

        // Verifica permissão específica
        return $this->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Verifica se usuário pode editar o pipeline.
     */
    public function userCanEdit(?User $user): bool
    {
        if (!$user) return false;
        
        if (in_array($user->role->value, ['admin', 'gestor']) || $user->is_super_admin) {
            return true;
        }

        $pivot = $this->users()->where('user_id', $user->id)->first()?->pivot;
        return $pivot?->can_edit ?? false;
    }

    /**
     * Verifica se usuário pode gerenciar leads no pipeline.
     */
    public function userCanManageLeads(?User $user): bool
    {
        if (!$user) return false;
        
        if (in_array($user->role->value, ['admin', 'gestor']) || $user->is_super_admin) {
            return true;
        }

        // Pipeline público permite gerenciar leads
        if ($this->is_public) {
            return true;
        }

        $pivot = $this->users()->where('user_id', $user->id)->first()?->pivot;
        return $pivot?->can_manage_leads ?? false;
    }

    /**
     * Scope para pipelines acessíveis por um usuário.
     */
    public function scopeAccessibleBy($query, User $user)
    {
        // Admin e gestor veem tudo
        if (in_array($user->role->value, ['admin', 'gestor']) || $user->is_super_admin) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('is_public', true)
              ->orWhereHas('users', function ($q2) use ($user) {
                  $q2->where('user_id', $user->id)->where('can_view', true);
              });
        });
    }

    /**
     * Retorna os IDs dos vendedores com permissão de gerenciar leads neste pipeline.
     * 
     * Lógica:
     * - Se pipeline é público: retorna todos os vendedores ativos do tenant
     * - Se pipeline é privado: retorna apenas usuários com can_manage_leads = true
     */
    public function getUserIdsWithLeadPermission(): array
    {
        // Se pipeline é público, retorna todos os vendedores ativos
        if ($this->is_public) {
            return User::where('tenant_id', $this->tenant_id)
                ->where('role', \App\Enums\RoleEnum::VENDEDOR)
                ->where('is_active', true)
                ->pluck('id')
                ->toArray();
        }

        // Pipeline privado: retorna apenas usuários com permissão can_manage_leads
        return $this->users()
            ->where('pipeline_user.can_manage_leads', true)
            ->where('users.is_active', true)
            ->where('users.role', \App\Enums\RoleEnum::VENDEDOR)
            ->pluck('users.id')
            ->toArray();
    }
}


