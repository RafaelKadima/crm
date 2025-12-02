<?php

namespace App\Models;

use App\Enums\PlanEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'plan',
        'whatsapp_number',
        'ia_enabled',
        'ia_workflow_id',
        'settings',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'plan' => PlanEnum::class,
            'ia_enabled' => 'boolean',
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relacionamento com usuários do tenant.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Relacionamento com times do tenant.
     */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /**
     * Relacionamento com canais do tenant.
     */
    public function channels(): HasMany
    {
        return $this->hasMany(Channel::class);
    }

    /**
     * Relacionamento com contatos do tenant.
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /**
     * Relacionamento com pipelines do tenant.
     */
    public function pipelines(): HasMany
    {
        return $this->hasMany(Pipeline::class);
    }

    /**
     * Relacionamento com leads do tenant.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Grupos que o tenant pertence.
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_tenant')
            ->withTimestamps();
    }

    /**
     * Verifica se o tenant pertence a algum grupo.
     */
    public function belongsToGroup(): bool
    {
        return $this->groups()->exists();
    }

    /**
     * Verifica se o tenant tem IA SDR habilitada.
     */
    public function hasIaSdr(): bool
    {
        return $this->ia_enabled && $this->plan->hasIaSdr();
    }

    /**
     * Verifica se o tenant é Enterprise.
     */
    public function isEnterprise(): bool
    {
        return $this->plan === PlanEnum::ENTERPRISE;
    }

    /**
     * Retorna configuração específica do tenant.
     */
    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }

    /**
     * Define configuração específica do tenant.
     */
    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings ?? [];
        data_set($settings, $key, $value);
        $this->settings = $settings;
        $this->save();
    }
}


