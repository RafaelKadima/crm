<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalIntegrationMapping extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'integration_id',
        'model_type',
        'mapping',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mapping' => 'array',
        ];
    }

    /**
     * Integração do mapeamento.
     */
    public function integration(): BelongsTo
    {
        return $this->belongsTo(ExternalIntegration::class, 'integration_id');
    }

    /**
     * Aplica o mapeamento a um model.
     * Suporta campos nested como: contact.extra_data.city
     */
    public function applyMapping(Model $model): array
    {
        $result = [];

        foreach ($this->mapping as $externalField => $localField) {
            $result[$externalField] = $this->resolveFieldValue($model, $localField);
        }

        return $result;
    }

    /**
     * Resolve o valor de um campo, suportando relacionamentos e campos JSON nested.
     * Exemplos:
     *   - "name" -> $model->name
     *   - "contact.name" -> $model->contact->name
     *   - "contact.extra_data.city" -> $model->contact->extra_data['city']
     */
    protected function resolveFieldValue(Model $model, string $path): mixed
    {
        $parts = explode('.', $path);
        $current = $model;

        foreach ($parts as $index => $part) {
            if ($current === null) {
                return null;
            }

            // Se é um Model, tenta acessar como relacionamento ou atributo
            if ($current instanceof Model) {
                // Verifica se é um relacionamento carregado
                if ($current->relationLoaded($part)) {
                    $current = $current->$part;
                } elseif (isset($current->$part)) {
                    $value = $current->$part;

                    // Se o valor é um array (campo JSON), e ainda tem mais partes no path
                    if (is_array($value) && $index < count($parts) - 1) {
                        // Pega as partes restantes como chave do array
                        $remainingParts = array_slice($parts, $index + 1);
                        return $this->resolveArrayValue($value, $remainingParts);
                    }

                    $current = $value;
                } else {
                    return null;
                }
            } elseif (is_array($current)) {
                // Se já é um array, acessa a chave
                $current = $current[$part] ?? null;
            } else {
                return null;
            }
        }

        return $current;
    }

    /**
     * Resolve valor dentro de um array usando um path de chaves.
     */
    protected function resolveArrayValue(array $array, array $keys): mixed
    {
        $current = $array;

        foreach ($keys as $key) {
            if (!is_array($current) || !array_key_exists($key, $current)) {
                return null;
            }
            $current = $current[$key];
        }

        return $current;
    }
}


