<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class LandingPageProduct extends Pivot
{
    use HasUuids;

    protected $table = 'landing_page_products';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'landing_page_id',
        'product_id',
        'order',
        'is_featured',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'is_featured' => 'boolean',
        ];
    }
}

