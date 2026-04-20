<?php

namespace App\Models;

use App\Enums\FunnelCategoryEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FunnelSnapshot extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'snapshot_date',
        'pipeline_id',
        'channel_id',
        'owner_id',
        'funnel_category',
        'leads_entered',
        'leads_exited',
        'value_entered',
        'avg_time_in_category_seconds',
        'samples_for_avg',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'funnel_category' => FunnelCategoryEnum::class,
            'leads_entered' => 'integer',
            'leads_exited' => 'integer',
            'value_entered' => 'decimal:2',
            'avg_time_in_category_seconds' => 'integer',
            'samples_for_avg' => 'integer',
        ];
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeBetween($query, $from, $to)
    {
        return $query->whereBetween('snapshot_date', [$from, $to]);
    }

    public function scopeInCategory($query, FunnelCategoryEnum $category)
    {
        return $query->where('funnel_category', $category->value);
    }
}
