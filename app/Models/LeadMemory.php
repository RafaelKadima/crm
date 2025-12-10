<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Memória de longo prazo do Lead
 * Armazena preferências, comportamento e insights
 */
class LeadMemory extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'lead_memory';

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'preferences',
        'interests',
        'pain_points',
        'objections_history',
        'communication_style',
        'decision_pattern',
        'response_time_avg',
        'active_hours',
        'total_interactions',
        'positive_interactions',
        'meetings_scheduled',
        'meetings_attended',
        'purchases',
        'total_purchased',
        'ml_insights',
        'conversion_probability',
        'recommended_approach',
        'summary_embedding',
        'last_interaction_at',
    ];

    protected $casts = [
        'preferences' => 'array',
        'interests' => 'array',
        'pain_points' => 'array',
        'objections_history' => 'array',
        'active_hours' => 'array',
        'ml_insights' => 'array',
        'response_time_avg' => 'float',
        'conversion_probability' => 'float',
        'total_purchased' => 'decimal:2',
        'last_interaction_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    // Métodos para atualizar memória
    public function addInteraction(bool $wasPositive = true): void
    {
        $this->increment('total_interactions');
        if ($wasPositive) {
            $this->increment('positive_interactions');
        }
        $this->last_interaction_at = now();
        $this->save();
    }

    public function addInterest(string $interest): void
    {
        $interests = $this->interests ?? [];
        if (!in_array($interest, $interests)) {
            $interests[] = $interest;
            $this->interests = $interests;
            $this->save();
        }
    }

    public function addPainPoint(string $painPoint): void
    {
        $painPoints = $this->pain_points ?? [];
        if (!in_array($painPoint, $painPoints)) {
            $painPoints[] = $painPoint;
            $this->pain_points = $painPoints;
            $this->save();
        }
    }

    public function addObjection(string $objection, ?string $response = null): void
    {
        $history = $this->objections_history ?? [];
        $history[] = [
            'objection' => $objection,
            'response' => $response,
            'date' => now()->toIso8601String(),
        ];
        $this->objections_history = array_slice($history, -20); // Mantém últimas 20
        $this->save();
    }

    public function setPreference(string $key, $value): void
    {
        $preferences = $this->preferences ?? [];
        $preferences[$key] = $value;
        $this->preferences = $preferences;
        $this->save();
    }

    public function getPreference(string $key, $default = null)
    {
        return ($this->preferences ?? [])[$key] ?? $default;
    }

    public function updateCommunicationStyle(string $style): void
    {
        $this->communication_style = $style;
        $this->save();
    }

    public function recordMeeting(bool $attended = true): void
    {
        $this->increment('meetings_scheduled');
        if ($attended) {
            $this->increment('meetings_attended');
        }
        $this->save();
    }

    public function recordPurchase(float $amount): void
    {
        $this->increment('purchases');
        $this->total_purchased += $amount;
        $this->save();
    }

    public function updateMlInsights(array $insights): void
    {
        $this->ml_insights = array_merge($this->ml_insights ?? [], $insights);
        $this->save();
    }

    // Getters úteis
    public function getPositiveRate(): float
    {
        if ($this->total_interactions === 0) {
            return 0;
        }
        return round($this->positive_interactions / $this->total_interactions * 100, 2);
    }

    public function getMeetingAttendanceRate(): float
    {
        if ($this->meetings_scheduled === 0) {
            return 0;
        }
        return round($this->meetings_attended / $this->meetings_scheduled * 100, 2);
    }

    public function getContextForAgent(): array
    {
        return [
            'preferences' => $this->preferences,
            'interests' => $this->interests,
            'pain_points' => $this->pain_points,
            'communication_style' => $this->communication_style,
            'decision_pattern' => $this->decision_pattern,
            'conversion_probability' => $this->conversion_probability,
            'recommended_approach' => $this->recommended_approach,
            'total_interactions' => $this->total_interactions,
            'positive_rate' => $this->getPositiveRate(),
            'meeting_attendance_rate' => $this->getMeetingAttendanceRate(),
            'last_objections' => array_slice($this->objections_history ?? [], -3),
        ];
    }
}

