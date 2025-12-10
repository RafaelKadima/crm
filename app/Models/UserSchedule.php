<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserSchedule extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'day_of_week',
        'start_time',
        'end_time',
        'break_start',
        'break_end',
        'slot_duration',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'slot_duration' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Dias da semana
     */
    public const DAYS = [
        0 => 'Domingo',
        1 => 'Segunda-feira',
        2 => 'Terça-feira',
        3 => 'Quarta-feira',
        4 => 'Quinta-feira',
        5 => 'Sexta-feira',
        6 => 'Sábado',
    ];

    /**
     * Usuário
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Nome do dia
     */
    public function getDayNameAttribute(): string
    {
        return self::DAYS[$this->day_of_week] ?? 'Desconhecido';
    }

    /**
     * Verifica se tem intervalo
     */
    public function getHasBreakAttribute(): bool
    {
        return $this->break_start !== null && $this->break_end !== null;
    }

    /**
     * Gera slots disponíveis para um dia específico
     */
    public function getAvailableSlots(\DateTime $date, array $bookedSlots = []): array
    {
        $slots = [];
        
        $start = new \DateTime($date->format('Y-m-d') . ' ' . $this->start_time);
        $end = new \DateTime($date->format('Y-m-d') . ' ' . $this->end_time);
        
        $breakStart = $this->break_start 
            ? new \DateTime($date->format('Y-m-d') . ' ' . $this->break_start) 
            : null;
        $breakEnd = $this->break_end 
            ? new \DateTime($date->format('Y-m-d') . ' ' . $this->break_end) 
            : null;

        $current = clone $start;
        
        while ($current < $end) {
            $slotEnd = clone $current;
            $slotEnd->modify("+{$this->slot_duration} minutes");
            
            // Pula horário de almoço
            if ($breakStart && $breakEnd) {
                if ($current >= $breakStart && $current < $breakEnd) {
                    $current = clone $breakEnd;
                    continue;
                }
            }
            
            // Verifica se slot já está ocupado
            $slotTime = $current->format('H:i');
            $isBooked = in_array($slotTime, $bookedSlots);
            
            if (!$isBooked && $slotEnd <= $end) {
                $slots[] = [
                    'time' => $slotTime,
                    'datetime' => $current->format('Y-m-d H:i:s'),
                    'available' => true,
                ];
            }
            
            $current->modify("+{$this->slot_duration} minutes");
        }
        
        return $slots;
    }
}

