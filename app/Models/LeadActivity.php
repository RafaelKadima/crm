<?php

namespace App\Models;

use App\Enums\ActivitySourceEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'user_id',
        'source',
        'type',
        'data',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'source' => ActivitySourceEnum::class,
            'data' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($activity) {
            if (!$activity->created_at) {
                $activity->created_at = now();
            }
        });
    }

    /**
     * Lead da atividade.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Usuário que realizou a atividade.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Cria atividade de mudança de estágio.
     */
    public static function stageChanged(Lead $lead, PipelineStage $oldStage, PipelineStage $newStage, ?User $user = null, ActivitySourceEnum $source = ActivitySourceEnum::USER): self
    {
        return static::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'user_id' => $user?->id,
            'source' => $source,
            'type' => 'stage_changed',
            'data' => [
                'old_stage_id' => $oldStage->id,
                'old_stage_name' => $oldStage->name,
                'new_stage_id' => $newStage->id,
                'new_stage_name' => $newStage->name,
            ],
        ]);
    }

    /**
     * Cria atividade de atribuição de vendedor.
     */
    public static function ownerAssigned(Lead $lead, ?User $oldOwner, User $newOwner, ?User $assignedBy = null, ActivitySourceEnum $source = ActivitySourceEnum::USER): self
    {
        return static::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'user_id' => $assignedBy?->id,
            'source' => $source,
            'type' => 'owner_assigned',
            'data' => [
                'old_owner_id' => $oldOwner?->id,
                'old_owner_name' => $oldOwner?->name,
                'new_owner_id' => $newOwner->id,
                'new_owner_name' => $newOwner->name,
            ],
        ]);
    }

    /**
     * Cria atividade de mensagem enviada.
     */
    public static function messageSent(Lead $lead, TicketMessage $message, ActivitySourceEnum $source = ActivitySourceEnum::USER): self
    {
        return static::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'user_id' => $message->sender_id,
            'source' => $source,
            'type' => 'message_sent',
            'data' => [
                'message_id' => $message->id,
                'direction' => $message->direction->value,
                'sender_type' => $message->sender_type->value,
            ],
        ]);
    }
}


