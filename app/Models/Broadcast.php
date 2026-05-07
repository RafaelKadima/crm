<?php

namespace App\Models;

use App\Enums\BroadcastStatusEnum;
use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Broadcast extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes, Auditable;

    protected $fillable = [
        'tenant_id',
        'channel_id',
        'created_by',
        'whatsapp_template_id',
        'name',
        'filters',
        'template_variables',
        'status',
        'total_recipients',
        'sent_count',
        'delivered_count',
        'read_count',
        'failed_count',
        'scheduled_at',
        'started_at',
        'completed_at',
        'send_window_start',
        'send_window_end',
        'send_window_timezone',
        'respect_business_hours',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'template_variables' => 'array',
            'status' => BroadcastStatusEnum::class,
            'total_recipients' => 'integer',
            'sent_count' => 'integer',
            'delivered_count' => 'integer',
            'read_count' => 'integer',
            'failed_count' => 'integer',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'respect_business_hours' => 'boolean',
        ];
    }

    /**
     * Verifica se o broadcast está dentro da janela permitida pra
     * enviar agora. Retorna `null` se está fora — caller deve
     * postergar pro próximo horário válido (ver
     * `nextAllowedSendAt()`).
     */
    public function isWithinSendWindow(?\Carbon\Carbon $at = null): bool
    {
        if (empty($this->send_window_start) || empty($this->send_window_end)) {
            return true;
        }

        $tz = $this->send_window_timezone ?: config('app.timezone');
        $now = ($at ?? now())->copy()->setTimezone($tz);
        $current = $now->format('H:i:s');
        $start = $this->send_window_start;
        $end = $this->send_window_end;

        // Janela cruzando meia-noite (ex: 22:00–06:00) — atende start..24h OR 00..end
        if ($start > $end) {
            return $current >= $start || $current < $end;
        }

        return $current >= $start && $current < $end;
    }

    /**
     * Calcula o próximo instante em que o broadcast pode disparar
     * dado a send_window e (opcional) business_hours do canal.
     * Retorna o Carbon ou null se não tiver janela configurada.
     */
    public function nextAllowedSendAt(?\Carbon\Carbon $at = null): ?\Carbon\Carbon
    {
        if (empty($this->send_window_start) || empty($this->send_window_end)) {
            return null;
        }

        $tz = $this->send_window_timezone ?: config('app.timezone');
        $candidate = ($at ?? now())->copy()->setTimezone($tz);

        // Se já está dentro da janela, retorna agora
        if ($this->isWithinSendWindow($candidate)) {
            return $candidate;
        }

        // Caso contrário, próxima ocorrência do start
        [$h, $m, $s] = array_pad(explode(':', $this->send_window_start), 3, '0');
        $next = $candidate->copy()->setTime((int) $h, (int) $m, (int) $s);
        if ($next->lte($candidate)) {
            $next->addDay();
        }

        return $next;
    }

    // ─── Relationships ───────────────────────────────────────

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(WhatsAppTemplate::class, 'whatsapp_template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(BroadcastMessage::class);
    }

    // ─── Scopes ──────────────────────────────────────────────

    public function scopeSending($query)
    {
        return $query->where('status', BroadcastStatusEnum::SENDING);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', BroadcastStatusEnum::COMPLETED);
    }

    public function scopeByStatus($query, BroadcastStatusEnum $status)
    {
        return $query->where('status', $status);
    }
}
