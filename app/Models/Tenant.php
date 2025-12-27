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
        'fix_agent_settings',
        'is_active',
        'logo_url',
        'logo_dark_url',
        'favicon_url',
        'branding',
        // Campos de integracao Linx
        'linx_enabled',
        'linx_empresa_id',
        'linx_revenda_id',
        'linx_api_url',
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
            'fix_agent_settings' => 'array',
            'branding' => 'array',
            'is_active' => 'boolean',
            'linx_enabled' => 'boolean',
        ];
    }

    /**
     * Branding padrão.
     */
    public const DEFAULT_BRANDING = [
        'primary_color' => '#3B82F6',
        'secondary_color' => '#8B5CF6',
        'accent_color' => '#10B981',
        'sidebar_color' => '#111827',
        'sidebar_text_color' => '#F9FAFB',
        'header_color' => '#1F2937',
        'header_text_color' => '#F9FAFB',
        'button_radius' => '8',
        'font_family' => 'DM Sans',
    ];

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
     * Relacionamento com produtos do tenant.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Relacionamento com agentes SDR do tenant.
     */
    public function sdrAgents(): HasMany
    {
        return $this->hasMany(SdrAgent::class);
    }

    /**
     * Relacionamento com quotas do tenant.
     */
    public function quota(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(TenantQuota::class);
    }

    /**
     * Relacionamento com estatísticas de uso do tenant.
     */
    public function usageStats(): HasMany
    {
        return $this->hasMany(TenantUsageStats::class);
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
     * Verifica se o tenant tem integracao Linx habilitada.
     */
    public function hasLinxIntegration(): bool
    {
        return $this->linx_enabled && !empty($this->linx_empresa_id) && !empty($this->linx_revenda_id);
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

    /**
     * Retorna configuração de branding específica.
     */
    public function getBranding(string $key, mixed $default = null): mixed
    {
        $branding = $this->branding ?? self::DEFAULT_BRANDING;
        return data_get($branding, $key, $default ?? data_get(self::DEFAULT_BRANDING, $key));
    }

    /**
     * Retorna todo o branding mesclado com valores padrão.
     */
    public function getFullBranding(): array
    {
        return array_merge(self::DEFAULT_BRANDING, $this->branding ?? []);
    }

    /**
     * Define configuração de branding específica.
     */
    public function setBranding(string $key, mixed $value): void
    {
        $branding = $this->branding ?? [];
        data_set($branding, $key, $value);
        $this->branding = $branding;
        $this->save();
    }

    /**
     * Atualiza múltiplas configurações de branding.
     */
    public function updateBranding(array $values): void
    {
        $branding = $this->branding ?? [];
        foreach ($values as $key => $value) {
            data_set($branding, $key, $value);
        }
        $this->branding = $branding;
        $this->save();
    }

    /**
     * Retorna a logo apropriada baseada no tema.
     */
    public function getLogo(string $theme = 'dark'): ?string
    {
        if ($theme === 'light' && $this->logo_url) {
            return $this->logo_url;
        }
        
        return $this->logo_dark_url ?? $this->logo_url;
    }
}


