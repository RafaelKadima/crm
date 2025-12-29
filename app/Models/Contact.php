<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
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
        'phone',
        'email',
        'profile_picture_url',
        'cpf',
        'address',
        'source',
        'extra_data',
        'owner_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'extra_data' => 'array',
        ];
    }

    /**
     * Vendedor responsável pelo contato (carteira).
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Leads deste contato.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Tickets deste contato.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Tarefas relacionadas a este contato.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Lead ativo do contato.
     */
    public function activeLead()
    {
        return $this->leads()->where('status', 'open')->latest()->first();
    }

    /**
     * Ticket aberto do contato.
     */
    public function openTicket()
    {
        return $this->tickets()->whereNotIn('status', ['closed'])->latest()->first();
    }

    /**
     * Retorna o endereço formatado.
     */
    public function getFullAddressAttribute(): ?string
    {
        if (!$this->address) {
            return null;
        }

        $parts = array_filter([
            $this->address['street'] ?? null,
            $this->address['number'] ?? null,
            $this->address['complement'] ?? null,
            $this->address['neighborhood'] ?? null,
            $this->address['city'] ?? null,
            $this->address['state'] ?? null,
            $this->address['zip'] ?? null,
        ]);

        return implode(', ', $parts);
    }
}


