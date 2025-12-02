<?php

namespace App\Models;

use App\Enums\ChannelTypeEnum;
use App\Enums\IaModeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Channel extends Model
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
        'type',
        'identifier',
        'ia_mode',
        'ia_workflow_id',
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
            'type' => ChannelTypeEnum::class,
            'ia_mode' => IaModeEnum::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * Leads originados deste canal.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Tickets originados deste canal.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Verifica se o canal usa IA.
     */
    public function hasIa(): bool
    {
        return $this->ia_mode->hasIa();
    }

    /**
     * Verifica se é canal de WhatsApp.
     */
    public function isWhatsApp(): bool
    {
        return $this->type === ChannelTypeEnum::WHATSAPP;
    }
}


