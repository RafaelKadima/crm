<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingPageStat extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'landing_page_id',
        'date',
        'views',
        'unique_views',
        'leads',
        'conversion_rate',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'views' => 'integer',
            'unique_views' => 'integer',
            'leads' => 'integer',
            'conversion_rate' => 'decimal:2',
        ];
    }

    /**
     * Landing Page
     */
    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(LandingPage::class);
    }
}

