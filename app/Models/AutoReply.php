<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AutoReply extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes, Auditable;

    public const MATCH_EXACT = 'exact';
    public const MATCH_CONTAINS = 'contains';
    public const MATCH_REGEX = 'regex';

    public const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];

    protected $fillable = [
        'tenant_id',
        'channel_id',
        'queue_id',
        'name',
        'keywords',
        'match_type',
        'response_text',
        'response_media_url',
        'response_media_type',
        'priority',
        'is_active',
        'skip_ai_after_match',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'is_active' => 'boolean',
            'skip_ai_after_match' => 'boolean',
            'priority' => 'integer',
        ];
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }
}
