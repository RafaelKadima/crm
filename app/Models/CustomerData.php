<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerData extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'customer_data';

    protected $fillable = [
        'lead_id',
        'cpf',
        'cnpj',
        'rg',
        'birth_date',
        'address',
        'address_number',
        'address_complement',
        'neighborhood',
        'city',
        'state',
        'zip_code',
        'payment_method',
        'installments',
        'notes',
        'extra_data',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'installments' => 'integer',
            'extra_data' => 'array',
        ];
    }

    /**
     * Lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * CPF formatado
     */
    public function getFormattedCpfAttribute(): ?string
    {
        if (!$this->cpf) return null;
        $cpf = preg_replace('/\D/', '', $this->cpf);
        return substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
    }

    /**
     * CNPJ formatado
     */
    public function getFormattedCnpjAttribute(): ?string
    {
        if (!$this->cnpj) return null;
        $cnpj = preg_replace('/\D/', '', $this->cnpj);
        return substr($cnpj, 0, 2) . '.' . substr($cnpj, 2, 3) . '.' . substr($cnpj, 5, 3) . '/' . substr($cnpj, 8, 4) . '-' . substr($cnpj, 12, 2);
    }

    /**
     * CEP formatado
     */
    public function getFormattedZipCodeAttribute(): ?string
    {
        if (!$this->zip_code) return null;
        $cep = preg_replace('/\D/', '', $this->zip_code);
        return substr($cep, 0, 5) . '-' . substr($cep, 5, 3);
    }

    /**
     * Endereço completo
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->address_number,
            $this->address_complement,
            $this->neighborhood,
            $this->city,
            $this->state,
            $this->formatted_zip_code,
        ]);
        return implode(', ', $parts);
    }
}

