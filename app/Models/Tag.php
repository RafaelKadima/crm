<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Str;

class Tag extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, Auditable;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'color',
    ];

    protected static function booted(): void
    {
        static::saving(function (Tag $tag) {
            if (empty($tag->slug)) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }

    public function tickets(): MorphToMany
    {
        return $this->morphedByMany(Ticket::class, 'taggable')->withTimestamps();
    }

    public function leads(): MorphToMany
    {
        return $this->morphedByMany(Lead::class, 'taggable')->withTimestamps();
    }
}
