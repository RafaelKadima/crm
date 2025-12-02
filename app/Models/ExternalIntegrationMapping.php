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
     */
    public function applyMapping(Model $model): array
    {
        $result = [];

        foreach ($this->mapping as $externalField => $localField) {
            if (str_contains($localField, '.')) {
                // Campo relacionado: contact.name, contact.phone
                $parts = explode('.', $localField);
                $relation = $parts[0];
                $field = $parts[1];
                
                if ($model->relationLoaded($relation) && $model->$relation) {
                    $result[$externalField] = $model->$relation->$field;
                }
            } else {
                // Campo direto
                $result[$externalField] = $model->$localField;
            }
        }

        return $result;
    }
}


