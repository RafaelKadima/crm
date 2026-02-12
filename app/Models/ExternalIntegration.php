<?php

namespace App\Models;

use App\Enums\AuthTypeEnum;
use App\Enums\HttpMethodEnum;
use App\Enums\IntegrationTypeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class ExternalIntegration extends Model
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
        'slug',
        'description',
        'type',
        'endpoint_url',
        'http_method',
        'headers',
        'auth_type',
        'auth_config',
        'trigger_on',
        'trigger_stages',
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
            'type' => IntegrationTypeEnum::class,
            'http_method' => HttpMethodEnum::class,
            'headers' => 'array',
            'auth_type' => AuthTypeEnum::class,
            // auth_config uses custom accessor to handle decryption errors
            'trigger_on' => 'array',
            'trigger_stages' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Custom accessor for auth_config to handle decryption errors gracefully.
     * This prevents 500 errors when data was encrypted with a different APP_KEY.
     */
    protected function authConfig(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) {
                    return [];
                }

                try {
                    $decrypted = Crypt::decrypt($value, false);
                    return is_array($decrypted) ? $decrypted : json_decode($decrypted, true) ?? [];
                } catch (DecryptException $e) {
                    // Log the error but return empty array to prevent 500
                    \Log::warning('Failed to decrypt auth_config for integration', [
                        'integration_id' => $this->id ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                    return ['_decryption_failed' => true];
                }
            },
            set: function ($value) {
                if (empty($value)) {
                    return null;
                }
                return Crypt::encrypt(is_array($value) ? $value : json_decode($value, true));
            }
        );
    }

    /**
     * Scope para filtrar integracoes por evento de trigger.
     */
    public function scopeTriggeredBy($query, string $event)
    {
        return $query->whereJsonContains('trigger_on', $event);
    }

    /**
     * Verifica se a integracao e acionada por um evento especifico.
     */
    public function isTriggeredBy(string $event): bool
    {
        return is_array($this->trigger_on) && in_array($event, $this->trigger_on);
    }

    /**
     * Verifica se a integracao deve ser acionada para um estagio especifico.
     * Retorna true se:
     * - trigger_stages esta vazio/null (dispara para qualquer estagio)
     * - O stageId esta na lista de trigger_stages
     */
    public function shouldTriggerForStage(?string $stageId): bool
    {
        // Se nao tem trigger_stages configurado, dispara para qualquer estagio
        if (empty($this->trigger_stages)) {
            return true;
        }

        // Verifica se o estagio esta na lista
        return in_array($stageId, $this->trigger_stages);
    }

    /**
     * Mapeamentos desta integração.
     */
    public function mappings(): HasMany
    {
        return $this->hasMany(ExternalIntegrationMapping::class, 'integration_id');
    }

    /**
     * Logs desta integração.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(ExternalIntegrationLog::class, 'integration_id');
    }

    /**
     * Retorna o mapeamento para um model específico.
     */
    public function getMappingFor(string $modelType): ?ExternalIntegrationMapping
    {
        return $this->mappings()->where('model_type', $modelType)->first();
    }
}


