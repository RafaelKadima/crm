<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'closed_by',
        'closed_at',
        'subtotal_products',
        'additional_value',
        'additional_description',
        'discount_value',
        'discount_percentage',
        'total_value',
        'payment_method',
        'installments',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
        'subtotal_products' => 'decimal:2',
        'additional_value' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'total_value' => 'decimal:2',
        'installments' => 'integer',
        'metadata' => 'array',
    ];

    // =====================
    // RELATIONSHIPS
    // =====================

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    // =====================
    // SCOPES
    // =====================

    public function scopeByUser($query, string $userId)
    {
        return $query->where('closed_by', $userId);
    }

    public function scopeInPeriod($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('closed_at', [$startDate, $endDate]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('closed_at', now()->month)
            ->whereYear('closed_at', now()->year);
    }

    public function scopeThisYear($query)
    {
        return $query->whereYear('closed_at', now()->year);
    }

    // =====================
    // METHODS
    // =====================

    /**
     * Calcula o total da venda a partir dos itens e valores adicionais.
     */
    public function calculateTotal(): float
    {
        $subtotal = $this->items->sum('total');
        $this->subtotal_products = $subtotal;

        $total = $subtotal + ($this->additional_value ?? 0);

        // Aplica desconto
        if ($this->discount_percentage) {
            $this->discount_value = $total * ($this->discount_percentage / 100);
        }

        $total -= ($this->discount_value ?? 0);

        $this->total_value = max(0, $total);

        return $this->total_value;
    }

    /**
     * Atualiza o total e salva.
     */
    public function recalculateAndSave(): self
    {
        $this->calculateTotal();
        $this->save();

        // Atualiza o valor do lead
        $this->lead->update(['value' => $this->total_value]);

        return $this;
    }

    /**
     * Retorna estatísticas da venda.
     */
    public function getStats(): array
    {
        return [
            'items_count' => $this->items->count(),
            'products_count' => $this->items->whereNotNull('product_id')->count(),
            'subtotal_products' => $this->subtotal_products,
            'additional_value' => $this->additional_value,
            'discount_value' => $this->discount_value,
            'total_value' => $this->total_value,
            'average_item_value' => $this->items->count() > 0
                ? $this->subtotal_products / $this->items->count()
                : 0,
        ];
    }

    /**
     * Cria uma venda a partir de um valor simples (sem itens).
     */
    public static function createFromValue(Lead $lead, float $value, ?string $notes = null): self
    {
        return static::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'closed_by' => auth()->id(),
            'closed_at' => now(),
            'subtotal_products' => 0,
            'additional_value' => $value,
            'additional_description' => 'Valor total da venda',
            'total_value' => $value,
            'notes' => $notes,
        ]);
    }
}
